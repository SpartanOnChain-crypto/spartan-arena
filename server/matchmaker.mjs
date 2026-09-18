import http from "http";

const PORT = process.env.PORT || 8787;
const queues = new Map();
const tickets = new Map();

function key(game, wager) {
  return `${game}:${wager}`;
}

function send(res, code, obj) {
  res.writeHead(code, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      try { resolve(b ? JSON.parse(b) : {}); }
      catch (e) { reject(e); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  try {
    if (req.method === "POST" && req.url === "/join") {
      const { game, wager, wallet } = await readBody(req);
      if (!game || !wager || !wallet) return send(res, 400, { error: "game, wager, wallet required" });
      const ticket = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const k = key(game, wager);
      const list = queues.get(k) || [];
      const player = { ticket, wallet, game, wager, status: "waiting", matchId: null, opponent: null };
      tickets.set(ticket, player);
      const waiting = list.find((p) => p.status === "waiting" && p.wallet !== wallet);
      if (waiting) {
        const matchId = `m-${Date.now()}`;
        waiting.status = "matched";
        waiting.matchId = matchId;
        waiting.opponent = wallet;
        player.status = "matched";
        player.matchId = matchId;
        player.opponent = waiting.wallet;
      } else {
        list.push(player);
        queues.set(k, list);
      }
      return send(res, 200, { ticket, status: player.status, matchId: player.matchId });
    }
    if (req.method === "GET" && req.url.startsWith("/status/")) {
      const ticket = req.url.split("/status/")[1];
      const player = tickets.get(ticket);
      if (!player) return send(res, 404, { error: "ticket not found" });
      return send(res, 200, {
        status: player.status,
        matchId: player.matchId,
        opponent: player.opponent,
      });
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, () => console.log("matchmaker on " + PORT));
