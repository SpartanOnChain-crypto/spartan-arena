const http = require("http");
const waiting = new Map();
const tickets = new Map();
const scores = new Map();
const here = new Map();
const feed = [];
const tables = new Map();
const ideas = [];
const board = new Map();
const locks = new Map();
const history = [];
const ticketsByWallet = new Map();
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
    const { game, wager, wallet, room } = await read(req);
    const k = room ? ("room:" + String(room).toUpperCase() + ":" + (game || "tap") + ":" + String(wager || "100")) : key(game || "tap", wager || "100");
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
    waiting.set(k, { wallet, ticket, k });
    ticketsByWallet.set(wallet, { ticket, k });
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


  if (req.method === "POST" && url.pathname === "/here") {
    const { game, wallet } = await read(req);
    if (wallet) here.set(String(wallet), { game: game || "tap", t: Date.now() });
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.method === "GET" && url.pathname === "/here") {
    const now = Date.now();
    const counts = { tap: 0, chariot: 0, phalanx: 0, bones: 0 };
    for (const [w, row] of here) {
      if (now - row.t > 45000) { here.delete(w); continue; }
      const g = row.game || "tap";
      if (counts[g] != null) counts[g]++;
    }
    return res.end(JSON.stringify(counts));
  }
  if (req.method === "POST" && url.pathname === "/feed") {
    const row = await read(req);
    feed.unshift({ id: Date.now(), ...row });
    if (feed.length > 20) feed.pop();
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.method === "GET" && url.pathname === "/feed") {
    return res.end(JSON.stringify(feed));
  }


  if (req.method === "POST" && url.pathname === "/state") {
    const { matchId, patch } = await read(req);
    if (!matchId) return res.end(JSON.stringify({}));
    const cur = tables.get(matchId) || {};
    const next = Object.assign({}, cur, patch || {}, { t: Date.now() });
    tables.set(matchId, next);
    return res.end(JSON.stringify(next));
  }
  if (req.method === "GET" && url.pathname.startsWith("/state/")) {
    const id = url.pathname.split("/state/")[1];
    return res.end(JSON.stringify(tables.get(id) || {}));
  }

  if (req.method === "POST" && url.pathname === "/ideas") {
    const body = await read(req);
    const idea = { id: Date.now(), wallet: String(body.wallet || "unknown"), text: String(body.text || "").slice(0, 4000), t: Date.now() };
    if (idea.text.trim()) ideas.unshift(idea);
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.method === "GET" && url.pathname === "/ideas") {
    return res.end(JSON.stringify(ideas.slice(0, 100)));
  }
  if (req.method === "POST" && url.pathname === "/board") {
    const body = await read(req);
    const w = String(body.wallet || "");
    if (!w) return res.end(JSON.stringify({ ok: false }));
    const row = board.get(w) || { wallet: w, wins: 0, losses: 0, won: 0, played: 0 };
    row.played += 1;
    if (body.type === "win") { row.wins += 1; row.won += Number(body.amount || 0); }
    else row.losses += 1;
    board.set(w, row);
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.method === "GET" && url.pathname === "/board") {
    const rows = [...board.values()].sort((a, b) => (b.won - a.won) || (b.wins - a.wins));
    return res.end(JSON.stringify(rows.slice(0, 25)));
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
      const jackpotAta = ata(TREASURY);
      const winnerAta = ata(winner);
      const escrowAta = ata(escrowAuthority);
      const SYSTEM = new PublicKey("11111111111111111111111111111111");
      const makeAta = (dest, owner) => new TransactionInstruction({
        programId: ATA_PROGRAM,
        keys: [
          { pubkey: kp.publicKey, isSigner: true, isWritable: true },
          { pubkey: dest, isSigner: false, isWritable: true },
          { pubkey: owner, isSigner: false, isWritable: false },
          { pubkey: MINT, isSigner: false, isWritable: false },
          { pubkey: SYSTEM, isSigner: false, isWritable: false },
          { pubkey: tokenProgram, isSigner: false, isWritable: false },
        ],
        data: Buffer.alloc(0),
      });
      const tx = new Transaction();
      if (!(await connection.getAccountInfo(jackpotAta))) tx.add(makeAta(jackpotAta, TREASURY));
      if (!(await connection.getAccountInfo(winnerAta))) tx.add(makeAta(winnerAta, winner));
      tx.add(ix);
      tx.feePayer = kp.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(kp);
      const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
      return res.end(JSON.stringify({ ok: true, sig }));
    } catch (e) {
      return res.end(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) }));
    }
  }

  if (req.method === "POST" && url.pathname === "/lock") {
    const { matchId, wallet, sig, amount } = await read(req);
    if (!matchId || !wallet) return res.end(JSON.stringify({ ok: false }));
    const row = locks.get(matchId) || {};
    row[wallet] = { sig: sig || "", amount: Number(amount) || 0 };
    locks.set(matchId, row);
    return res.end(JSON.stringify({ ok: true, count: Object.keys(row).length }));
  }
  if (req.method === "GET" && url.pathname.startsWith("/locks/")) {
    const id = url.pathname.split("/locks/")[1];
    const row = locks.get(id) || {};
    return res.end(JSON.stringify({ ready: Object.keys(row).length >= 2, locks: row }));
  }
  if (req.method === "POST" && url.pathname === "/leave") {
    const { wallet, ticket } = await read(req);
    if (ticket) tickets.set(ticket, { status: "left" });
    for (const [k, v] of [...waiting.entries()]) {
      if (v.wallet === wallet || v.ticket === ticket) waiting.delete(k);
    }
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.method === "POST" && url.pathname === "/history") {
    const b = await read(req);
    if (b && b.game && b.winner && b.loser) {
      history.unshift({ id: Date.now(), game: b.game, stake: b.stake, a: b.a, b: b.b, winner: b.winner, loser: b.loser, paid: !!b.paid, sig: b.sig || '', t: Date.now() });
      if (history.length > 40) history.pop();
    }
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.method === "GET" && url.pathname === "/history") {
    return res.end(JSON.stringify(history.slice(0, 20)));
  }
  res.end(JSON.stringify({ ok: true, service: "spartan-match" }));
});
server.listen(process.env.PORT || 8787);
