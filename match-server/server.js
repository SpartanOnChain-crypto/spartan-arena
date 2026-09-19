const http = require("http");
const waiting = new Map();
const tickets = new Map();
const key = (g, w) => String(g) + ":" + String(w);

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  const url = new URL(req.url, "http://local");
  if (req.method === "POST" && url.pathname === "/join") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const { game, wager, wallet } = JSON.parse(body || "{}");
      const k = key(game || "tap", wager || "100");
      const ticket = "t" + Date.now() + Math.random().toString(36).slice(2, 8);
      const other = waiting.get(k);
      if (other && other.wallet !== wallet) {
        waiting.delete(k);
        const matchId = "m" + Date.now();
        tickets.set(ticket, { status: "matched", practice: false, opponent: other.wallet, matchId });
        tickets.set(other.ticket, { status: "matched", practice: false, opponent: wallet, matchId });
        return res.end(JSON.stringify({ ticket, status: "matched", practice: false, opponent: other.wallet, matchId }));
      }
      waiting.set(k, { wallet, ticket });
      tickets.set(ticket, { status: "waiting" });
      res.end(JSON.stringify({ ticket, status: "waiting" }));
    });
    return;
  }
  if (req.method === "GET" && url.pathname.startsWith("/status/")) {
    const ticket = url.pathname.split("/status/")[1];
    return res.end(JSON.stringify(tickets.get(ticket) || { status: "missing" }));
  }
  res.end(JSON.stringify({ ok: true, service: "spartan-match" }));
});
server.listen(process.env.PORT || 8787);
