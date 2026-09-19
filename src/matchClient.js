const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function myWallet() {
  return (
    window.__spartanWallet?.publicKey?.toBase58?.() ||
    window.__spartanWallet?.publicKey?.toString?.() ||
    window.solana?.publicKey?.toBase58?.() ||
    window.solana?.publicKey?.toString?.() ||
    ""
  );
}

function topic(game, wager) {
  return ("spartan-arena-" + String(game) + "-" + String(wager)).replace(/[^a-z0-9-]/gi, "").toLowerCase();
}

async function readBoard(t) {
  const res = await fetch("https://ntfy.sh/" + t + "/json?poll=1&since=all");
  const text = (await res.text()).trim();
  if (!text) return [];
  return text.split("\n").map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

export async function queueForMatch({ game, wager }) {
  const wallet = myWallet();
  if (!wallet) throw new Error("Connect a wallet first");
  const t = topic(game, wager);
  const now = Date.now();
  const rows = await readBoard(t);
  const other = rows.reverse().find((r) => {
    if (r.event !== "message") return false;
    let msg = r.message;
    try { msg = JSON.parse(r.message); } catch { return false; }
    if (!msg?.wallet || msg.wallet === wallet) return false;
    const age = now - Number(msg.t || (r.time * 1000));
    return age >= 0 && age < 60000;
  });
  if (other) {
    let msg = {};
    try { msg = JSON.parse(other.message); } catch {}
    await fetch("https://ntfy.sh/" + t, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, t: Date.now(), paired: msg.wallet }),
    });
    return { status: "matched", practice: false, opponent: msg.wallet, matchId: [wallet, msg.wallet].sort().join("_") };
  }
  await fetch("https://ntfy.sh/" + t, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, t: Date.now() }),
  });
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    const later = await readBoard(t);
    const hit = later.reverse().find((r) => {
      if (r.event !== "message") return false;
      let msg = r.message;
      try { msg = JSON.parse(r.message); } catch { return false; }
      return msg?.wallet && msg.wallet !== wallet && (msg.paired === wallet || !msg.paired);
    });
    if (hit) {
      let msg = {};
      try { msg = JSON.parse(hit.message); } catch {}
      return { status: "matched", practice: false, opponent: msg.wallet, matchId: [wallet, msg.wallet].sort().join("_") };
    }
  }
  return { status: "matched", practice: true, opponent: "Practice Bot", matchId: "practice" };
}
