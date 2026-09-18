const MATCH_URL = import.meta.env.VITE_MATCH_URL || "http://127.0.0.1:8787";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function queueForMatch({ game, wager }) {
  const wallet = window?.solana?.publicKey?.toBase58?.();
  if (!wallet) throw new Error("Connect Phantom first");
  try {
    const join = await fetch(`${MATCH_URL}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ game, wager: String(wager), wallet }),
    });
    if (!join.ok) throw new Error("no server");
    const { ticket } = await join.json();
    for (let i = 0; i < 8; i++) {
      const s = await fetch(`${MATCH_URL}/status/${ticket}`).then((r) => r.json());
      if (s.status === "matched") return { ...s, practice: false };
      await sleep(1000);
    }
  } catch (e) {
    console.warn("match server", e);
  }
  return { status: "matched", practice: true, opponent: "Practice Bot", matchId: "practice" };
}
