import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import crypto from "crypto";

const PROGRAM_ID = new PublicKey("Dw8c9YJLzv8m3EiKcwdCg2DiQPPeJAB3bwTfqRRe3riN");
const MINT = new PublicKey("8omgduFEjztUuJy1gpo2rzpX95FA9n6y96NAEVdRT6oi");
const TREASURY = new PublicKey("8sYXvt5WSk1SVJ8UmWPLSTAYapZ1BBf2VbQECSPF2H34");
const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const TOKEN_LEGACY = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

function disc(name) {
  return crypto.createHash("sha256").update("global:" + name).digest().subarray(0, 8);
}
function loadKey(raw) {
  const s = String(raw || "").trim();
  if (!s.startsWith("[")) throw new Error("OPERATOR_SECRET must be a json array");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(s)));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "POST" }); return; }
  if (!process.env.OPERATOR_SECRET) { res.status(501).json({ error: "OPERATOR_SECRET missing" }); return; }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const winnerStr = body.winner;
    const amountUi = Number(body.amountUi);
    if (!winnerStr || !(amountUi > 0)) { res.status(400).json({ error: "winner and amountUi required" }); return; }
    const kp = loadKey(process.env.OPERATOR_SECRET);
    const connection = new Connection("https://solana-rpc.publicnode.com", "confirmed");
    const mintInfo = await connection.getAccountInfo(MINT);
    const tokenProgram = mintInfo && mintInfo.owner.equals(TOKEN_2022) ? TOKEN_2022 : TOKEN_LEGACY;
    const winner = new PublicKey(winnerStr);
    const [escrowAuthority] = PublicKey.findProgramAddressSync([Buffer.from("escrow")], PROGRAM_ID);
    const escrowToken = await getAssociatedTokenAddress(MINT, escrowAuthority, true, tokenProgram);
    const winnerAta = await getAssociatedTokenAddress(MINT, winner, false, tokenProgram);
    const jackpotAta = await getAssociatedTokenAddress(MINT, TREASURY, false, tokenProgram);
    const raw = BigInt(Math.round(amountUi * 1e9));
    const data = Buffer.alloc(16);
    disc("settle_match").copy(data, 0);
    data.writeBigUInt64LE(raw, 8);
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: kp.publicKey, isSigner: true, isWritable: true },
        { pubkey: escrowAuthority, isSigner: false, isWritable: false },
        { pubkey: escrowToken, isSigner: false, isWritable: true },
        { pubkey: winnerAta, isSigner: false, isWritable: true },
        { pubkey: jackpotAta, isSigner: false, isWritable: true },
        { pubkey: MINT, isSigner: false, isWritable: true },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
      ],
      data,
    });
    const tx = new Transaction().add(ix);
    tx.feePayer = kp.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(kp);
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await connection.confirmTransaction(sig, "confirmed");
    res.status(200).json({ ok: true, sig });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
