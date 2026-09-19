const g = globalThis;
if (!g.__arenaQ) g.__arenaQ = { waiting: new Map(), tickets: new Map() };
const Q = g.__arenaQ;

function keyOf(game, wager) {
  return String(game) + ":" + String(wager);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const game = body.game || "tap";
      const wager = String(body.wager || "100");
      const wallet = String(body.wallet || "");
      if (!wallet) return res.status(400).json({ error: "no wallet" });
      const k = keyOf(game, wager);
      const other = Q.waiting.get(k);
      const ticket = "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      if (other && other.wallet !== wallet) {
        Q.waiting.delete(k);
        const matchId = "m_" + Date.now();
        const a = { status: "matched", practice: false, matchId, opponent: other.wallet, wallet };
        const b = { status: "matched", practice: false, matchId, opponent: wallet, wallet: other.wallet };
        Q.tickets.set(ticket, a);
        Q.tickets.set(other.ticket, b);
        return res.status(200).json({ ticket, ...a });
      }
      Q.waiting.set(k, { wallet, ticket, at: Date.now() });
      Q.tickets.set(ticket, { status: "waiting", practice: false, wallet, game, wager });
      return res.status(200).json({ ticket, status: "waiting" });
    }

    const ticket = String(req.query.ticket || "");
    const row = Q.tickets.get(ticket);
    if (!row) return res.status(200).json({ status: "missing" });
    return res.status(200).json(row);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
