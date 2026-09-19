const http = require("http");
const waiting = new Map();
const tickets = new Map();
const scores = new Map();
const key = (g, w) => String(g) + ":" + String(w);
function read(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); } catch { resolve({}); }
    });
  });
}
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  const url = new URL(req.url, "http://local");
  if (req.method === "POST" && url.pathname === "/join") {
    const { game, wager, wallet } = await read(req);
    const k = key(game || "tap", wager || "100");
    const ticket = "t" + Date.now() + Math.random().toString(36).slice(2, 8);
    const other = waiting.get(k);
    if (other && other.wallet !== wallet) {
      waiting.delete(k);
      const matchId = "m" + Date.now();
      tickets.set(ticket, { status: "matched", practice: false, opponent: other.wallet, matchId, wallet });
      tickets.set(other.ticket, { status: "matched", practice: false, opponent: wallet, matchId, wallet: other.wallet });
      scores.set(matchId, {});
      return res.end(JSON.stringify({ ticket, status: "matched", practice: false, opponent: other.wallet, matchId }));
    }
    waiting.set(k, { wallet, ticket });
    tickets.set(ticket, { status: "waiting" });
    return res.end(JSON.stringify({ ticket, status: "waiting" }));
  }
  if (req.method === "GET" && url.pathname.startsWith("/status/")) {
    const ticket = url.pathname.split("/status/")[1];
    return res.end(JSON.stringify(tickets.get(ticket) || { status: "missing" }));
  }
  if (req.method === "POST" && url.pathname === "/score") {
    const { matchId, wallet, taps } = await read(req);
    if (!matchId || !wallet) return res.end(JSON.stringify({ ok: false }));
    const row = scores.get(matchId) || {};
    row[wallet] = Number(taps) || 0;
    scores.set(matchId, row);
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.method === "GET" && url.pathname.startsWith("/score/")) {
    const matchId = url.pathname.split("/score/")[1];
    return res.end(JSON.stringify(scores.get(matchId) || {}));
  }

  if (req.method === "POST" && url.pathname === "/payout") {
    try {
      const body = await read(req);
      const secret = process.env.OPERATOR_SECRET;
      if (!secret) return res.end(JSON.stringify({ ok: false, error: "OPERATOR_SECRET missing on Railway" }));
      const web3 = await import("@solana/web3.js");
      const { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } = web3;
      const crypto = await import("crypto");
      const PROGRAM_ID = new PublicKey("Dw8c9YJLzv8m3EiKcwdCg2DiQPPeJAB3bwTfqRRe3riN");
      const MINT = new PublicKey("8omgduFEjztUuJy1gpo2rzpX95FA9n6y96NAEVdRT6oi");
      const TREASURY = new PublicKey("8sYXvt5WSk1SVJ8UmWPLSTAYapZ1BBf2VbQECSPF2H34");
      const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
      const TOKEN_LEGACY = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
      const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
      const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(String(secret).trim())));
      const connection = new Connection("https://solana-rpc.publicnode.com", "confirmed");
      const mintInfo = await connection.getAccountInfo(MINT);
      const tokenProgram = mintInfo && mintInfo.owner.equals(TOKEN_2022) ? TOKEN_2022 : TOKEN_LEGACY;
      const winner = new PublicKey(body.winner);
      const [escrowAuthority] = PublicKey.findProgramAddressSync([Buffer.from("escrow")], PROGRAM_ID);
      const ata = (owner) => PublicKey.findProgramAddressSync(
        [owner.toBuffer(), tokenProgram.toBuffer(), MINT.toBuffer()], ATA_PROGRAM
      )[0];
      const raw = BigInt(Math.round(Number(body.amountUi) * 1e9));
      const data = Buffer.alloc(16);
      crypto.createHash("sha256").update("global:settle_match").digest().subarray(0, 8).copy(data, 0);
      data.writeBigUInt64LE(raw, 8);
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: kp.publicKey, isSigner: true, isWritable: true },
          { pubkey: escrowAuthority, isSigner: false, isWritable: false },
          { pubkey: ata(escrowAuthority), isSigner: false, isWritable: true },
          { pubkey: ata(winner), isSigner: false, isWritable: true },
          { pubkey: ata(TREASURY), isSigner: false, isWritable: true },
          { pubkey: MINT, isSigner: false, isWritable: true },
          { pubkey: tokenProgram, isSigner: false, isWritable: false },
        ],
        data,
      });
      const tx = new Transaction().add(ix);
      tx.feePayer = kp.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(kp);
      const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
      return res.end(JSON.stringify({ ok: true, sig }));
    } catch (e) {
      return res.end(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) }));
    }
  }

  res.end(JSON.stringify({ ok: true, service: "spartan-match" }));
});
server.listen(process.env.PORT || 8787);
