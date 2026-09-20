import React, { useEffect, useRef, useState } from "react";
import { Crown, Trophy, Skull } from "lucide-react";
import { MatchmakingLobby, myPk, payIfWin, patchState, readState, startTapOnChain } from "./App.jsx";

function ResultCard({ won, wager, onBack, mine, opp }) {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      {won ? <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" /> : <Skull className="w-16 h-16 text-red-500 mx-auto mb-4" />}
      <div className="font-spartan text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-red-500 to-yellow-400 drop-shadow-[0_0_18px_rgba(249,115,22,0.8)]">{won ? "VICTORY" : "SLAIN"}</div>
      <p className="text-neutral-300 mt-3">Final board {mine} – {opp}</p>
      <p className="text-neutral-300">{won ? "Refresh Ready Wallet for updated balance." : "Stake stays with the winner."}</p>
      <p className="text-orange-300 font-black mt-1">{wager} $SPARTAN</p>
      <button onClick={onBack} className="mt-6 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-black uppercase tracking-widest">Back to Arena</button>
    </div>
  );
}

function hashStr(s) {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function rng(seed) {
  let s = seed || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function shuffle(arr, r) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const BANK = [
  ["What city trained the Spartans?", ["Athens", "Sparta", "Rome"], 1],
  ["How many men stood with Leonidas at Thermopylae in the legend?", ["300", "3,000", "30"], 0],
  ["A hoplite’s round shield is a…", ["Xiphos", "Aspis", "Kopis"], 1],
  ["Which sea sits east of Greece?", ["Baltic", "Aegean", "Caspian"], 1],
  ["Solana transactions settle on which chain?", ["Ethereum", "Solana", "Bitcoin"], 1],
  ["$SPARTAN lives on which network?", ["Solana", "Base", "Tron"], 0],
  ["A Solana wallet address is closest to…", ["A phone number", "A public key", "A password"], 1],
  ["What does a gas fee pay?", ["The casino dealer", "Network validators", "The token mint"], 1],
  ["Phantom is a…", ["DEX", "Wallet", "L2"], 1],
  ["Raydium is mainly a…", ["Wallet", "Exchange / AMM", "Explorer"], 1],
  ["A mint address points to…", ["A token type", "A person’s name", "A domain"], 0],
  ["Burning a token means…", ["Hiding it", "Destroying supply", "Staking it"], 1],
  ["Which is a Laconian warrior culture?", ["Sparta", "Troy", "Carthage"], 0],
  ["The pass of Thermopylae is in…", ["Italy", "Greece", "Egypt"], 1],
  ["A phalanx is a…", ["Ship", "Shield wall", "Coin"], 1],
  ["Which is NOT a Solana explorer?", ["Solscan", "Etherscan", "SolanaFM"], 1],
  ["1 SOL equals how many lamports?", ["1,000", "1,000,000,000", "100"], 1],
  ["A seed phrase should be…", ["Tweeted", "Kept private", "Shared with mods"], 1],
  ["Devnet is for…", ["Real money", "Testing", "Taxes"], 1],
  ["Mainnet is for…", ["Fake tokens only", "Live value", "School demos"], 1],
  ["An NFT on Solana is usually a…", ["Token with supply 1", "PDF", "Tweet"], 0],
  ["Which god was linked to Spartan war?", ["Ares", "Hades", "Hermes"], 0],
  ["The Peloponnese is a…", ["River", "Peninsula", "Temple"], 1],
  ["Which city rivaled Sparta?", ["Athens", "Oslo", "Venice"], 0],
  ["A smart contract on Solana is a…", ["Program", "Spreadsheet", "VPN"], 0],
  ["Escrow in this arena holds…", ["Emails", "Staked $SPARTAN", "NFTs only"], 1],
  ["95 / 3 / 2 means winner / treasury / …", ["Burn", "Dev tip", "Gas"], 0],
  ["Which button starts a PvP lock?", ["Find Match", "Armory", "Jackpot"], 0],
  ["Leonidas was a king of…", ["Sparta", "Persia", "Macedonia"], 0],
  ["Xerxes led which empire?", ["Persian", "Roman", "Ottoman"], 0],
  ["A spear in Greek war is often a…", ["Dory", "Lyre", "Trireme"], 0],
  ["Helots in Sparta were…", ["Kings", "Bound laborers", "Ships"], 1],
  ["Which planet is Solana named after?", ["None — it’s a word for sun", "Mars", "Jupiter"], 0],
  ["A blockhash is used to…", ["Color the UI", "Expire an old tx", "Name a token"], 1],
  ["Which is a hardware wallet brand?", ["Ledger", "Raydium", "Jito"], 0],
  ["Slippage is about…", ["Price moving during a swap", "Losing a password", "Airdrops"], 0],
  ["A rug pull is…", ["A dance", "Devs draining liquidity", "A tax form"], 1],
  ["Which number is even?", ["13", "27", "42"], 2],
  ["How many sides does a hexagon have?", ["5", "6", "8"], 1],
  ["A decade has how many years?", ["5", "10", "20"], 1],
  ["Olympia hosted the ancient…", ["Senate", "Olympic games", "Oracle of Delphi"], 1],
  ["Delphi was famous for its…", ["Oracle", "Navy", "Mint"], 0],
  ["Which metal is classically a Spartan blade?", ["Bronze / iron", "Plastic", "Silver leaf only"], 0],
  ["A validator on Solana…", ["Draws NFTs", "Produces blocks", "Hosts Discord"], 1],
  ["Which is the native Solana token?", ["ETH", "SOL", "BTC"], 1],
  ["Airdrop means…", ["Free tokens sent to wallets", "A plane crash", "Burning LP"], 0],
  ["Which month has 28 days in a common year?", ["February", "June", "August"], 0],
  ["How many degrees in a right angle?", ["45", "90", "180"], 1],
  ["Sparta’s dual kings came in…", ["Pairs", "Trios", "Tens"], 0],
  ["A trireme is a…", ["Warship", "Helmet", "Coin press"], 0],
];

function makeQuestion(matchKey, round) {
  const r = rng(hashStr(String(matchKey) + "#" + String(round)));
  const mode = Math.floor(r() * 5);
  if (mode <= 2) {
    const item = BANK[Math.floor(r() * BANK.length)];
    const pairs = item[1].map((text, i) => ({ text, ok: i === item[2] }));
    const mixed = shuffle(pairs, r);
    return { q: item[0], answers: mixed.map((p) => p.text), correct: mixed.findIndex((p) => p.ok) };
  }
  const a = 8 + Math.floor(r() * 40);
  const b = 4 + Math.floor(r() * 24);
  const ops = [["+", a + b], ["−", a - b], ["×", a * b]];
  const op = ops[Math.floor(r() * 3)];
  const right = op[1];
  const wrong = shuffle([right + 3 + Math.floor(r() * 6), right - (2 + Math.floor(r() * 5)), right + 11], r).filter((n) => n !== right).slice(0, 2);
  const opts = shuffle([right, wrong[0], wrong[1]], r);
  return { q: "What is " + a + " " + op[0] + " " + b + "?", answers: opts.map(String), correct: opts.indexOf(right) };
}

export function SpartanFeud({ onBack }) {
  const [view, setView] = useState("lobby");
  const [wager, setWager] = useState("100");
  const [round, setRound] = useState(1);
  const [q, setQ] = useState(null);
  const [mine, setMine] = useState(0);
  const [opp, setOpp] = useState(0);
  const [picked, setPicked] = useState(-1);
  const [lock, setLock] = useState(false);
  const [note, setNote] = useState("");
  const [over, setOver] = useState("");
  const [secs, setSecs] = useState(12);
  const started = useRef(0);
  const key = useRef("feud");
  const closed = useRef({});

  const loadQ = (r) => setQ(makeQuestion(key.current, r));

  const begin = (w, room) => startTapOnChain(w, async () => {
    window.__feudPaid = false;
    const t = Date.now();
    started.current = t;
    key.current = String(window.__spartanMatchId || myPk()) + ":" + t;
    setWager(w); setRound(1); setMine(0); setOpp(0); setPicked(-1); setLock(false); setOver(""); setSecs(12); setNote("Fastest correct answer takes the round.");
    loadQ(1);
    await patchState({ t, over: "", r: 1, a: 0, b: 0, key: key.current, buzz: null });
    setView("play");
  }, "feud", room);

  useEffect(() => {
    if (view !== "play" || over) return;
    const id = setInterval(() => setSecs((s) => s <= 0 ? 0 : s - 1), 1000);
    return () => clearInterval(id);
  }, [view, round, over]);

  useEffect(() => {
    if (view !== "play" || over || secs > 0 || lock) return;
    setLock(true);
    setNote("Time. No point this round.");
    setTimeout(() => nextRound(mine, opp), 900);
  }, [secs]);

  const finish = (winner, a, b) => {
    setOver(winner);
    if (winner === myPk() && !window.__feudPaid) { window.__feudPaid = true; payIfWin(wager); }
    patchState({ t: started.current, over: winner, a, b });
    setTimeout(() => setView("result"), 700);
  };

  const nextRound = (a, b) => {
    if (round >= 5) {
      const winner = a > b ? myPk() : b > a ? "opp" : myPk();
      if (a === b) setNote("Tie goes to the first warrior.");
      finish(a >= b ? myPk() : "opp", a, b);
      return;
    }
    const nr = round + 1;
    setRound(nr); setPicked(-1); setLock(false); setSecs(12); setNote("Round " + nr + ".");
    loadQ(nr);
  };

  useEffect(() => {
    if (view !== "play") return;
    const t = setInterval(async () => {
      const s = await readState();
      if (!s || (s.t && s.t < started.current)) return;
      if (s.key && s.key !== key.current && s.t >= started.current) {
        key.current = s.key;
        loadQ(round);
      }
      if (s.buzz && s.buzz.r === round && !closed.current[round]) {
        closed.current[round] = true;
        const mineWin = s.buzz.ok && s.buzz.pk === myPk();
        const oppWin = s.buzz.ok && s.buzz.pk !== myPk();
        let a = mine, b = opp;
        if (mineWin) { a += 1; setMine(a); setNote("You took the board."); }
        else if (oppWin) { b += 1; setOpp(b); setNote("Foe took the board."); }
        else if (s.buzz.pk === myPk()) setNote("Wrong. Board stays open.");
        if (s.buzz.ok) {
          setLock(true);
          setTimeout(() => nextRound(a, b), 1000);
        } else if (s.buzz.pk !== myPk()) {
          /* they missed, you can still answer */
        }
      }
      if (s.over && s.t >= started.current && !over) {
        setOver(s.over);
        if (s.over === myPk() && !window.__feudPaid) { window.__feudPaid = true; payIfWin(wager); }
        setTimeout(() => setView("result"), 600);
      }
    }, 280);
    return () => clearInterval(t);
  }, [view, round, mine, opp, over, wager]);

  const pick = async (i) => {
    if (lock || picked >= 0 || !q || over) return;
    setPicked(i);
    const ok = i === q.correct;
    if (!ok) {
      setNote("Wrong answer. Foe can still steal.");
      await patchState({ t: started.current, buzz: { pk: myPk(), r: round, ok: 0, i } });
      return;
    }
    setLock(true);
    setNote("Correct.");
    await patchState({ t: started.current, buzz: { pk: myPk(), r: round, ok: 1, i } });
  };

  if (view === "result") return <ResultCard won={over === myPk()} wager={wager} onBack={() => setView("lobby")} mine={mine} opp={opp} />;
  if (view !== "play") {
    return (
      <MatchmakingLobby title="Spartan Feud" subtitle="Five questions. Fastest correct answer owns the round." icon={Crown} iconColor="from-yellow-600 to-red-800" onBack={onBack} onStart={begin}>
        <div className="grid md:grid-cols-3 gap-3 text-sm text-neutral-300">
          <div className="bg-black/30 rounded-xl p-4 border border-white/10"><p className="text-yellow-300 font-black uppercase text-xs mb-2">The Board</p>A question hits both warriors at once. Three answers. Only one is true.</div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/10"><p className="text-yellow-300 font-black uppercase text-xs mb-2">The Buzz</p>Tap the right line first and you take the round. Miss and the other Spartan can steal.</div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/10"><p className="text-yellow-300 font-black uppercase text-xs mb-2">The Pot</p>Five rounds. Most points wins. Same lock and 95 / 3 / 2 as Tap. New match, new questions.</div>
        </div>
      </MatchmakingLobby>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between font-black text-white mb-3 text-sm uppercase tracking-widest">
        <span>You {mine}</span>
        <span className="text-yellow-300">Round {round} / 5 · {secs}s</span>
        <span>Foe {opp}</span>
      </div>
      <div className="rounded-3xl border border-yellow-800/40 bg-gradient-to-b from-[#2a1408] to-black p-6 md:p-10">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500 mb-3">Survey says</p>
        <h2 className="text-center font-spartan text-2xl md:text-4xl font-black text-white leading-tight">{q ? q.q : "…"}</h2>
        <div className="mt-8 grid gap-3">
          {(q ? q.answers : ["…","…","…"]).map((ans, i) => {
            const minePick = picked === i;
            const showCorrect = lock && q && i === q.correct;
            return (
              <button key={i} disabled={lock || picked === i} onClick={() => pick(i)}
                className={"text-left px-5 py-4 rounded-2xl border font-black uppercase tracking-wide transition " +
                  (showCorrect ? "bg-green-700/70 border-green-300 text-white" : minePick && q && i !== q.correct ? "bg-red-800/60 border-red-400 text-white" : "bg-black/40 border-yellow-700/40 text-yellow-50 hover:bg-yellow-900/30")}>
                <span className="text-yellow-500 mr-3">{i + 1}</span>{ans}
              </button>
            );
          })}
        </div>
        <p className="text-center text-amber-200 font-bold mt-5">{note}</p>
      </div>
    </div>
  );
}
