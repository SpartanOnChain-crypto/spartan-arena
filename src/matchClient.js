const MATCH_URL = (import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "");
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
export async function queueForMatch({ game, wager, room }) {
  const wallet = myWallet();
  if (!wallet) throw new Error("Connect a wallet first");
  const join = await fetch(MATCH_URL + "/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ game, wager: String(wager), wallet, room: room || "" }),
  });
  if (!join.ok) throw new Error("Match server failed");
  const first = await join.json();
  if (first.status === "matched") return first;
  const ticket = first.ticket;
  for (;;) {
    const s = await fetch(MATCH_URL + "/status/" + ticket).then((r) => r.json());
    if (s.status === "matched" && !s.practice) return s;
    await sleep(1000);
  }
}

export async function leaveQueue({ ticket, wallet }) {
  try {
    await fetch(MATCH_URL + "/leave", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticket, wallet }) });
  } catch (e) {}
}
export async function waitBothLocked(matchId) {
  for (;;) {
    const s = await fetch(MATCH_URL + "/locks/" + matchId).then((r) => r.json()).catch(() => ({}));
    if (s && s.ready) return s;
    await sleep(800);
  }
}
export async function reportLock({ matchId, wallet, sig, amount }) {
  return fetch(MATCH_URL + "/lock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ matchId, wallet, sig, amount }) }).then((r) => r.json()).catch(() => ({}));
}
