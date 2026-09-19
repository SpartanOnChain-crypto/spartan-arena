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
export async function queueForMatch({ game, wager }) {
  const wallet = myWallet();
  if (!wallet) throw new Error("Connect a wallet first");
  const join = await fetch(MATCH_URL + "/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ game, wager: String(wager), wallet }),
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
