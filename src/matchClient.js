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
async function board(game, wager) {
  const text = await fetch("/api/match?game=" + encodeURIComponent(game) + "&wager=" + encodeURIComponent(wager)).then((r) => r.text());
  return text.trim().split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
export async function queueForMatch({ game, wager }) {
  const wallet = myWallet();
  if (!wallet) throw new Error("Connect a wallet first");
  const now = Date.now();
  const rows = await board(game, wager);
  const other = [...rows].reverse().find((r) => {
    if (r.event !== "message") return false;
    let msg = r.message; try { msg = JSON.parse(r.message); } catch { return false; }
    if (!msg?.wallet || msg.wallet === wallet) return false;
    const age = now - Number(msg.t || r.time * 1000);
    return age >= 0 && age < 90000;
  });
  if (other) {
    let msg = {}; try { msg = JSON.parse(other.message); } catch {}
    await fetch("/api/match?game=" + encodeURIComponent(game) + "&wager=" + encodeURIComponent(wager), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet, paired: msg.wallet, game, wager }),
    });
    return { status: "matched", practice: false, opponent: msg.wallet };
  }
  await fetch("/api/match?game=" + encodeURIComponent(game) + "&wager=" + encodeURIComponent(wager), {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet, game, wager }),
  });
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    const later = await board(game, wager);
    const hit = [...later].reverse().find((r) => {
      if (r.event !== "message") return false;
      let msg = r.message; try { msg = JSON.parse(r.message); } catch { return false; }
      return msg?.wallet && msg.wallet !== wallet;
    });
    if (hit) {
      let msg = {}; try { msg = JSON.parse(hit.message); } catch {}
      return { status: "matched", practice: false, opponent: msg.wallet };
    }
  }
  return { status: "matched", practice: true, opponent: "Practice Bot" };
}
