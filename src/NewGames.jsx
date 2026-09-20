import React, { useEffect, useRef, useState } from "react";
import { Footprints, Target, Trophy, Skull } from "lucide-react";
import { MatchmakingLobby, myPk, parseWager, payIfWin, patchState, readState, startTapOnChain } from "./App.jsx";

function ResultCard({ won, wager, onBack }) {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      {won ? <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" /> : <Skull className="w-16 h-16 text-red-500 mx-auto mb-4" />}
      <div className="font-spartan text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-red-500 to-yellow-400 drop-shadow-[0_0_18px_rgba(249,115,22,0.8)]">
        {won ? "VICTORY" : "SLAIN"}
      </div>
      <p className="text-neutral-300 mt-3">{won ? "Refresh Ready Wallet for updated balance." : "Stake stays with the winner."}</p>
      <p className="text-orange-300 font-black mt-1">{wager} $SPARTAN</p>
      <button onClick={onBack} className="mt-6 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-black uppercase tracking-widest">Back to Arena</button>
    </div>
  );
}

function StickSpartan({ flip, dead }) {
  return (
    <svg viewBox="0 0 80 140" className={"w-20 h-36 " + (flip ? "scale-x-[-1]" : "")} style={{ filter: dead ? "grayscale(1) opacity(0.45)" : "none" }}>
      <ellipse cx="40" cy="128" rx="18" ry="5" fill="rgba(0,0,0,0.35)" />
      <line x1="40" y1="38" x2="40" y2="88" stroke="#e8c37a" strokeWidth="5" strokeLinecap="round" />
      <line x1="40" y1="50" x2="18" y2="78" stroke="#e8c37a" strokeWidth="4" strokeLinecap="round" />
      <line x1="40" y1="50" x2="62" y2="72" stroke="#e8c37a" strokeWidth="4" strokeLinecap="round" />
      <line x1="40" y1="88" x2="24" y2="122" stroke="#e8c37a" strokeWidth="4" strokeLinecap="round" />
      <line x1="40" y1="88" x2="56" y2="122" stroke="#e8c37a" strokeWidth="4" strokeLinecap="round" />
      <path d="M22 28 L40 8 L58 28 Z" fill="#7a1a12" stroke="#f59e0b" strokeWidth="2" />
      <circle cx="40" cy="32" r="11" fill="#e8c37a" />
      <path d="M28 34 Q40 44 52 34" fill="#7a1a12" />
      <rect x="58" y="48" width="6" height="28" rx="2" fill="#92400e" />
      <circle cx="61" cy="46" r="5" fill="#b45309" />
    </svg>
  );
}

export function PlankCrossing({ onBack }) {
  const [view, setView] = useState("lobby");
  const [wager, setWager] = useState("100");
  const [row, setRow] = useState(0);
  const [fallen, setFallen] = useState(false);
  const [walking, setWalking] = useState(null);
  const [note, setNote] = useState("Your step. Pick a plank.");
  const [map, setMap] = useState([]);
  const [over, setOver] = useState("");
  const [shake, setShake] = useState(false);
  const [myLives, setMyLives] = useState(2);
  const [oppLives, setOppLives] = useState(2);

  const mapFor = (id) => {
    let n = 1;
    String(id || "x").split("").forEach((c) => n = (n * 33 + c.charCodeAt(0)) >>> 0);
    return [0,1,2,3,4,5].map((i) => ((n >> (i * 3)) & 1) === 0 ? "L" : "R");
  };

  useEffect(() => {
    if (view !== "play") return;
    const t = setInterval(async () => {
      const s = await readState();
      if (s.over && !over) {
        setOver(s.over);
        setTimeout(() => {
          if (s.over === myPk() && !window.__plankPaid) { window.__plankPaid = true; payIfWin(wager); }
          setView("result");
        }, 900);
      }
    }, 700);
    return () => clearInterval(t);
  }, [view, over, wager]);

  const step = async (side) => {
    if (walking || fallen || over) return;
    const safe = map[row] === side;
    setWalking(side);
    setNote(safe ? "Solid wood. Keep moving." : "The plank snaps.");
    await new Promise((r) => setTimeout(r, 520));
    if (!safe) {
      setFallen(true);
      setShake(true);
      setWalking(null);
      const left = myLives - 1;
      setMyLives(left);
      if (left <= 0) {
        await patchState({ over: "opp", myLives: 0, oppLives, fall: row });
        setTimeout(() => setView("result"), 1100);
        return;
      }
      await patchState({ myLives: left, oppLives, fall: row });
      setNote("Plank snapped. " + left + " life left. Walk again.");
      setTimeout(() => {
        setFallen(false); setShake(false); setRow(0);
        setMap(mapFor((window.__spartanMatchId || myPk()) + ":" + Date.now()));
      }, 900);
      return;
    }
    const next = row + 1;
    setWalking(null);
    if (next >= 6) {
      setRow(0);
      setMap(mapFor((window.__spartanMatchId || myPk()) + ":" + Date.now()));
      setNote("You cleared the span. New boards. First to fall twice still loses.");
      await patchState({ row: 0, last: side, myLives, oppLives });
      return;
    }
    setRow(next);
    setNote("Your step. Pick a plank.");
    await patchState({ row: next, last: side, myLives, oppLives });
  };

  if (view === "result") return <ResultCard won={over === myPk() && !fallen} wager={wager} onBack={() => { setView("lobby"); setRow(0); setFallen(false); setOver(""); }} />;

  if (view !== "play") {
    return (
      <MatchmakingLobby title="Plank Crossing" subtitle="Six rows. One path is wood. One path is air." icon={Footprints} iconColor="from-amber-700 to-yellow-900" onBack={onBack} onStart={(w, room) => startTapOnChain(w, () => { window.__plankPaid = false; setWager(w); setMap(mapFor(window.__spartanMatchId || myPk())); setRow(0); setFallen(false); setOver(""); setView("play"); }, "plank", room)}>
        <div className="grid md:grid-cols-3 gap-3 text-sm text-neutral-300">
          <div className="bg-black/30 rounded-xl p-4 border border-white/10"><p className="text-amber-300 font-black uppercase text-xs mb-2">The Bridge</p>You stand at the mouth of a six-row wood bridge. Each row has a left plank and a right plank. Only one holds.</div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/10"><p className="text-amber-300 font-black uppercase text-xs mb-2">The Walk</p>Tap LEFT or RIGHT. Your Spartan steps onto that plank. Safe wood carries you forward. Fake wood shatters and you fall.</div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/10"><p className="text-amber-300 font-black uppercase text-xs mb-2">The Prize</p>First to the far gate wins the pot. Same lock, same 95 / 3 / 2 as every other original.</div>
        </div>
      </MatchmakingLobby>
    );
  }

  const rows = [0,1,2,3,4,5];
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between text-xs font-black uppercase tracking-widest text-amber-200 mb-2">
        <span>Row {Math.min(row + 1, 6)} / 6</span>
        <span>Lives {myLives} / 2 · Foe {oppLives} / 2</span>
        <span>{fallen ? "Falling" : "Walk"}</span>
      </div>
      <div className={"relative h-[460px] rounded-3xl overflow-hidden border border-amber-900/40 " + (shake ? "animate-pulse" : "")} style={{ background: "linear-gradient(#1a0b04,#050200)", perspective: "900px" }}>
        <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(90deg, transparent 0 18px, rgba(245,158,11,0.05) 18px 19px)" }} />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-[86%] h-[86%]" style={{ transformStyle: "preserve-3d", transform: "rotateX(62deg)" }}>
          <div className="absolute left-1/2 -translate-x-1/2 top-[-6%] w-28 h-10 rounded-t-2xl bg-gradient-to-b from-yellow-700 to-amber-950 border border-yellow-600/40" />
          {rows.map((i) => {
            const z = (5 - i) * 58;
            const scale = 1 - i * 0.08;
            const here = i === row;
            return (
              <div key={i} className="absolute left-1/2 flex gap-3" style={{ transform: `translateX(-50%) translateY(${z}px) scale(${scale})`, width: 280 - i * 16 }}>
                {["L","R"].map((side) => {
                  const picked = walking === side && here;
                  const broken = fallen && here && walking !== side && map[row] !== side;
                  return (
                    <button key={side} disabled={!here || !!walking || fallen} onClick={() => step(side)}
                      className={"flex-1 h-16 rounded-md border transition-all " + (picked ? "bg-amber-400/80 border-yellow-200 translate-y-1" : here ? "bg-amber-200/20 border-amber-300/50 hover:bg-amber-300/30" : "bg-black/40 border-white/10")}
                      style={{ boxShadow: here ? "0 12px 24px rgba(0,0,0,0.45)" : "none", opacity: i < row ? 0.35 : 1 }}>
                      {broken ? <span className="text-[10px] text-red-300 font-black">SNAP</span> : <span className="text-[10px] text-amber-100 font-black">{side === "L" ? "LEFT" : "RIGHT"}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className={"absolute left-1/2 -translate-x-1/2 transition-all duration-500 " + (fallen ? "top-[78%] rotate-45 opacity-40" : "bottom-8") }>
          <StickSpartan />
        </div>
      </div>
      <p className="text-center text-amber-200 font-bold mt-3">{note}</p>
    </div>
  );
}

export function SpearDuel({ onBack }) {
  const [view, setView] = useState("lobby");
  const [wager, setWager] = useState("100");
  const [mine, setMine] = useState(0);
  const [opp, setOpp] = useState(0);
  const [turn, setTurn] = useState("");
  const [note, setNote] = useState("");
  const [over, setOver] = useState("");
  const [drag, setDrag] = useState(null);
  const [spear, setSpear] = useState(null);
  const [blood, setBlood] = useState([]);
  const box = useRef(null);
  const fly = useRef(null);

  const mineTurn = () => turn === myPk();

  useEffect(() => {
    if (view !== "play") return;
    const t = setInterval(async () => {
      const s = await readState();
      if (s.turn) setTurn(s.turn);
      if (typeof s.a === "number") setMine(s.a);
      if (typeof s.b === "number") setOpp(s.b);
      if (s.shot && s.shot.id !== spear?.id && s.turn !== myPk()) {
        setSpear({ id: s.shot.id, x: 780, y: 210, vx: -s.shot.power * 7.2, vy: -s.shot.aim * 0.55, from: "opp" });
      }
      if (s.over && !over) {
        setOver(s.over);
        setTimeout(() => {
          if (s.over === myPk() && !window.__spearPaid) { window.__spearPaid = true; payIfWin(wager); }
          setView("result");
        }, 800);
      }
    }, 450);
    return () => clearInterval(t);
  }, [view, over, wager, spear]);

  useEffect(() => {
    if (!spear) return;
    cancelAnimationFrame(fly.current);
    const tick = () => {
      setSpear((sp) => {
        if (!sp) return null;
        const nx = sp.x + sp.vx;
        const ny = sp.y + sp.vy;
        const nvy = sp.vy + 0.42;
        const hitFoe = sp.from !== "opp" && nx > 730 && ny > 120 && ny < 300;
        const hitMe = sp.from === "opp" && nx < 90 && ny > 120 && ny < 300;
        const miss = nx > 900 || nx < -20 || ny > 390;
        if (hitFoe || hitMe) {
          setBlood((b) => [...b, { x: hitFoe ? 760 : 70, y: ny }]);
          const nextMine = mine + (hitFoe ? 1 : 0);
          const nextOpp = opp + (hitMe ? 1 : 0);
          if (hitFoe) setMine(nextMine); else setOpp(nextOpp);
          setNote(hitFoe ? "HIT." : "You were struck.");
          const winner = nextMine >= 3 ? myPk() : nextOpp >= 3 ? "opp" : "";
          if (winner) {
            setOver(winner);
            if (winner === myPk() && !window.__spearPaid) { window.__spearPaid = true; payIfWin(wager); }
            patchState({ a: nextMine, b: nextOpp, over: winner });
            setTimeout(() => setView("result"), 700);
          } else {
            const nxt = hitFoe ? "opp" : myPk();
            setTurn(nxt);
            patchState({ a: nextMine, b: nextOpp, turn: nxt });
          }
          return null;
        }
        if (miss) {
          setNote("Miss.");
          const nxt = sp.from === "opp" ? myPk() : "opp";
          setTurn(nxt);
          patchState({ turn: nxt, shot: { id: Date.now(), miss: true } });
          return null;
        }
        return { ...sp, x: nx, y: ny, vy: nvy };
      });
      fly.current = requestAnimationFrame(tick);
    };
    fly.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(fly.current);
  }, [!!spear]);

  const pos = (e) => {
    const r = box.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e) => {
    if (!mineTurn() || spear) return;
    setDrag({ ...pos(e), ox: 92, oy: 210 });
  };
  const onMove = (e) => { if (drag) setDrag({ ...drag, ...pos(e) }); };
  const onUp = async () => {
    if (!drag || !mineTurn()) { setDrag(null); return; }
    const dx = drag.ox - drag.x;
    const dy = drag.oy - drag.y;
    const power = Math.min(18, Math.max(6, Math.hypot(dx, dy) / 8));
    const aim = Math.max(-18, Math.min(18, dy / 6));
    const shot = { id: Date.now(), power, aim };
    setSpear({ id: shot.id, x: 110, y: 210, vx: power * 7.2, vy: -aim * 0.9, from: "me" });
    setDrag(null);
    setNote("Spear loosed.");
    await patchState({ shot, turn: "opp" });
    setTurn("opp");
  };

  if (view === "result") return <ResultCard won={over === myPk()} wager={wager} onBack={() => { setView("lobby"); setMine(0); setOpp(0); setOver(""); setBlood([]); }} />;

  if (view !== "play") {
    return (
      <MatchmakingLobby title="Spear Duel" subtitle="Draw the line. Loose the spear. First to 3 hits." icon={Target} iconColor="from-red-700 to-orange-900" onBack={onBack} onStart={(w, room) => startTapOnChain(w, async () => { window.__spearPaid = false; setWager(w); setMine(0); setOpp(0); setBlood([]); const first = myPk(); setTurn(first); await patchState({ turn: first, a: 0, b: 0 }); setView("play"); }, "spear", room)}>
        <div className="grid md:grid-cols-3 gap-3 text-sm text-neutral-300">
          <div className="bg-black/30 rounded-xl p-4 border border-white/10"><p className="text-orange-300 font-black uppercase text-xs mb-2">Draw</p>Click your Spartan and drag back. The line is power. The tilt is aim. Let go to throw.</div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/10"><p className="text-orange-300 font-black uppercase text-xs mb-2">Flight</p>The spear arcs with weight. Too low and it dies in the dirt. Too high and it sails over the helm.</div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/10"><p className="text-orange-300 font-black uppercase text-xs mb-2">Blood</p>A body hit scores. First Spartan to land 3 spears takes the pot. Same 95 / 3 / 2.</div>
        </div>
      </MatchmakingLobby>
    );
  }

  const ang = drag ? Math.atan2(drag.oy - drag.y, drag.x - drag.ox) : 0;
  const pow = drag ? Math.min(18, Math.hypot(drag.ox - drag.x, drag.oy - drag.y) / 8) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between font-black text-white mb-2">
        <span>You {mine}</span>
        <span className={mineTurn() && !spear ? "text-orange-400" : "text-neutral-500"}>{mineTurn() && !spear ? "Draw your spear" : "Watch the sky"}</span>
        <span>Foe {opp}</span>
      </div>
      <div ref={box} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        className="relative h-[420px] rounded-3xl overflow-hidden border border-red-900/40 cursor-crosshair select-none"
        style={{ background: "linear-gradient(#2a1208 0%, #120805 55%, #3a2a14 55%, #1a140c 100%)" }}>
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-orange-950/40 to-transparent" />
        <div className="absolute left-6 bottom-16"><StickSpartan /></div>
        <div className="absolute right-6 bottom-16"><StickSpartan flip dead={opp >= 3} /></div>
        {drag && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1="92" y1="210" x2={drag.x} y2={drag.y} stroke="#fbbf24" strokeWidth="2" strokeDasharray="6 6" />
          </svg>
        )}
        {spear && (
          <div className="absolute w-16 h-1.5 bg-gradient-to-r from-amber-200 to-orange-800 rounded-full origin-left"
            style={{ left: spear.x, top: spear.y, transform: `rotate(${Math.atan2(spear.vy, spear.vx)}rad)` }} />
        )}
        {blood.map((b, i) => <div key={i} className="absolute w-2 h-2 rounded-full bg-red-600" style={{ left: b.x, top: b.y }} />)}
        {drag && <div className="absolute left-28 top-8 text-amber-200 font-black text-sm">{pow.toFixed(0)} power · {(ang * 57.3).toFixed(0)}°</div>}
      </div>
      <p className="text-center text-amber-200 font-bold mt-3">{note}</p>
    </div>
  );
}
