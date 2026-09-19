function topic(game, wager) {
  return ("spartan-arena-" + String(game) + "-" + String(wager)).replace(/[^a-z0-9-]/gi, "").toLowerCase();
}
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const game = String(req.query.game || req.body?.game || "tap");
    const wager = String(req.query.wager || req.body?.wager || "100");
    const t = topic(game, wager);
    if (req.method === "GET") {
      const r = await fetch("https://ntfy.sh/" + t + "/json?poll=1&since=all");
      const text = await r.text();
      return res.status(200).send(text || "");
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    await fetch("https://ntfy.sh/" + t, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: body.wallet, t: Date.now(), paired: body.paired || null }),
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
