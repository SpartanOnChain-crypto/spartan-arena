const MATCH_URL = import.meta.env.VITE_MATCH_URL || "http://localhost:8787";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function queueForMatch({ game, wager }) {
  const wallet = window?.solana?.publicKey?.toBase58?.();
  if (!wallet) throw new Error("Connect Phantom first");
  const join = await fetch(`${MATCH_URL}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ game, wager: String(wager), wallet }),
  });
  if (!join.ok) throw new Error("Match server not running");
  const { ticket } = await join.json();
  for (let i = 0; i < 60; i++) {
    const s = await fetch(`${MATCH_URL}/status/${ticket}`).then((r) => r.json());
    if (s.status === "matched") return s;
    await sleep(1000);
  }
  throw new Error("No opponent found. Keep the match server running and have a second wallet queue at the same wager.");
}
