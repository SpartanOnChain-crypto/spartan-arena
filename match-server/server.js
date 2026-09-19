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
  res.end(JSON.stringify({ ok: true, service: "spartan-match" }));
});
server.listen(process.env.PORT || 8787);
