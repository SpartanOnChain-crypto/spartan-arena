export const config = { runtime: "nodejs", maxDuration: 30 };

async function rpc(method, params) {
  const r = await fetch("https://solana-rpc.publicnode.com", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
  return j.result;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "POST" }); return; }
  try {
    const {
      Keypair, PublicKey, Transaction, TransactionInstruction,
    } = await import("@solana/web3.js");
    const crypto = await import("crypto");
    const PROGRAM_ID = new PublicKey("Dw8c9YJLzv8m3EiKcwdCg2DiQPPeJAB3bwTfqRRe3riN");
    const MINT = new PublicKey("8omgduFEjztUuJy1gpo2rzpX95FA9n6y96NAEVdRT6oi");
    const TREASURY = new PublicKey("8sYXvt5WSk1SVJ8UmWPLSTAYapZ1BBf2VbQECSPF2H34");
    const TOKEN_LEGACY = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    const secret = process.env.OPERATOR_SECRET;
    if (!secret) { res.status(200).json({ ok: false, error: "OPERATOR_SECRET missing" }); return; }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (!body.winner || !(Number(body.amountUi) > 0)) {
      res.status(200).json({ ok: false, error: "winner and amountUi required" });
      return;
    }
    const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(String(secret).trim())));
    const tokenProgram = TOKEN_LEGACY;
    const winner = new PublicKey(body.winner);
    const [escrowAuthority] = PublicKey.findProgramAddressSync([Buffer.from("escrow")], PROGRAM_ID);
    const ata = (owner) => PublicKey.findProgramAddressSync(
      [owner.toBuffer(), tokenProgram.toBuffer(), MINT.toBuffer()],
      ATA_PROGRAM
    )[0];
    const escAta = ata(escrowAuthority);
    let raw = BigInt(Math.round(Number(body.amountUi) * 1e9));
    try {
      const bal = await rpc("getTokenAccountBalance", [escAta.toBase58()]);
      const have = BigInt(bal?.value?.amount || "0");
      if (have === 0n) { res.status(200).json({ ok: false, error: "escrow empty" }); return; }
      if (raw > have) raw = have;
    } catch (e) {}
    if (raw <= 0n) { res.status(200).json({ ok: false, error: "settle amount 0" }); return; }
    const data = Buffer.alloc(16);
    crypto.createHash("sha256").update("global:settle_match").digest().subarray(0, 8).copy(data, 0);
    data.writeBigUInt64LE(raw, 8);
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: kp.publicKey, isSigner: true, isWritable: true },
        { pubkey: escrowAuthority, isSigner: false, isWritable: false },
        { pubkey: escAta, isSigner: false, isWritable: true },
        { pubkey: ata(winner), isSigner: false, isWritable: true },
        { pubkey: ata(TREASURY), isSigner: false, isWritable: true },
        { pubkey: MINT, isSigner: false, isWritable: true },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
      ],
      data,
    });
    const latest = await rpc("getLatestBlockhash", [{ commitment: "confirmed" }]);
    const tx = new Transaction();
    tx.add(ix);
    tx.feePayer = kp.publicKey;
    tx.recentBlockhash = latest.blockhash || latest.value?.blockhash;
    tx.sign(kp);
    const rawTx = tx.serialize();
    const b64 = Buffer.from(rawTx).toString("base64");
    const sig = await rpc("sendTransaction", [b64, { encoding: "base64", skipPreflight: true }]);
    res.status(200).json({ ok: true, sig, amountUi: Number(raw) / 1e9 });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
}
