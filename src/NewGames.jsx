import React, { useEffect, useRef, useState } from "react";
import { Footprints, Target, Trophy, Skull } from "lucide-react";
import confetti from "canvas-confetti";
import { MatchmakingLobby, myPk, parseWager, payIfWin, patchState, readState, startTapOnChain } from "./App.jsx";

function ResultCard({ won, wager, onBack }) {
  return (
    <div className="w-full max-w-md mx-auto mt-10 bg-black/60 border border-white/10 rounded-[2rem] p-12 text-center">
      {won ? (
        <>
          <Trophy className="w-24 h-24 text-green-400 mx-auto mb-6" />
          <h2 className="font-spartan text-5xl font-black text-green-400 mb-2">VICTORY</h2>
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl py-6 mb-6">
            <span className="text-4xl font-black text-green-400">+{parseWager(wager) * 2} $SPARTAN</span>
          </div>
          {window.__spartanPayoutNote && (
            <div className="mb-6 font-spartan text-xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-red-500 to-yellow-300 animate-pulse">
              {window.__spartanPayoutNote}
            </div>
          )}
        </>
      ) : (
        <>
          <Skull className="w-24 h-24 text-red-600 mx-auto mb-6" />
          <h2 className="font-spartan text-5xl font-black text-red-600 mb-2">SLAIN</h2>
          <div className="bg-red-900/20 border border-red-500/30 rounded-2xl py-6 mb-6">
            <span className="text-4xl font-black text-red-500">-{wager} $SPARTAN</span>
          </div>
        </>
      )}
      <button onClick={onBack} className="w-full py-4.5 rounded-xl bg-white/10 text-white font-black text-sm uppercase">Return to Matchmaking</button>
    </div>
  );
}

function mapFor(pk) {
  const s = String(pk || "x");
  const out = [];
  for (let i = 0; i < 6; i++) out.push((s.charCodeAt(i % s.length) + i * 7) % 2);
  return out;
}

export function PlankCrossing({ addWager, addFeed, username, onBack }) {
  const [view, setView] = useState("lobby");
  const [wager, setWager] = useState("100");
  const [countdown, setCountdown] = useState(3);
  const [turn, setTurn] = useState("");
  const [row, setRow] = useState(0);
  const [anim, setAnim] = useState("");
  const [picked, setPicked] = useState(null);
  const [note, setNote] = useState("The ravine waits.");
  const [over, setOver] = useState(null);
  const me = () => myPk();
  const mine = () => turn && turn === me();

  useEffect(() => {
    if (view !== "countdown") return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    const a = me();
    const b = String(window.__spartanOpponent || "opp");
    const first = [a, b].sort()[0] || a;
    setTurn(first); setRow(0); setOver(null); setPicked(null);
    setNote(first === a ? "Your step. Choose a plank." : "Watch the other warrior.");
    setView("arena");
    patchState({ turn: first, row: 0, over: null, last: null });
  }, [view, countdown]);

  useEffect(() => {
    if (view !== "arena" || over) return;
    const id = setInterval(async () => {
      const st = await readState();
      if (!st) return;
      if (st.turn) setTurn(st.turn);
      if (typeof st.row === "number") setRow(st.row);
      if (st.last && st.last.who && st.last.who !== me() && st.last.t !== window.__plankSeen) {
        window.__plankSeen = st.last.t;
        setPicked(st.last.side);
        setAnim(st.last.ok ? "safe" : "fall");
        setNote(st.last.ok ? "They held the wood." : "The plank snapped.");
        setTimeout(() => { setAnim(""); setPicked(null); }, 1600);
      }
      if (st.over) { setOver(st.over); finish(st.over === me()); }
    }, 400);
    return () => clearInterval(id);
  }, [view, over]);

  const finish = (won) => {
    if (window.__plankPaid) return;
    window.__plankPaid = true;
    window.__spartanGame = "Plank Crossing";
    addWager(wager);
    if (won) {
      payIfWin(wager);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      addFeed(username || "Warrior", "Plank Crossing", wager, "2.0x", "+" + (parseWager(wager) * 2), "win");
    } else {
      if (typeof window.__spartanSetReady === "function") {
        window.__spartanSetReady((prev) => Math.max(0, Number(prev) - (parseWager(wager) || 0)));
      }
      addFeed(username || "Warrior", "Plank Crossing", wager, "0.0x", "-" + wager, "loss");
    }
    setView("result");
  };

  const stepOn = async (side) => {
    if (!mine() || anim || over) return;
    const safe = mapFor(me())[row] === side;
    setPicked(side);
    setAnim(safe ? "safe" : "fall");
    setNote(safe ? "The wood holds." : "The plank splits.");
    const a = me();
    const b = String(window.__spartanOpponent || "opp");
    if (!safe) {
      await patchState({ over: b, last: { who: a, side, ok: false, t: Date.now() } });
      setTimeout(() => finish(false), 1400);
      return;
    }
    const nextRow = row + 1;
    if (nextRow >= 6) {
      await patchState({ over: a, last: { who: a, side, ok: true, t: Date.now() } });
      setTimeout(() => finish(true), 1400);
      return;
    }
    await patchState({ turn: b, row: nextRow, last: { who: a, side, ok: true, t: Date.now() } });
    setTimeout(() => { setAnim(""); setPicked(null); setRow(nextRow); setTurn(b); setNote("Watch the other warrior."); }, 1400);
  };

  if (view === "lobby") {
    return (
      <MatchmakingLobby title="Plank Crossing" subtitle="Six rows. Two boards. One lies." icon={Footprints} iconColor="from-amber-700 to-yellow-900" onBack={onBack} onStart={(w, room) => startTapOnChain(w, () => { window.__plankPaid = false; setWager(w); setCountdown(3); setView("countdown"); }, "plank", room)}>
        <div className="mt-8 bg-black/40 border border-white/10 rounded-2xl p-6">
          <h3 className="font-spartan text-xl font-black text-white uppercase mb-4">How to Play Plank Crossing</h3>
          <p className="text-neutral-300 text-sm leading-relaxed mb-3">The canyon does not care who you are. Six rows of twin wooden boards stretch into the fog. One board on each row is sound. The other is rot painted to look proud.</p>
          <p className="text-neutral-300 text-sm leading-relaxed mb-3">Warriors take turns. On your turn you choose left or right. If the wood holds, you live and the other warrior walks. If it splits, you fall and the pot is theirs.</p>
          <p className="text-neutral-400 text-sm leading-relaxed">Cross all six without falling and you take the field. Each warrior has their own hidden path, so watching them does not teach you your boards. No popups. The ravine is the only judge.</p>
        </div>
      </MatchmakingLobby>
    );
  }
  if (view === "countdown") {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center">
        <h3 className="text-sm uppercase tracking-widest text-neutral-400 font-black mb-4">Opponent locked. The planks wait in</h3>
        {window.__spartanOpponent && <div className="mb-4 font-spartan text-2xl font-black text-orange-400">VS {String(window.__spartanOpponent).slice(0,4)}...{String(window.__spartanOpponent).slice(-4)}</div>}
        <div className="text-7xl font-black text-white">{countdown}</div>
      </div>
    );
  }
  if (view === "result") return <ResultCard won={over === me()} wager={wager} onBack={() => { setView("lobby"); setCountdown(3); }} />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between text-xs font-black uppercase tracking-widest text-neutral-400 mb-3">
        <span>Row {row + 1} / 6</span>
        <span className={mine() ? "text-amber-400" : "text-neutral-500"}>{mine() ? "Your step" : "Watching"}</span>
      </div>
      <div className="relative h-[420px] rounded-3xl overflow-hidden border border-amber-900/40 bg-gradient-to-b from-[#1a0c00] to-black">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_40px,rgba(120,53,15,0.12)_40px,rgba(120,53,15,0.12)_42px)]" />
        <div className="absolute left-1/2 top-6 bottom-6 w-1 bg-amber-900/50" />
        <div className="relative z-10 h-full flex items-end justify-center gap-16 pb-16">
          {[0, 1].map((side) => (
            <button key={side} disabled={!mine() || !!anim} onClick={() => stepOn(side)}
              className={"w-36 h-28 rounded-md border-2 transition-all duration-500 " +
                (picked === side && anim === "fall" ? "translate-y-40 rotate-12 opacity-0 border-red-600 bg-red-950" :
                 picked === side && anim === "safe" ? "scale-105 border-green-400 bg-amber-700 shadow-[0_0_30px_#22c55e66]" :
                 "border-amber-700 bg-gradient-to-b from-amber-800 to-amber-950 hover:border-amber-400")}>
              <div className="h-full flex items-center justify-center font-spartan font-black text-amber-200 uppercase">{side === 0 ? "Left" : "Right"}</div>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-4 text-center text-amber-200 font-bold">{note}</p>
    </div>
  );
}

export function SpearDuel({ addWager, addFeed, username, onBack }) {
  const [view, setView] = useState("lobby");
  const [wager, setWager] = useState("100");
  const [countdown, setCountdown] = useState(3);
  const [turn, setTurn] = useState("");
  const [mineScore, setMineScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [power, setPower] = useState(40);
  const [aim, setAim] = useState(0);
  const [fly, setFly] = useState(false);
  const [note, setNote] = useState("Draw the spear.");
  const [over, setOver] = useState(null);
  const dragging = useRef(false);
  const me = () => myPk();
  const mine = () => turn && turn === me();

  useEffect(() => {
    if (view !== "countdown") return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    const a = me();
    const b = String(window.__spartanOpponent || "opp");
    const first = [a, b].sort()[0] || a;
    setTurn(first); setMineScore(0); setOppScore(0); setOver(null);
    setNote(first === a ? "Draw. Aim. Loose." : "Watch their throw.");
    setView("arena");
    patchState({ turn: first, scores: {}, over: null, last: null });
  }, [view, countdown]);

  useEffect(() => {
    if (view !== "arena" || over) return;
    const id = setInterval(async () => {
      const st = await readState();
      if (!st) return;
      if (st.turn) setTurn(st.turn);
      if (st.scores) {
        setMineScore(Number(st.scores[me()] || 0));
        const other = Object.keys(st.scores).find((k) => k && k !== me());
        if (other) setOppScore(Number(st.scores[other] || 0));
      }
      if (st.last && st.last.who !== me() && st.last.t !== window.__spearSeen) {
        window.__spearSeen = st.last.t;
        setPower(st.last.power); setAim(st.last.aim); setFly(true);
        setNote(st.last.hit ? "They struck." : "They missed.");
        setTimeout(() => setFly(false), 1200);
      }
      if (st.over) { setOver(st.over); finish(st.over === me()); }
    }, 400);
    return () => clearInterval(id);
  }, [view, over]);

  const finish = (won) => {
    if (window.__spearPaid) return;
    window.__spearPaid = true;
    window.__spartanGame = "Spear Duel";
    addWager(wager);
    if (won) {
      payIfWin(wager);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      addFeed(username || "Warrior", "Spear Duel", wager, "2.0x", "+" + (parseWager(wager) * 2), "win");
    } else {
      if (typeof window.__spartanSetReady === "function") {
        window.__spartanSetReady((prev) => Math.max(0, Number(prev) - (parseWager(wager) || 0)));
      }
      addFeed(username || "Warrior", "Spear Duel", wager, "0.0x", "-" + wager, "loss");
    }
    setView("result");
  };

  const throwSpear = async () => {
    if (!mine() || fly || over) return;
    const hit = power >= 52 && power <= 88 && Math.abs(aim) <= 14;
    setFly(true);
    setNote(hit ? "Strike." : "Wide.");
    const a = me();
    const b = String(window.__spartanOpponent || "opp");
    const st = await readState();
    const scores = Object.assign({}, st.scores || {});
    scores[a] = Number(scores[a] || 0) + (hit ? 1 : 0);
    let nextOver = null;
    if (scores[a] >= 3) nextOver = a;
    await patchState({ turn: b, scores, over: nextOver, last: { who: a, power, aim, hit, t: Date.now() } });
    setMineScore(scores[a]);
    setTimeout(() => {
      setFly(false);
      if (nextOver) finish(true);
      else { setTurn(b); setNote("Watch their throw."); }
    }, 1200);
  };

  if (view === "lobby") {
    return (
      <MatchmakingLobby title="Spear Duel" subtitle="Draw. Aim. First to 3 hits." icon={Target} iconColor="from-red-700 to-orange-900" onBack={onBack} onStart={(w, room) => startTapOnChain(w, () => { window.__spearPaid = false; setWager(w); setCountdown(3); setView("countdown"); }, "spear", room)}>
        <div className="mt-8 bg-black/40 border border-white/10 rounded-2xl p-6">
          <h3 className="font-spartan text-xl font-black text-white uppercase mb-4">How to Play Spear Duel</h3>
          <p className="text-neutral-300 text-sm leading-relaxed mb-3">Two hoplites. One spear each throw. Drag the power bar back like a bowstring. Tilt aim up or down. Loose it and watch the shaft fly.</p>
          <p className="text-neutral-300 text-sm leading-relaxed mb-3">A hit needs a strong draw and a true line. Too soft and it drops. Too hard and it sails. First warrior to land three spears takes the pot.</p>
          <p className="text-neutral-400 text-sm leading-relaxed">Turns swap after every throw. You watch their flight on this same field. No extra windows. Just wood, iron, and nerve.</p>
        </div>
      </MatchmakingLobby>
    );
  }
  if (view === "countdown") {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center">
        <h3 className="text-sm uppercase tracking-widest text-neutral-400 font-black mb-4">Opponent locked. Spears ready in</h3>
        {window.__spartanOpponent && <div className="mb-4 font-spartan text-2xl font-black text-orange-400">VS {String(window.__spartanOpponent).slice(0,4)}...{String(window.__spartanOpponent).slice(-4)}</div>}
        <div className="text-7xl font-black text-white">{countdown}</div>
      </div>
    );
  }
  if (view === "result") return <ResultCard won={over === me()} wager={wager} onBack={() => { setView("lobby"); setCountdown(3); }} />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between font-black text-white mb-3">
        <span>You {mineScore}</span>
        <span className={mine() ? "text-orange-400" : "text-neutral-500"}>{mine() ? "Your throw" : "Watching"}</span>
        <span>Foe {oppScore}</span>
      </div>
      <div className="relative h-[360px] rounded-3xl border border-white/10 bg-[#0b0f0a] overflow-hidden">
        <div className="absolute left-10 bottom-16 w-8 h-24 bg-black rounded-full" />
        <div className="absolute right-10 bottom-16 w-8 h-24 bg-black rounded-full" />
        <div className={"absolute left-16 bottom-28 origin-left transition-all duration-1000 " + (fly ? "translate-x-[520px] -translate-y-8 rotate-12" : "translate-x-0")}
          style={{ transform: fly ? undefined : "rotate(" + (-aim) + "deg)" }}>
          <div className="w-40 h-1.5 bg-gradient-to-r from-amber-200 to-orange-700 rounded-full shadow-[0_0_12px_#f97316]" />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <label className="block text-xs uppercase tracking-widest text-neutral-400 font-black">Power {power}</label>
        <input type="range" min="10" max="100" value={power} disabled={!mine() || fly} onChange={(e) => setPower(Number(e.target.value))} className="w-full" />
        <label className="block text-xs uppercase tracking-widest text-neutral-400 font-black">Aim {aim}</label>
        <input type="range" min="-30" max="30" value={aim} disabled={!mine() || fly} onChange={(e) => setAim(Number(e.target.value))} className="w-full" />
        <button disabled={!mine() || fly} onClick={throwSpear} className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-700 text-white font-black uppercase disabled:opacity-40">Loose Spear</button>
        <p className="text-center text-amber-200 font-bold">{note}</p>
      </div>
    </div>
  );
}
