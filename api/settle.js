export const config = { runtime: "nodejs", maxDuration: 30 };

const RPC = "https://api.mainnet-beta.solana.com";
const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const MINT = "8omgduFEjztUuJy1gpo2rzpX95FA9n6y96NAEVdRT6oi";
const TREASURY_ATA = "HWgiy64v2KGoXqfK6Jmu5rwrsmcPuWUJftKz8p3hHkh8";
const ESCROW_AUTH = "FqLiuZsE4wGeeknfAz9YVdmjC6EdMZL1aYNwUF4qQGfp";
const ESCROW_ATA = "AX5CTvHHK7NATgmUb9LYn8eEr11QeQniHhvDMgkNkuhv";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const PROGRAM = "Dw8c9YJLzv8m3EiKcwdCg2DiQPPeJAB3bwTfqRRe3riN";

function b58decode(s) {
  let n = 0n;
  for (const c of s) {
    const i = ALPHA.indexOf(c);
    if (i < 0) throw new Error("bad base58");
    n = n * 58n + BigInt(i);
  }
  const out = [];
  while (n > 0n) { out.push(Number(n % 256n)); n = n / 256n; }
  out.reverse();
  for (const c of s) { if (c === "1") out.unshift(0); else break; }
  return Uint8Array.from(out);
}
function compact(n) {
  const out = [];
  let x = n;
  while (true) {
    let b = x & 0x7f;
    x >>= 7;
    if (x === 0) { out.push(b); break; }
    out.push(b | 0x80);
  }
  return Uint8Array.from(out);
}
async function rpc(method, params) {
  const r = await fetch(RPC, {
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
    const naclMod = await import("tweetnacl");
    const nacl = naclMod.default || naclMod;
    const crypto = await import("crypto");
    const secret = process.env.OPERATOR_SECRET;
    if (!secret) { res.status(200).json({ ok: false, error: "OPERATOR_SECRET missing" }); return; }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (!body.winner || !(Number(body.amountUi) > 0)) {
      res.status(200).json({ ok: false, error: "winner and amountUi required" });
      return;
    }
    const sk = Uint8Array.from(JSON.parse(String(secret).trim()));
    if (sk.length < 64) throw new Error("bad operator secret");
    const kp = nacl.sign.keyPair.fromSecretKey(sk.slice(0, 64));
    const winner = String(body.winner);
    const toks = await rpc("getTokenAccountsByOwner", [winner, { mint: MINT }, { encoding: "jsonParsed" }]);
    const winnerAta = toks?.value?.[0]?.pubkey;
    if (!winnerAta) { res.status(200).json({ ok: false, error: "winner has no $SPARTAN account" }); return; }
    let raw = BigInt(Math.round(Number(body.amountUi) * 1e9));
    const bal = await rpc("getTokenAccountBalance", [ESCROW_ATA]);
    const have = BigInt(bal?.value?.amount || "0");
    if (have === 0n) { res.status(200).json({ ok: false, error: "escrow empty" }); return; }
    if (raw > have) raw = have;
    const data = Buffer.alloc(16);
    crypto.createHash("sha256").update("global:settle_match").digest().subarray(0, 8).copy(data, 0);
    data.writeBigUInt64LE(raw, 8);
    const pub = Buffer.from(kp.publicKey).toString("hex");
    // base58 encode pubkey
    const ALPHA2 = ALPHA;
    function b58encode(bytes) {
      let n = 0n;
      for (const b of bytes) n = n * 256n + BigInt(b);
      let s = "";
      while (n > 0n) { s = ALPHA2[Number(n % 58n)] + s; n = n / 58n; }
      for (const b of bytes) { if (b === 0) s = "1" + s; else break; }
      return s || "1";
    }
    const keys = [
      b58encode(kp.publicKey),
      ESCROW_ATA,
      winnerAta,
      TREASURY_ATA,
      MINT,
      ESCROW_AUTH,
      TOKEN,
    ];
    const latest = await rpc("getLatestBlockhash", [{ commitment: "confirmed" }]);
    const blockhash = latest.blockhash || latest.value?.blockhash;
    const header = Uint8Array.from([1, 0, 2]);
    const msgParts = [
      header,
      compact(keys.length),
      ...keys.map((k) => b58decode(k)),
      b58decode(blockhash),
      compact(1),
      Uint8Array.from([6]),
      compact(7),
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6]),
      compact(data.length),
      data,
    ];
    const message = Buffer.concat(msgParts.map((x) => Buffer.from(x)));
    const sig = nacl.sign.detached(message, kp.secretKey);
    const wire = Buffer.concat([Buffer.from(compact(1)), Buffer.from(sig), message]);
    const sent = await rpc("sendTransaction", [wire.toString("base64"), { encoding: "base64", skipPreflight: true }]);
    res.status(200).json({ ok: true, sig: sent, amountUi: Number(raw) / 1e9 });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
}
