import WalletModal from './WalletModal.jsx';
import { listWallets, connectProvider } from './wallets.js';
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Shield, Trophy, Wallet, Skull, Bot, 
  Swords, Flame, Zap, Search, LayoutDashboard, 
  Dices, ScrollText, User, Lock, Coins, ChevronRight,
  TrendingUp, Activity, History, MessageCircle, 
  Twitter, BarChart3, Lightbulb, Users, Key, Target, Crosshair, Info, Loader2, Wine, Footprints } from 'lucide-react';
import confetti from 'canvas-confetti';
import { lockStakeOnChain, getWalletBalances, settleMatch as settleMatchOnChain } from './vaultClient.js';
import { PlankCrossing, SpearDuel } from './NewGames.jsx';
import { queueForMatch, leaveQueue, waitBothLocked, reportLock } from './matchClient.js';


export const parseWager = (amount) => {
  if (typeof amount !== 'string') return Number(amount);
  if (amount.includes('M')) return parseFloat(amount) * 1000000;
  if (amount.includes('K')) return parseFloat(amount) * 1000;
  return parseFloat(amount);
};

;


export const startTapOnChain = async (w, afterLock, game, room) => {
  try {
    const ready = window.__spartanWallet?.publicKey;
    if (!ready) {
      throw new Error("MUST_SIGN_IN");
    }
    const wagerNum = parseWager(w);
    const sig = await lockStakeOnChain(wagerNum);
    if (!sig) throw new Error("Lock did not finish. Approve the wallet popup.");
    if (myPk()) fetch(MATCH_HOST + "/here", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game: game || "tap", wallet: myPk() }) }).catch(() => {});
    const match = await queueForMatch({ game: game || "tap", wager: wagerNum, room: room || "" });
    window.__spartanPractice = !!match?.practice;
    window.__spartanOpponent = match?.opponent || "";
    window.__spartanMatchId = match?.matchId || "";
    afterLock();
  } catch (err) {
    alert(String(err?.message || err));
  }
};

const MATCH_HOST = (import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "");
export function myPk() {
  const pk = window.__spartanWallet?.publicKey || window.solana?.publicKey;
  return pk ? String(pk.toBase58 ? pk.toBase58() : pk) : "";
}
function isHumanMatch() {
  return !window.__spartanPractice && !!window.__spartanMatchId;
}
function postScore(val) {
  const matchId = window.__spartanMatchId;
  const wallet = myPk();
  if (!matchId || !wallet || window.__spartanPractice) return;
  fetch(MATCH_HOST + "/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId, wallet, taps: val }) }).catch(() => {});
}
async function getOppScore() {
  const matchId = window.__spartanMatchId;
  const me = myPk();
  if (!matchId) return null;
  try {
    const row = await fetch(MATCH_HOST + "/score/" + matchId).then((r) => r.json());
    for (const [w, v] of Object.entries(row || {})) {
      if (w && w !== me) return Number(v);
    }
  } catch (e) {}
  return null;
}
async function waitOppScore(okFn, tries) {
  tries = tries || 80;
  for (let i = 0; i < tries; i++) {
    const v = await getOppScore();
    if (okFn(v)) return v;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}
function warriorName() {
  const p = myPk();
  if (p && p.length > 8) return p.slice(0,4) + "..." + p.slice(-4);
  return "Warrior";
}
async export function patchState(patch) {
  const matchId = window.__spartanMatchId;
  if (!matchId) return {};
  try { return await fetch(MATCH_HOST + "/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId, patch }) }).then((r) => r.json()); } catch (e) { return {}; }
}
async export function readState() {
  const matchId = window.__spartanMatchId;
  if (!matchId) return {};
  try { return await fetch(MATCH_HOST + "/state/" + matchId).then((r) => r.json()); } catch (e) { return {}; }
}
function shortPk(pk) {
  const s = String(pk || "");
  if (s.length < 8) return s || "----";
  return s.slice(0, 4) + "..." + s.slice(-4);
}
function refreshReady() {
  const pk = window.__spartanWallet?.publicKey || window.solana?.publicKey;
  if (!pk || typeof getWalletBalances !== "function") return;
  getWalletBalances(pk).then((b) => {
    if (!b || typeof b.spartan !== "number") return;
    if (typeof window.__spartanSetReady === "function") window.__spartanSetReady(Number(b.spartan) || 0);
  }).catch(() => {});
}
function postHistory(row) {
  fetch(MATCH_HOST + "/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) }).catch(() => {});
}
export function payIfWin(wager) {
  const stake = parseWager(wager) || 0;
  const pot = stake * 2;
  const winPk = myPk();
  if (!(pot > 0) || !winPk) return;
  const winner = String(winPk.toBase58 ? winPk.toBase58() : winPk);
  const loser = String(window.__spartanOpponent || "");
  fetch(MATCH_HOST + "/payout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ winner, amountUi: pot }) })
    .then((r) => r.json())
    .then((j) => {
      const paid = !!(j && (j.ok || j.sig) && !j.error);
      window.__spartanPayoutNote = paid ? "Winnings paid. Check your READY wallet." : ("Payout failed: " + (j && j.error ? j.error : "no response"));
      if (typeof window.__spartanSetReady === "function") {
        window.__spartanSetReady((prev) => Number(prev) + stake);
      }
      refreshReady();
      postHistory({
        game: window.__spartanGame || "Match",
        stake,
        a: winner,
        b: loser,
        winner,
        loser,
        paid,
        sig: j && j.sig ? j.sig : "",
      });
    })
    .catch((e) => {
      window.__spartanPayoutNote = "Payout failed: " + String(e);
      postHistory({
        game: window.__spartanGame || "Match",
        stake,
        a: myPk(),
        b: String(window.__spartanOpponent || ""),
        winner: myPk(),
        loser: String(window.__spartanOpponent || ""),
        paid: false,
      });
    });
}
export default function App() {
  const [wallet, setWallet] = useState(null);
  const [showWallets, setShowWallets] = useState(false);
  const [walletList, setWalletList] = useState([]);
  const [username, setUsername] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [tempName, setTempName] = useState('');
  
  const [balanceLocked, setBalanceLocked] = useState(0);
  const [balanceReal, setBalanceReal] = useState(0);
  window.__spartanSetReady = (fn) => {
    setBalanceReal((prev) => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      setReadyFlash(next > prev ? "win" : next < prev ? "lose" : "");
      setTimeout(() => setReadyFlash(""), 1400);
      return next;
    });
  };



  const [wageredTotal, setWageredTotal] = useState(0);
  
  const [view, setView] = useState('home');
  const [category, setCategory] = useState('Lobby');

  // Live Crypto Prices State
  const [cryptoPrices, setCryptoPrices] = useState({
    SOL: { price: 0, change: 0 },
    BTC: { price: 0, change: 0 },
    ETH: { price: 0, change: 0 },
    SPARTAN: { price: 0.0000046, change: 12.4 }
  });

  // Live API Fetcher (CoinGecko for Majors + DexScreener for SPARTAN)
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // CoinGecko is 100% US-friendly and bypasses CORS blocks
        const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
        const cgData = await cgRes.json();

        // DexScreener for $SPARTAN
        const dsRes = await fetch('https://api.dexscreener.com/latest/dex/tokens/8omgduFEjztUuJy1gpo2rzpX95FA9n6y96NAEVdRT6oi');
        const dsData = await dsRes.json();
        const spartanPair = dsData?.pairs?.[0];

        if (cgData.bitcoin) {
          setCryptoPrices({
            BTC: { price: parseFloat(cgData.bitcoin.usd || 0), change: parseFloat(cgData.bitcoin.usd_24h_change || 0) },
            ETH: { price: parseFloat(cgData.ethereum.usd || 0), change: parseFloat(cgData.ethereum.usd_24h_change || 0) },
            SOL: { price: parseFloat(cgData.solana.usd || 0), change: parseFloat(cgData.solana.usd_24h_change || 0) },
            SPARTAN: { 
              price: spartanPair ? parseFloat(spartanPair.priceUsd) : 0.0000046, 
              change: spartanPair ? parseFloat(spartanPair.priceChange?.h24 || 0) : 12.4 
            }
          });
        }
      } catch (err) {
        console.error("Failed to fetch live prices", err);
      }
    };

    fetchPrices(); // Fetch real prices on load
    const realPriceInterval = setInterval(fetchPrices, 30000); // Fetch real prices every 30s to avoid rate limits

    // Visual flutter effect to look like live institutional websockets
    const flutterInterval = setInterval(() => {
      setCryptoPrices(prev => {
        if (prev.SOL.price === 0) return prev; // Wait for initial API load
        return {
          SOL: { ...prev.SOL, price: +(prev.SOL.price + (Math.random() * 0.4 - 0.2)).toFixed(2) },
          BTC: { ...prev.BTC, price: +(prev.BTC.price + (Math.random() * 20 - 10)).toFixed(2) },
          ETH: { ...prev.ETH, price: +(prev.ETH.price + (Math.random() * 2 - 1)).toFixed(2) },
          SPARTAN: { ...prev.SPARTAN, price: +(prev.SPARTAN.price + (Math.random() * 0.0000002 - 0.0000001)).toFixed(7) }
        };
      });
    }, 3500);

    return () => {
      clearInterval(realPriceInterval);
      clearInterval(flutterInterval);
    };
  }, []);
  
  const [deskSlide, setDeskSlide] = useState(0);
  const [look] = useState('anime');
  const [searchQ, setSearchQ] = useState('');
  const [liveHere, setLiveHere] = useState({ tap: 0, chariot: 0, phalanx: 0, bones: 0, plank: 0, spear: 0 });
  const [liveFeed, setLiveFeed] = useState([]);
  const [txHistory, setTxHistory] = useState([]);
  const [readyFlash, setReadyFlash] = useState('');
  useEffect(() => {
    if (!wallet) return;
    refreshReady();
    const id = setInterval(refreshReady, 5000);
    return () => clearInterval(id);
  }, [wallet, view]);
  const [liveBoard, setLiveBoard] = useState([]);
  const [ideaText, setIdeaText] = useState('');
  const [ideaNote, setIdeaNote] = useState('');
  const [armoryPin, setArmoryPin] = useState('');
  const [armoryOk, setArmoryOk] = useState(false);
  const [armoryIdeas, setArmoryIdeas] = useState([]);

  const connectWallet = async () => {
    setWalletList(listWallets());
    setShowWallets(true);
  };

  const pickWallet = async (w) => {
    if (!w.provider) { alert(w.note || (w.name + " is not installed")); return; }
    try {
      const pk = await connectProvider(w.provider);
      setWallet(pk.toString().slice(0,4) + "..." + pk.toString().slice(-4));
      setShowWallets(false);
      try {
        const b = await getWalletBalances(pk);
        setBalanceReal(Number(b.spartan) || 0);
      } catch (e) {}
      if (!username) setShowSignup(true);
    } catch (e) {
      alert(String(e.message || e));
    }
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (tempName.trim().length > 0) {
      setUsername(tempName.toUpperCase());
      setShowSignup(false);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 }, colors: ['#EA580C', '#F59E0B', '#B91C1C'] });
      addFeed(tempName.toUpperCase(), "Arena Entry", 0, "-", "+1000 Bonus", "win");
    }
  };

  
  useEffect(() => {
    const id = setInterval(() => setDeskSlide((s) => (s + 1) % 2), 5000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (view !== "armory" || !armoryOk) return;
    const host = (import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "");
    const load = async () => {
      const rows = await fetch(host + "/ideas").then((r) => r.json()).catch(() => []);
      if (Array.isArray(rows)) setArmoryIdeas(rows);
    };
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [view, armoryOk]);
  useEffect(() => {
    const tick = async () => {
      try {
        const h = await fetch((import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "") + "/here").then(r => r.json());
        if (h) setLiveHere({ tap: h.tap||0, chariot: h.chariot||0, phalanx: h.phalanx||0, bones: h.bones||0, plank: h.plank||0, spear: h.spear||0 });
      } catch (e) {}
      try {
        const f = await fetch((import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "") + "/feed").then(r => r.json());
        if (Array.isArray(f) && f.length) setLiveFeed(f.slice(0, 8));
      } catch (e) {}
      try {
        const host = (import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "");
        const b = await fetch(host + "/board").then(r => r.json());
        fetch(host + "/history").then(r => r.json()).then(h => { if (Array.isArray(h)) setTxHistory(h); }).catch(() => {});
        if (Array.isArray(b)) setLiveBoard(b);
      } catch (e) {}
      const pk = window.__spartanWallet?.publicKey || window.solana?.publicKey;
      if (pk) {
        fetch((import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "") + "/here", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game: view === "crash" ? "chariot" : view === "plinko" ? "phalanx" : view === "dice" ? "bones" : view === "plank" ? "plank" : view === "spear" ? "spear" : "tap", wallet: String(pk.toBase58 ? pk.toBase58() : pk) }) }).catch(() => {});
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, [view]);
  const addFeed = (user, game, wager, multiplier, payout, type) => {
    setLiveFeed(prev => [{ id: Date.now(), user, game, wager, multiplier, payout, type }, ...prev].slice(0, 8));
    fetch((import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "") + "/feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user, game, wager, multiplier, payout, type }) }).catch(() => {});
    const amt = Number(String(payout).replace(/[^0-9.]/g, "")) || 0;
    fetch((import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "") + "/board", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet: user, type, amount: type === "win" ? amt : 0, game }) }).catch(() => {});

  };




  const addWager = (amount) => {
    const numericAmount = typeof amount === 'string' ? 
      (amount.includes('M') ? parseFloat(amount) * 1000000 : 
       amount.includes('K') ? parseFloat(amount) * 1000 : parseFloat(amount)) 
      : amount;
      
    const newTotal = wageredTotal + numericAmount;
    setWageredTotal(newTotal);

  };

  const SidebarItem = ({ icon: Icon, label, target, active, locked }) => (
    <button 
      onClick={() => locked ? alert("The 300 Stand and Oracle Jackpot are locked until live pots are ready.") : target === 'stand-locked' || target === 'jackpot-locked' ? alert('This game is locked until the live pot is ready.') : setView(target)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        active 
        ? 'bg-neutral-800/80 text-white shadow-[0_0_15px_rgba(234,88,12,0.15)] border border-orange-500/20' 
        : 'hover:bg-neutral-800/40 text-neutral-400 hover:text-neutral-200 border border-transparent'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-amber-500' : ''}`} />
      <span className="font-bold text-sm tracking-wide">{label}</span>
      {locked && <Lock className="w-3.5 h-3.5 ml-auto text-red-400" />}
    </button>
  );

  const SidebarLink = ({ icon: Icon, label, href }) => (
    <a 
      href={href}
      target="_blank"
      rel="noreferrer"
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-neutral-800/40 text-neutral-400 hover:text-white border border-transparent"
    >
      <Icon className="w-5 h-5 text-neutral-500" />
      <span className="font-bold text-sm tracking-wide">{label}</span>
    </a>
  );

  const CategoryPill = ({ icon: Icon, label }) => (
    <button 
      onClick={() => setCategory(label)}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
        category === label 
        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-[0_0_15px_#ea580c44] border border-orange-400/50' 
        : 'bg-black/40 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-white/5'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const ArenaCard = ({ title, icon: Icon, target, bgBase, accentColor, renderArt, tag, players }) => (
    <div 
      onClick={() => target === 'stand-locked' || target === 'jackpot-locked' ? alert('This game is locked until the live pot is ready.') : setView(target)}
      className="relative w-full aspect-[4/5] rounded-2xl cursor-pointer group p-[1px] transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(234,88,12,0.4)] overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-white/20 group-hover:from-orange-500/80 group-hover:via-purple-500/80 group-hover:to-amber-500/80 transition-colors duration-500" />
      <div className={`relative h-full w-full rounded-[15px] overflow-hidden ${bgBase} flex flex-col justify-between`}>
        <div className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity duration-700">
          {renderArt()}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/20 blur-xl rounded-full group-hover:bg-white/30 transition-all duration-700 group-hover:scale-150" />
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white/10 ${accentColor} opacity-20 group-hover:scale-110 transition-all duration-500`} />
            <Icon className={`relative z-10 w-28 h-28 ${accentColor} drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`} style={{ filter: "drop-shadow(0px 0px 10px rgba(255,255,255,0.2))" }} />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-black via-black/90 to-transparent backdrop-blur-sm mt-auto z-20">
          <h3 className="font-spartan text-xl font-black text-white uppercase tracking-widest drop-shadow-lg">{title}</h3>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-200 bg-white/10 px-2.5 py-1 rounded-md backdrop-blur-md border border-white/5">
              <Activity className="w-3.5 h-3.5 text-green-400" /> {players} Active
            </div>
            {tag && <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(234,88,12,0.8)]">{tag}</span>}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div data-theme={look} className="flex h-screen bg-[#0a0200] text-neutral-100 font-sans overflow-hidden select-none relative">
      <WalletModal open={showWallets} wallets={walletList} onPick={pickWallet} onClose={() => setShowWallets(false)} />
      
      {/* SMOLDERING FIRE BACKGROUND */}
      <div className="theme-bg theme-grain z-0 bg-[#050100]">
        <div className="absolute bottom-0 left-0 w-full h-[120%] bg-gradient-to-t from-[#ea580c]/10 via-[#7f1d1d]/10 to-transparent" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-orange-600/20 blur-[100px] rounded-full mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-red-700/20 blur-[120px] rounded-full mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] left-[30%] w-[40vw] h-[40vw] bg-amber-600/10 blur-[90px] rounded-full mix-blend-screen animate-[pulse_10s_ease-in-out_infinite]" style={{ animationDelay: '1s' }} />
        <div className="theme-extra" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_100%)]" />
      </div>

      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-black/50 backdrop-blur-2xl border-r border-white/5 flex flex-col z-20 shrink-0 hidden md:flex shadow-[5px_0_30px_rgba(0,0,0,0.8)]">
        <div className="h-24 px-6 flex items-center gap-4 shrink-0 cursor-pointer border-b border-white/5" onClick={() => setView('home')}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-red-800 flex items-center justify-center shadow-[0_0_25px_rgba(234,88,12,0.5)] border border-orange-400/40">
            <span className="font-spartan text-3xl font-black text-white drop-shadow-md">Λ</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-spartan text-2xl font-black tracking-widest text-white uppercase leading-none mt-1 drop-shadow-lg">Spartan</h1>
            <span className="text-[11px] text-orange-400 font-black uppercase tracking-widest mt-1">Arena</span>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-1 custom-scrollbar relative z-10">
          <SidebarItem icon={LayoutDashboard} label="Arena Lobby" target="home" active={view === 'home'} />
          
          <div className="my-3 border-t border-white/5" />
          <p className="px-4 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Spartan Originals (PvP)</p>
          <SidebarItem icon={Swords} label="Colosseum Tap" target="tap" active={view === 'tap'} />
          <SidebarItem icon={TrendingUp} label="Chariot Deathrace" target="crash" active={view === 'crash'} />
          <SidebarItem icon={Wine} label="Poison Pick" target="plinko" active={view === 'plinko'} />
          <SidebarItem icon={Dices} label="Bones of Sparta" target="dice" active={view === 'dice'} />
          <SidebarItem icon={Footprints} label="Plank Crossing" target="plank" active={view === 'plank'} />
          <SidebarItem icon={Target} label="Spear Duel" target="spear" active={view === 'spear'} />
          <SidebarItem icon={Lightbulb} label="Suggest a Game" target="suggest" active={view === 'suggest'} />
          
          <div className="my-3 border-t border-white/5" />
          <p className="px-4 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Live Events</p>
          <SidebarItem icon={Skull} label="The 300 Stand" target="stand" locked active={view === 'stand'} />
          <SidebarItem icon={Zap} label="Oracle Jackpot" target="jackpot" locked active={view === 'jackpot'} />
          
          <div className="my-3 border-t border-white/5" />
          <p className="px-4 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Community</p>
          <SidebarItem icon={Trophy} label="Leaderboard" target="leaderboard" active={view === 'leaderboard'} />
          <SidebarLink icon={Twitter} label="X (Twitter)" href="https://x.com/SpartansOnchain" />
          <SidebarLink icon={MessageCircle} label="Discord / Support" href="https://discord.gg/ME8PRr8YG" />
          <SidebarLink icon={BarChart3} label="Dexscreener" href="https://dexscreener.com/solana/8omgduFEjztUuJy1gpo2rzpX95FA9n6y96NAEVdRT6oi" />
          
          <div className="my-3 border-t border-white/5" />
          <p className="px-4 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Information</p>
          <SidebarItem icon={ScrollText} label="Rules & Terms" target="rules" active={view === 'rules'} />
          <SidebarItem icon={Key} label="Armory" target="armory" active={view === 'armory'} />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
        
        {/* TOP NAV WITH LIVE CRYPTO TICKERS */}
        <header className="h-24 border-b border-white/5 bg-black/30 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between shrink-0 shadow-sm relative z-20">
          
          {/* Left: Search Bar */}
          <div className="w-64 hidden xl:block shrink-0">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const hit = [
                      { k: "tap colosseum", v: "tap" },
                      { k: "chariot deathrace", v: "crash" },
                      { k: "poison pick", v: "plinko" },
                      { k: "bones sparta", v: "dice" },
                      { k: "300 stand", v: "stand" },
                      { k: "oracle jackpot", v: "jackpot" },
                      { k: "suggest game", v: "suggest" },
                      { k: "leaderboard hall", v: "leaderboard" },
                      { k: "rules terms fair play", v: "rules" },
                      { k: "lobby home arena", v: "home" },
                    ].find((x) => x.k.includes(searchQ.trim().toLowerCase()) || searchQ.trim().toLowerCase().split(" ").some((w) => w && x.k.includes(w)));
                    if (hit) { setView(hit.v); setSearchQ(""); }
                  }
                }}
                placeholder="Search arena..."
                className="w-full bg-black/50 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all shadow-inner"
              />
              {searchQ.trim() && (
                <div className="absolute left-0 right-0 top-12 bg-black/95 border border-white/10 rounded-2xl overflow-hidden z-50">
                  {[
                    { label: "Colosseum Tap", v: "tap" },
                    { label: "Chariot Deathrace", v: "crash" },
                    { label: "Poison Pick", v: "plinko" },
                    { label: "Bones of Sparta", v: "dice" },
                    { label: "The 300 Stand", v: "stand" },
                    { label: "Oracle Jackpot", v: "jackpot" },
                    { label: "Suggest a Game", v: "suggest" },
                    { label: "Leaderboard", v: "leaderboard" },
                    { label: "Rules & Terms", v: "rules" },
                    { label: "Arena Lobby", v: "home" },
                    { label: "Discord / Support", href: "https://discord.gg/ME8PRr8YG" },
                    { label: "X (Twitter)", href: "https://x.com/SpartansOnchain" },
                    { label: "Dexscreener", href: "https://dexscreener.com/solana/8omgduFEjztUuJy1gpo2rzpX95FA9n6y96NAEVdRT6oi" },
                  ].filter((x) => x.label.toLowerCase().includes(searchQ.trim().toLowerCase())).map((x) => (
                    <button key={x.label} type="button" className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10" onClick={() => {
                      if (x.href) window.open(x.href, "_blank");
                      else setView(x.v);
                      setSearchQ("");
                    }}>{x.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center: Live SOL, BTC, ETH, $SPARTAN Tickers */}
          <div className="flex items-center gap-4 mx-auto overflow-x-auto py-1 px-4 custom-scrollbar flex-1 justify-center">
            {/* SOL */}
            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-inner">
              <span className="text-[11px] font-black text-purple-400">SOL</span>
              <span className="text-xs font-bold text-white">${cryptoPrices.SOL.price > 0 ? cryptoPrices.SOL.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '...'}</span>
              <span className={`text-[10px] font-black ${cryptoPrices.SOL.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {cryptoPrices.SOL.change >= 0 ? '+' : ''}{cryptoPrices.SOL.change.toFixed(2)}%
              </span>
            </div>
            {/* BTC */}
            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-inner">
              <span className="text-[11px] font-black text-amber-500">BTC</span>
              <span className="text-xs font-bold text-white">${cryptoPrices.BTC.price > 0 ? cryptoPrices.BTC.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '...'}</span>
              <span className={`text-[10px] font-black ${cryptoPrices.BTC.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {cryptoPrices.BTC.change >= 0 ? '+' : ''}{cryptoPrices.BTC.change.toFixed(2)}%
              </span>
            </div>
            {/* ETH */}
            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-inner">
              <span className="text-[11px] font-black text-blue-400">ETH</span>
              <span className="text-xs font-bold text-white">${cryptoPrices.ETH.price > 0 ? cryptoPrices.ETH.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '...'}</span>
              <span className={`text-[10px] font-black ${cryptoPrices.ETH.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {cryptoPrices.ETH.change >= 0 ? '+' : ''}{cryptoPrices.ETH.change.toFixed(2)}%
              </span>
            </div>
            {/* SPARTAN */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-orange-950/60 to-red-950/60 border border-orange-500/30 rounded-xl px-3.5 py-1.5 shadow-[0_0_15px_rgba(234,88,12,0.2)]">
              <div className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                <span className="text-[11px] font-black text-orange-400 tracking-wider leading-none">$SPARTAN</span>
              </div>
              <span className="text-xs font-black text-white leading-none">${cryptoPrices.SPARTAN.price > 0 ? cryptoPrices.SPARTAN.price.toFixed(7) : '...'}</span>
              <span className={`text-[10px] font-black leading-none ${cryptoPrices.SPARTAN.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {cryptoPrices.SPARTAN.change >= 0 ? '+' : ''}{cryptoPrices.SPARTAN.change.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Right: Wallet & Auth */}
          <div className="flex items-center gap-3 shrink-0">
            {wallet && (
              <div className="flex bg-black/50 border border-white/10 rounded-xl overflow-hidden shadow-inner backdrop-blur-md">
                <div className="px-3 py-1.5 flex items-center gap-2 bg-orange-900/20">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <div className="flex flex-col">
                    <span className="text-[9px] text-orange-200/50 uppercase font-bold leading-none">Ready Wallet</span>
                    <span className={"font-black text-xs leading-none mt-1 transition-all duration-500 " + (readyFlash === "win" ? "text-green-400 scale-110" : readyFlash === "lose" ? "text-red-400 scale-90" : "text-white")}>{balanceReal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {username && (
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-black/50 border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors backdrop-blur-md">
                <User className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-black text-white uppercase tracking-wider">{username}</span>
              </div>
            )}

            <button 
              onClick={connectWallet}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all text-white shadow-[0_0_20px_rgba(234,88,12,0.4)] border border-orange-400/50"
            >
              {!wallet && <Wallet className="w-3.5 h-3.5" />}
              {wallet ? "Connected" : "Sign In"}
            </button>
          </div>
        </header>

        {/* DYNAMIC VIEW ROUTING */}
        <div className="flex-1 overflow-y-auto relative custom-scrollbar z-10">
          
          {view === 'home' && (
            <div className="max-w-7xl mx-auto p-4 md:p-8">
              
              {/* Premium Promo Banners */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-red-900 via-orange-950 to-black border border-orange-500/30 shadow-[0_10px_40px_rgba(234,88,12,0.2)] h-64 md:h-72 group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 blur-[80px] rounded-full" />
                  <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-8">
                    {deskSlide === 0 ? (
                      <div className="max-w-md">
                        <h2 className="text-orange-200 font-black uppercase tracking-widest text-[11px] mb-3">Community Hall</h2>
                        <h1 className="font-spartan text-3xl font-black text-white mb-3">Join the Discord</h1>
                        <p className="text-orange-100/80 text-sm leading-relaxed mb-5">Weekly and monthly giveaways. Spartan OnChain NFTs launch October 1st. First look lives in the hall.</p>
                        <a href="https://discord.gg/ME8PRr8YG" target="_blank" rel="noreferrer" className="inline-block bg-white text-black px-6 py-2.5 rounded-lg font-black uppercase tracking-widest text-xs">Open Discord</a>
                      </div>
                    ) : (
                      <div className="max-w-md">
                        <h2 className="text-orange-200 font-black uppercase tracking-widest text-[11px] mb-3">Token Desk</h2>
                        <h1 className="font-spartan text-3xl font-black text-white mb-3">List Your Coin Here</h1>
                        <p className="text-orange-100/80 text-sm leading-relaxed mb-5">Play it on the Arena or park it on the ticker next to BTC, ETH, SOL, and $SPARTAN. Week or month placements.</p>
                        <a href="https://discord.gg/ME8PRr8YG" target="_blank" rel="noreferrer" className="inline-block bg-white text-black px-6 py-2.5 rounded-lg font-black uppercase tracking-widest text-xs">Submit in Discord</a>
                      </div>
                    )}
                    <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2">
                      <button type="button" onClick={() => setDeskSlide(0)} className={"w-8 h-1.5 rounded-full " + (deskSlide === 0 ? "bg-white" : "bg-white/25")} />
                      <button type="button" onClick={() => setDeskSlide(1)} className={"w-8 h-1.5 rounded-full " + (deskSlide === 1 ? "bg-white" : "bg-white/25")} />
                    </div>
                  </div>
                </div>

                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-950 to-black border border-purple-500/30 shadow-[0_10px_40px_rgba(168,85,247,0.2)] h-64 md:h-72 group hidden lg:block">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full group-hover:bg-purple-500/30 transition-colors duration-700" />
                  <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-8">
                    <h2 className="text-purple-200 font-black uppercase tracking-widest text-[11px] mb-3">Oracle's Jackpot</h2>
                    <h1 className="font-spartan text-3xl md:text-4xl font-black text-white leading-tight mb-3">
                      1,250,000 <span className="text-purple-300">$SPARTAN</span>
                    </h1>
                    <p className="text-purple-100/80 text-sm leading-relaxed max-w-sm mb-5">The treasury grows with every drop of blood.</p>
                    <div className="bg-white/10 border border-white/20 text-white px-6 py-2.5 rounded-lg font-black uppercase tracking-widest text-xs">Coming Soon</div>
                  </div>
                  <Trophy className="absolute -right-4 top-1/2 -translate-y-1/2 w-48 h-48 text-purple-400/30 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 pointer-events-none drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]" />
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-4 mb-4 custom-scrollbar">
                <CategoryPill icon={LayoutDashboard} label="Lobby" />
                <CategoryPill icon={Swords} label="Spartan Originals" />
                <CategoryPill icon={Flame} label="High Stakes" />
                <CategoryPill icon={Skull} label="Live Multiplayer" />
              </div>
              
              {/* Premium Realistic Game Grid */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="flex items-center gap-3 font-spartan text-2xl font-black text-white uppercase tracking-widest drop-shadow-md">
                    <span className="w-1.5 h-7 bg-gradient-to-b from-orange-400 to-red-600 rounded-full shadow-[0_0_10px_#ea580c]" />
                    Spartan Originals
                  </h2>
                  <div className="flex gap-2">
                    <button className="bg-black/50 border border-white/10 p-2.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-all"><ChevronRight className="w-5 h-5 rotate-180" /></button>
                    <button className="bg-black/50 border border-white/10 p-2.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-all"><ChevronRight className="w-5 h-5" /></button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <ArenaCard 
                    title="Colosseum Tap" icon={Swords} target="tap" players={String(liveHere.tap||0)} tag="1v1 PvP"
                    bgBase="bg-[#1a0500]" accentColor="text-orange-400"
                    renderArt={() => (
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,88,12,0.6),transparent_70%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.1)_50%,transparent_75%)] bg-[length:20px_20px]" />
                      </div>
                    )}
                  />
                  <ArenaCard 
                    title="Chariot Deathrace" icon={TrendingUp} target="crash" players={String(liveHere.chariot||0)} tag="1v1 PvP"
                    bgBase="bg-[#00081a]" accentColor="text-cyan-400"
                    renderArt={() => (
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[size:20px_20px] [transform:perspective(500px)_rotateX(60deg)] origin-bottom" />
                        <div className="absolute bottom-0 left-0 w-full h-full bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500/50 via-blue-900/20 to-transparent blur-xl" />
                      </div>
                    )}
                  />
                  <ArenaCard 
                    title="Poison Pick" icon={Wine} target="plinko" players={String(liveHere.phalanx||0)} tag="1v1 PvP"
                    bgBase="bg-[#001a0a]" accentColor="text-green-400"
                    renderArt={() => (
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-[radial-gradient(rgba(74,222,128,0.4)_2px,transparent_2px)] bg-[size:24px_24px]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#001a0a] via-[#001a0a]/50 to-emerald-900/50" />
                      </div>
                    )}
                  />
                  <ArenaCard 
                    title="Bones of Sparta" icon={Dices} target="dice" players={String(liveHere.bones||0)} tag="1v1 PvP"
                    bgBase="bg-[#1a0024]" accentColor="text-fuchsia-400"
                    renderArt={() => (
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_15px,rgba(217,70,239,0.1)_15px,rgba(217,70,239,0.1)_30px)]" />
                        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(217,70,239,0.5),transparent_70%)] blur-2xl" />
                      </div>
                    )}
                  />
                  <ArenaCard 
                    title="Plank Crossing" icon={Footprints} target="plank" players={String(liveHere.plank||0)} tag="1v1 PvP"
                    bgBase="bg-[#1a0c00]" accentColor="text-amber-400"
                    renderArt={() => (
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_18px,rgba(245,158,11,0.15)_18px,rgba(245,158,11,0.15)_20px)]" />
                      </div>
                    )}
                  />
                  <ArenaCard 
                    title="Spear Duel" icon={Target} target="spear" players={String(liveHere.spear||0)} tag="1v1 PvP"
                    bgBase="bg-[#140000]" accentColor="text-orange-400"
                    renderArt={() => (
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,88,12,0.45),transparent_70%)]" />
                    )}
                  />
                  <ArenaCard 
                    title="The 300 Stand" icon={Skull} target="stand-locked" players="0" tag="Royale"
                    bgBase="bg-[#240a00]" accentColor="text-yellow-500"
                    renderArt={() => (
                      <div className="absolute inset-0">
                        <div className="absolute bottom-0 left-0 w-full h-[150%] bg-[radial-gradient(ellipse_at_bottom,rgba(245,158,11,0.5),transparent_70%)]" />
                      </div>
                    )}
                  />
                </div>
              </div>

              <div className="mt-12 mb-10">
                <div className="flex items-center gap-4 mb-4 border-b border-white/5 pb-4">
                  <div className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-orange-500" /> Recent Battles
                  </div>
                </div>
                <div className="space-y-3">
                  {liveFeed.length === 0 && (
                    <div className="text-neutral-500 text-sm bg-black/30 border border-white/5 rounded-xl p-4">No battles yet. Play a match and it shows here.</div>
                  )}
                  {liveFeed.map((feed) => (
                    <div key={feed.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={"w-8 h-8 rounded-lg flex items-center justify-center " + (feed.type === "win" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                          {feed.type === "win" ? <Trophy className="w-4 h-4" /> : <Skull className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-white text-xs font-bold">{feed.user}</div>
                          <div className="text-neutral-500 text-[10px]">{feed.game} • {feed.wager}</div>
                        </div>
                      </div>
                      <div className={"text-xs font-black " + (feed.type === "win" ? "text-green-400" : "text-red-400")}>{feed.payout}</div>
                    </div>
                  ))}
                </div>
              </div>

              <footer className="pt-8 pb-4 text-center text-[10px] text-neutral-500 uppercase tracking-widest font-black border-t border-white/5">
                The Spartan Arena • Solana Network • Play Responsibly
              </footer>
            </div>
          )}

          {/* ALL GAMES ROUTING */}
          {view === 'tap' && <ArenaGame wallet={wallet} addWager={addWager} addFeed={addFeed} username={username} onBack={() => setView('home')} />}
          {view === 'crash' && <ChariotDeathrace addWager={addWager} addFeed={addFeed} username={username} onBack={() => setView('home')} />}
          {view === 'dice' && <BonesOfSparta addWager={addWager} addFeed={addFeed} username={username} onBack={() => setView('home')} />}
          {view === 'plinko' && <PhalanxStance addWager={addWager} addFeed={addFeed} username={username} onBack={() => setView('home')} />}
          {view === 'stand' && <The300Stand addWager={addWager} addFeed={addFeed} username={username} onBack={() => setView('home')} />}
          {view === 'jackpot' && <OracleJackpot addWager={addWager} addFeed={addFeed} username={username} onBack={() => setView('home')} />}
          
          {/* SUGGEST A GAME */}
          {view === 'suggest' && (
            <div className="max-w-2xl mx-auto mt-20 relative z-20 px-4">
              <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center shadow-lg">
                    <Lightbulb className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="font-spartan text-3xl font-black text-white uppercase tracking-widest">Suggest a Game</h1>
                    <p className="text-amber-400 text-sm font-bold uppercase tracking-widest">Bounty: Earn $SPARTAN if selected</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6 text-sm text-neutral-300">
                  Have an idea for a Web3 PVP game? Describe the mechanics below. If the developers build your game, you'll receive a massive $SPARTAN bounty dropped directly to your connected wallet.
                </div>
                <textarea
                  rows={6}
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  placeholder="Describe your game mechanics, theme, and how it utilizes $SPARTAN..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 resize-none mb-4 shadow-inner"
                />
                <button onClick={async () => {
                  const pk = window.__spartanWallet?.publicKey || window.solana?.publicKey;
                  if (!pk) { setIdeaNote("Must sign in"); return; }
                  if (!ideaText.trim()) { setIdeaNote("Write the idea first"); return; }
                  const wallet = pk.toBase58 ? pk.toBase58() : String(pk);
                  const host = (import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "");
                  try {
                    const r = await fetch(host + "/ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet, text: ideaText.trim() }) });
                    if (!r.ok) throw new Error("bad");
                    setIdeaText("");
                    setIdeaNote("Submitted");
                  } catch (e) {
                    setIdeaNote("Could not reach the idea board. Try again.");
                  }
                }} className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 font-black text-sm tracking-widest uppercase text-white">
                  Submit to the Oracle
                </button>
                {ideaNote && <p className="mt-3 text-center text-sm font-black uppercase tracking-widest text-amber-300">{ideaNote}</p>}
              </div>
            </div>
          )}

          {/* INFORMATION ROUTES */}
          {view === 'rules' && (
            <div className="max-w-3xl mx-auto bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-10 mt-10 mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-20">
              <h1 className="font-spartan text-3xl font-black text-amber-500 mb-8 border-b border-white/10 pb-6 flex items-center gap-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <ScrollText className="w-8 h-8 text-orange-500" /> Protocol Rules & Conditions
              </h1>
              <div className="space-y-8 text-neutral-300 leading-relaxed text-sm">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-widest mb-3 flex items-center gap-3">
                    <Shield className="w-6 h-6 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" /> Wallet Security & Protection
                  </h3>
                  <p className="bg-black/50 p-6 rounded-2xl border border-white/5 shadow-inner">
                    Every wallet connected to The Spartan Arena is fully secured, encrypted, and protected. We do not have access to your private keys. All transactions are authorized strictly by you through your Web3 wallet provider on the Solana blockchain.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-widest mb-3 flex items-center gap-3">
                    <Coins className="w-6 h-6 text-orange-500 drop-shadow-[0_0_10px_rgba(234,88,12,0.5)]" /> Match Fee & Payout Breakdown
                  </h3>
                  <p className="bg-black/50 p-6 rounded-2xl border border-white/5 shadow-inner">
                    When you emerge victorious in a multiplayer arena, the total pot is distributed automatically via smart contract: <br/><br/>
                    <strong className="text-green-400 text-lg drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">95%</strong> goes directly to the Winner's connected wallet.<br/><br/>
                    <strong className="text-purple-400 text-lg drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]">3%</strong> goes to the treasury and for the jackpot.<br/><br/>
                    <strong className="text-orange-400 text-lg drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]">2%</strong> is forever burned.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-widest mb-3 flex items-center gap-3">
                    <Shield className="w-6 h-6 text-red-400" /> Fair Play & Cheating
                  </h3>
                  <p className="bg-black/50 p-6 rounded-2xl border border-white/5 shadow-inner">
                    Matches are live 1v1. Scores sync on the match server. Scripts, auto-clickers, multi-account collusion, latency abuse, or any tool that plays for you is cheating. We watch odd win patterns and matched wallets. Cheat and the wallet is banned from matchmaking. Stakes already in a match follow the on-chain 95 / 3 / 2 split. No refund for a ban.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-widest mb-3">House rules</h3>
                  <p className="bg-black/50 p-6 rounded-2xl border border-white/5 shadow-inner">
                    You need a connected Solana wallet and a small SOL fee to start a match. Only $SPARTAN is staked. You play humans, not bots. Same stake on both sides. Winner takes 95% of the pot, 3% treasury, 2% burn. Private rooms use a 6-digit code. Locked games (300 Stand, Oracle Jackpot) stay closed until those pots are live. The Arena does not custody your keys. You are responsible for your device, your wallet, and your stakes. 18+ only. Play what you can lose.
                  </p>
                </div>
              </div>
            </div>
          )}

          {view === 'leaderboard' && (
            <div className="max-w-4xl mx-auto mt-10 mb-10 relative z-20 px-4">
              <h1 className="font-spartan text-3xl font-black text-amber-500 mb-8 flex items-center gap-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <Trophy className="w-10 h-10 text-amber-500" /> Hall of Legends
              </h1>
              <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/60 text-neutral-400 text-xs uppercase tracking-widest border-b border-white/10 font-black">
                    <tr>
                      <th className="p-6">Rank</th>
                      <th className="p-6">Warrior</th>
                      <th className="p-6">Win Rate</th>
                      <th className="p-6 text-right">Total Won</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {liveBoard.length === 0 && (
                      <tr><td className="p-8 text-neutral-500" colSpan={4}>No live results yet. Finished matches land here.</td></tr>
                    )}



                    {liveBoard.map((row, i) => (
                      <tr key={row.wallet} className={i === 0 ? "bg-gradient-to-r from-amber-900/30 to-transparent" : ""}>
                        <td className="p-6 font-black text-amber-400 text-xl">#{i + 1}</td>
                        <td className="p-6 font-black text-white tracking-wider">{String(row.wallet).slice(0,4)}...{String(row.wallet).slice(-4)}</td>
                        <td className="p-6 font-bold text-neutral-300">{row.played ? Math.round((row.wins / row.played) * 100) : 0}%</td>
                        <td className="p-6 text-right font-black text-amber-400">{Number(row.won || 0).toLocaleString()} $SPARTAN</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

{view === 'armory' && (
            <div className="max-w-3xl mx-auto mt-16 px-4 relative z-20">
              {!armoryOk ? (
                <div className="bg-black/60 border border-white/10 rounded-3xl p-10 text-center">
                  <Key className="w-10 h-10 text-amber-400 mx-auto mb-4" />
                  <h1 className="font-spartan text-3xl font-black text-white mb-2">ARMORY</h1>
                  <p className="text-neutral-400 text-sm mb-6">Operator gate. Enter the key you keep offline.</p>
                  <input type="password" value={armoryPin} onChange={(e) => setArmoryPin(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-center text-white mb-4" placeholder="Key" />
                  <button onClick={async () => {
                    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(armoryPin));
                    const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
                    if (hex === "7c9cef143914af7d37164220ef9990287b623e52b7a746cfe5a185fb934a5db4") {
                      setArmoryOk(true);
                      setArmoryPin("");
                      const host = (import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "");
                      const rows = await fetch(host + "/ideas").then((r) => r.json()).catch(() => []);
                      setArmoryIdeas(Array.isArray(rows) ? rows : []);
                    } else {
                      setArmoryPin("");
                    }
                  }} className="w-full py-3 rounded-xl bg-orange-600 font-black uppercase tracking-widest text-white">Enter</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-black/60 border border-white/10 rounded-3xl p-8">
                    <h2 className="font-spartan text-2xl font-black text-white mb-2">Rebuild prompt</h2>
                    <p className="text-neutral-400 text-sm mb-4">Paste this to Grok when you want to keep editing the live casino.</p>
                    <textarea readOnly rows={12} className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-xs text-neutral-200" value={"SPARTAN ARENA REBUILD / EDIT PROMPT\nContinue the live Spartan Arena PvP casino. Do not start over.\n\nRepo: GitHub SpartanOnChain-crypto/spartan-arena\nLocal: /mnt/c/Users/XRP/spartan-arena-web\nLive: https://spartan-arena-one.vercel.app\nMatch server: https://grand-exploration-production-d941.up.railway.app\nMint $SPARTAN: 8omgduFEjztUuJy1gpo2rzpX95FA9n6y96NAEVdRT6oi\nTreasury: 8sYXvt5WSk1SVJ8UmWPLSTAYapZ1BBf2VbQECSPF2H34\nOperator public: 2fzt95p1oznswzeAFNcpv86qjN4bVSoeJ7dMQXurN59y\nProgram: Dw8c9YJLzv8m3EiKcwdCg2DiQPPeJAB3bwTfqRRe3riN\nSplit: 95% winner / 3% treasury / 2% burn. Humans only. No bots.\nGames live: Colosseum Tap, Chariot Deathrace, Poison Pick (2 cups, first to 3 poison drinks loses), Bones of Sparta.\nLocked: 300 Stand, Oracle Jackpot.\nEdits go in Ubuntu as python patches, then git add / commit / pull --rebase / push origin main. Vercel builds the site. Railway serves match-server.\n\nI am the operator. Keep Ready Wallet live. Keep VS opponent wallet on every game. Keep sign-in required before Find Match. Change only what I ask next."} />
                  </div>
                  <div className="bg-black/60 border border-white/10 rounded-3xl p-8">
                    <h2 className="font-spartan text-2xl font-black text-white mb-4">Game suggestions</h2>
                    {armoryIdeas.length === 0 && <p className="text-neutral-500">No ideas yet.</p>}
                    <div className="space-y-4">
                      {armoryIdeas.map((it) => (
                        <div key={it.id} className="border border-white/10 rounded-2xl p-5">
                          <p className="text-xs font-black text-orange-300 mb-2">{it.wallet}</p>
                          <p className="text-sm text-neutral-200 whitespace-pre-wrap">{it.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// REUSABLE MATCHMAKING LOBBY & HOW TO PLAY WRAPPER
// -------------------------------------------------------------

function SideReel({ side, slides }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % slides.length), 2800);
    return () => clearInterval(id);
  }, [slides.length]);
  const s = slides[i];
  return (
    <a href="https://discord.gg/ME8PRr8YG" target="_blank" rel="noreferrer" className={"hidden xl:flex flex-col overflow-hidden rounded-2xl border border-orange-400/40 bg-black/80 shadow-[0_0_40px_rgba(234,88,12,0.35)] w-32 " + (side === "left" ? "absolute left-3 top-6 bottom-8" : "absolute right-3 top-6 bottom-8")}>
      <div className={"relative h-full flex flex-col " + s.skin}>
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(115deg, transparent 0 10px, rgba(255,255,255,.07) 10px 11px)" }} />
        <div className="relative px-2 pt-3 text-[9px] font-black tracking-[0.2em] text-orange-200">{s.ep}</div>
        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-2">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300 mb-2">{s.kicker}</p>
          <p className="font-spartan text-base font-black text-white leading-tight mb-2">{s.title}</p>
          <p className="text-[10px] text-orange-50/90 leading-snug">{s.line}</p>
        </div>
        <div className="relative h-1.5 bg-white/10 m-2 rounded-full overflow-hidden">
          <div key={i} className="h-full bg-orange-400 animate-[pulse_2.8s_linear]" style={{ width: "100%" }} />
        </div>
      </div>
    </a>
  );
}

export function MatchmakingLobby({ title, subtitle, icon: Icon, iconColor, onBack, onStart, children }) {
  const [wager, setWager] = useState('100');
  const [league, setLeague] = useState('little');
  const [roomCode, setRoomCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const littleLeague = ['100', '500', '1K', '5K', '10K'];
  const bigLeague = ['50K', '100K', '500K', '1M'];

  const [needSign, setNeedSign] = useState(false);
  const handleStart = (room) => {
    const ready = window.__spartanWallet?.publicKey;
    if (!ready) { setNeedSign(true); return; }
    setNeedSign(false);
    if (isSearching) return;
    setIsSearching(true);
    Promise.resolve(onStart(wager, room || "")).catch((e) => {
      if (String(e && e.message) === "MUST_SIGN_IN") setNeedSign(true);
    }).finally(() => setIsSearching(false));
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-16 pt-6 px-4 relative z-20">
      
      {/* Lobby Form */}
      <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative">
        <button onClick={onBack} className="absolute left-6 top-6 text-neutral-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full border border-white/5"><ChevronRight className="w-5 h-5 rotate-180" /></button>
        <div className="flex flex-col items-center mb-8">
          <div className={`w-20 h-20 bg-gradient-to-br ${iconColor} rounded-2xl flex items-center justify-center shadow-lg border border-white/10 mb-4 mt-2`}>
            <Icon className="w-10 h-10 text-white drop-shadow-md" />
          </div>
          <h2 className="font-spartan text-3xl font-black text-white tracking-widest drop-shadow-lg uppercase text-center">{title}</h2>
          <p className="text-sm text-neutral-400 font-medium text-center">{subtitle}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
          {/* Ranked Matchmaking Side */}
          <div className="bg-black/50 border border-white/5 rounded-2xl p-6 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-orange-500"/> Ranked PvP Matchmaking</h3>
            <div className="flex bg-black/80 rounded-xl p-1 mb-4 border border-white/5">
              <button onClick={() => {setLeague('little'); setWager('100');}} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${league === 'little' ? 'bg-white/10 text-white' : 'text-neutral-500'}`}>Little League</button>
              <button onClick={() => {setLeague('big'); setWager('50K');}} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${league === 'big' ? 'bg-orange-600/20 text-orange-400' : 'text-neutral-500'}`}>Big League</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {(league === 'little' ? littleLeague : bigLeague).map(amt => (
                <button key={amt} onClick={() => setWager(amt)} className={`py-2 rounded-lg text-xs font-black border transition-all ${wager === amt ? 'border-orange-500 bg-orange-600/20 text-orange-400 shadow-[0_0_15px_rgba(234,88,12,0.3)]' : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/30 hover:text-white'}`}>
                  {amt}
                </button>
              ))}
            </div>
            <button onClick={() => handleStart("")} disabled={isSearching} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 font-black text-sm tracking-widest uppercase hover:brightness-110 shadow-[0_0_30px_rgba(234,88,12,0.4)] transition-all flex items-center justify-center gap-2 text-white border border-orange-400/50">
              {isSearching ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding players...
          </span>
        ) : "Find Random Warrior"}

            </button>
                {needSign && <p className="mt-3 text-center text-sm font-black uppercase tracking-widest text-red-400">Must sign in</p>}
                <p className="mt-3 text-center text-xs text-white/50">
                  You need 0.00008 SOL to find match
                </p>
          </div>

          {/* Private Room Side */}
          <div className="bg-black/50 border border-white/5 rounded-2xl p-6 shadow-inner relative overflow-hidden flex flex-col justify-between">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Key className="w-4 h-4 text-purple-500"/> Private Arena</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">Enter a specific lobby code to challenge a rival directly. Wagers are set by the lobby creator.</p>
              <input type="text" placeholder="ENTER 6-DIGIT CODE" value={roomCode} onChange={e => setRoomCode(e.target.value.replace(/[^0-9]/g,'').slice(0,6))} maxLength={6} className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-3 text-center text-white font-black uppercase tracking-widest focus:outline-none focus:border-purple-500 transition-all shadow-inner mb-3" />
              <button type="button" onClick={() => setRoomCode(String(Math.floor(100000 + Math.random()*900000)))} className="w-full py-2.5 mb-4 rounded-xl bg-purple-600/20 border border-purple-400/40 text-purple-200 font-black text-xs tracking-widest uppercase">Generate 6-digit code</button>
              <p className="text-[11px] text-neutral-500 mb-3">Same game. Same stake as the left side. Send the code to one rival.</p>
            </div>
            <button onClick={() => handleStart(roomCode)} disabled={roomCode.length !== 6} className="w-full py-3.5 rounded-xl bg-white/10 border border-white/20 font-black text-sm tracking-widest uppercase hover:bg-white/20 transition-all flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed">
              Join Private Match
            </button>
          </div>
        </div>
      </div>

      {/* GAME SPECIFIC 'HOW TO PLAY' DESCRIPTIONS (Passed as children) */}
      {children}

    </div>
  );
}

const getPayoutStr = (wager, multiplier) => {
  if (wager.includes('M')) return (parseFloat(wager)*multiplier) + 'M';
  if (wager.includes('K')) return (parseFloat(wager)*multiplier) + 'K';
  return (parseFloat(wager)*multiplier).toString();
};

// -------------------------------------------------------------
// GAME 1: COLOSSEUM TAP
// -------------------------------------------------------------

function ArenaGame({ wallet, addWager, addFeed, username, onBack }) {
  const [view, setView] = useState('lobby'); 
  const [wager, setWager] = useState('100');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(10.0);
  const [myTaps, setMyTaps] = useState(0);
  const [oppTaps, setOppTaps] = useState(0);
  const [winner, setWinner] = useState(null);
  const [tapsEffect, setTapsEffect] = useState([]);
  const myTapsRef = React.useRef(0);
  const oppTapsRef = React.useRef(0);

  useEffect(() => {
    if (view !== 'countdown') return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      myTapsRef.current = 0; oppTapsRef.current = 0; setMyTaps(0); setOppTaps(0); setTimeLeft(10.0); setView('arena');
    }
  }, [view, countdown]);

  useEffect(() => {
    if (view !== 'arena') return;
    const MATCH = (import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "");
    const human = !window.__spartanPractice && window.__spartanOpponent && window.__spartanOpponent !== "Practice Bot";
    const aiInterval = setInterval(() => {
      if (!human) {
        if (Math.random() > 0.3) setOppTaps(o => o + 1);
        return;
      }
      const id = window.__spartanMatchId;
      if (!id) return;
      fetch(MATCH + "/score/" + id).then(r=>r.json()).then(row=>{
        const n = row[window.__spartanOpponent];
        if (typeof n === "number") { oppTapsRef.current = n; setOppTaps(n); }
      }).catch(()=>{});
    }, 200);
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0.1) { clearInterval(timer); clearInterval(aiInterval); settleMatch(); return 0; }
        return parseFloat((t - 0.1).toFixed(1));
      });
    }, 100);
    return () => { clearInterval(timer); clearInterval(aiInterval); };
  }, [view]);

  const handleStrike = (e) => {
    if (view !== 'arena' || timeLeft <= 0) return;
    setMyTaps(t => {
      const n = t + 1;
      myTapsRef.current = n;
      const MATCH = (import.meta.env.VITE_MATCH_URL || "https://grand-exploration-production-d941.up.railway.app").replace(/\/$/, "");
      const me = window.__spartanWallet?.publicKey || window.solana?.publicKey;
      const wallet = me?.toBase58?.() || me?.toString?.() || "";
      if (wallet && window.__spartanMatchId && !window.__spartanPractice) {
        fetch(MATCH + "/score", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ matchId: window.__spartanMatchId, wallet, taps: n })
        }).catch(()=>{});
      }
      return n;
    });
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setTapsEffect(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setTapsEffect(prev => prev.filter(item => item.id !== id)), 600);
  };

  const settleMatch = () => {
    setView('result');
    addWager(wager);
    const finalMine = myTapsRef.current;
    const finalOpp = oppTapsRef.current;
    if (finalMine > finalOpp) {
      setWinner('you');
        const pot = (parseWager(wager) || 0) * 2;
        const winPk = window.__spartanWallet?.publicKey || window.solana?.publicKey;
        if (pot > 0 && winPk) {
          fetch(MATCH_HOST + "/payout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({winner:String(winPk.toBase58?winPk.toBase58():winPk),amountUi:pot})}).then(async r=>{ const text = await r.text(); let j={}; try { j = JSON.parse(text); } catch { throw new Error(text.slice(0,180)); } return j; }).then(j=>{
            if (j && j.sig) {
              window.__spartanPayoutNote = "Winnings paid. Check your READY wallet.";
              if (typeof window.__spartanSetReady === "function") {
                const stake = Number(String(wager).replace(/[^0-9.]/g, "")) || 0;
                window.__spartanSetReady((prev) => Number(prev) + stake);
              }

              const pk = window.__spartanWallet?.publicKey || window.solana?.publicKey;
              if (pk && typeof getWalletBalances === "function") {
                getWalletBalances(pk).then((b) => {
                  window.dispatchEvent(new CustomEvent("spartan-ready", { detail: b }));
                }).catch(() => {});
              }
            } else {
              window.__spartanPayoutNote = "Payout failed: " + (j && j.error ? j.error : "no response");
            }
          }).catch((e)=>alert("Payout failed: " + String(e)));
        }

      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#EA580C', '#F59E0B'] });
      addFeed(warriorName(), "Colosseum Tap", wager, "2.0x", `+${getPayoutStr(wager, 2)}`, 'win');
    } else if (finalOpp > finalMine) {
      setWinner('opp');
      window.__spartanPayoutNote = "Match over. Check your READY wallet.";
      if (typeof window.__spartanSetReady === "function") {
        const stakeL = Number(String(wager).replace(/[^0-9.]/g, "")) || 0;
        window.__spartanSetReady((prev) => Math.max(0, Number(prev) - stakeL));
      }
      addFeed(warriorName(), "Colosseum Tap", wager, "0.0x", `-${wager}`, 'loss');
    } else {
      setWinner('tie');
    }
  };

  const totalTaps = myTaps + oppTaps || 1;
  const myLeadPct = Math.min(100, Math.max(0, (myTaps / totalTaps) * 100));

  if (view === 'lobby') return (
    <MatchmakingLobby 
      title="Colosseum Tap" 
      subtitle="10-Second PvP Combat" 
      icon={Swords} 
      iconColor="from-red-600 to-orange-700" 
      onBack={onBack} 
      onStart={(w, room) => startTapOnChain(w, () => { setWager(w); setView('countdown'); }, 'tap', room)}
    >
      {/* Individual Details for Colosseum Tap */}
      <div className="mt-8 bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <Info className="w-6 h-6 text-orange-500" />
          <h3 className="font-spartan text-xl font-black text-white uppercase tracking-wider">How to Play Colosseum Tap</h3>
        </div>

        {/* Example Visual Diagram */}
        <div className="w-full bg-black/60 border border-orange-500/20 rounded-2xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 blur-2xl rounded-full pointer-events-none" />
          <h4 className="text-xs font-black uppercase tracking-widest text-orange-400 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Live Strike Mechanic Preview
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center">
            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <span className="text-xs font-bold text-neutral-400 block mb-1">1. Match Clock</span>
              <span className="font-spartan text-3xl font-black text-amber-400">10.0s</span>
              <p className="text-[11px] text-neutral-500 mt-1">High-frequency clicking window</p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center">
              <span className="text-xs font-bold text-neutral-400 block mb-2">2. Central Blade</span>
              <div className="w-12 h-12 rounded-full border-2 border-orange-500 bg-black flex items-center justify-center shadow-[0_0_15px_#ea580c55]">
                <span className="font-spartan font-black text-orange-500">Λ</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-2">Every click triggers +1 Strike</p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <span className="text-xs font-bold text-neutral-400 block mb-1">3. Momentum Gauge</span>
              <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden flex my-2">
                <div className="w-[65%] bg-gradient-to-r from-orange-600 to-amber-500" />
                <div className="w-[35%] bg-red-800" />
              </div>
              <p className="text-[11px] text-green-400 font-bold">Highest total taps wins pot</p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-600/30 border border-orange-500 text-orange-400 text-xs flex items-center justify-center font-bold">1</span>
              Choose Staking Tier
            </h5>
            <p className="text-neutral-400 leading-relaxed text-xs">
              Select Little League (100 to 10K) or Big League (50K to 1M). You will be matched against a real challenger in that exact wager pool.
            </p>
          </div>
          <div>
            <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-600/30 border border-orange-500 text-orange-400 text-xs flex items-center justify-center font-bold">2</span>
              10-Second Combat
            </h5>
            <p className="text-neutral-400 leading-relaxed text-xs">
              When the countdown concludes, unleash maximum clicking speed on the central Spartan crest. The momentum tug-of-war bar tracks lead in real-time.
            </p>
          </div>
          <div>
            <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-600/30 border border-orange-500 text-orange-400 text-xs flex items-center justify-center font-bold">3</span>
              Instant Spoils
            </h5>
            <p className="text-neutral-400 leading-relaxed text-xs">
              The warrior with the highest strike count when the timer hits zero is awarded 95% of the total duel pot. 3% fuels the Oracle and 2% aids the Treasury.
            </p>
          </div>
        </div>
      </div>
    </MatchmakingLobby>
  );

  if (view === 'countdown') return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center relative z-20">
      <h3 className="text-sm uppercase tracking-widest text-neutral-400 font-black mb-4">Opponent Found. Prepare Your Blade.</h3>
            {window.__spartanOpponent && window.__spartanOpponent !== "Practice Bot" && (
        <div className="text-center mb-4">
          <div className="font-spartan text-3xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-red-500 to-yellow-300 animate-pulse drop-shadow-[0_0_20px_rgba(234,88,12,0.9)]">
            VS {String(window.__spartanOpponent).slice(0,4)}...{String(window.__spartanOpponent).slice(-4)}
          </div>
        </div>
      )}
<span className="font-spartan text-[10rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-600 animate-pulse">{countdown}</span>
    </div>
  );

  if (view === 'arena') return (
    <div className="w-full flex flex-col items-center mt-10 relative z-20">
      <div className="mb-8 flex flex-col items-center">
        <div className="px-10 py-3 rounded-full border border-white/10 bg-black/50 shadow-inner">
          <span className="font-spartan text-5xl font-black text-amber-400">{timeLeft}s</span>
        </div>
      </div>
      <div className="w-full max-w-2xl mb-12 bg-black/40 p-6 rounded-3xl border border-white/5 shadow-2xl">
        <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-4">
          <span className="text-orange-400 flex items-center gap-2"><User className="w-4 h-4"/> You: {myTaps}</span>
          <span className="text-red-500 flex items-center gap-2">Enemy: {oppTaps} <Bot className="w-4 h-4"/></span>
        </div>
        <div className="w-full h-6 bg-black/80 rounded-full overflow-hidden border border-white/10 flex relative">
          <div style={{ width: `${myLeadPct}%` }} className="bg-gradient-to-r from-orange-600 to-yellow-400 transition-all duration-100" />
          <div style={{ width: `${100 - myLeadPct}%` }} className="bg-gradient-to-l from-red-700 to-purple-900 transition-all duration-100" />
        </div>
      </div>
      <div className="relative my-4">
        {tapsEffect.map(t => (
          <span key={t.id} style={{ left: t.x, top: t.y }} className="absolute text-4xl font-black text-amber-300 pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-[ping_0.6s_ease-out_forwards]">+1</span>
        ))}
        <button onClick={handleStrike} className="w-80 h-80 rounded-full bg-[#050308] border-[8px] border-orange-600 flex flex-col items-center justify-center relative select-none active:scale-95 transition-transform duration-75 shadow-[0_0_80px_rgba(234,88,12,0.6)]">
          <span className="font-spartan text-8xl font-black text-orange-500">Λ</span>
          <span className="font-spartan text-sm font-black tracking-widest text-amber-400 mt-6 uppercase">STRIKE</span>
        </button>
      </div>
    </div>
  );

  if (view === 'result') return (
    <div className="w-full max-w-md mx-auto mt-10 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-12 text-center relative z-20">
      {winner === 'you' ? (
        <><Trophy className="w-24 h-24 text-amber-400 mx-auto mb-6" /><h2 className="font-spartan text-5xl font-black text-amber-400 mb-2">VICTORY</h2>
        {window.__spartanPayoutNote && (
          <div className="mt-4 mb-2 text-center font-spartan text-xl md:text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-red-500 to-yellow-300 animate-pulse drop-shadow-[0_0_20px_rgba(234,88,12,0.9)]">
            {window.__spartanPayoutNote}
          </div>
        )}
<div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl py-6 px-8 mb-10 mt-8"><span className="text-4xl font-black text-amber-400">+{getPayoutStr(wager, 2)} $SPARTAN</span></div></>
      ) : winner === 'opp' ? (
        <><Skull className="w-24 h-24 text-red-600 mx-auto mb-6" /><h2 className="font-spartan text-5xl font-black text-red-600 mb-2">SLAIN</h2><div className="bg-red-900/20 border border-red-500/30 rounded-2xl py-6 px-8 mb-10 mt-8"><span className="text-4xl font-black text-red-500">-{wager} $SPARTAN</span></div></>
      ) : (
        <h2 className="font-spartan text-4xl font-black text-neutral-300 tracking-wider mb-10 mt-8">DRAW</h2>
      )}
      <button onClick={() => setView('lobby')} className="w-full py-4.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-sm uppercase">Return to Matchmaking</button>
    </div>
  );
}

// -------------------------------------------------------------
// GAME 2: CHARIOT DEATHRACE (3-Player PvP)
// -------------------------------------------------------------

function ChariotDeathrace({ addWager, addFeed, username, onBack }) {
  const [view, setView] = useState('lobby');
  const [wager, setWager] = useState('1K');
  const [countdown, setCountdown] = useState(3);
  
  const [multiplier, setMultiplier] = useState(1.00);
  const [myStatus, setMyStatus] = useState('racing'); 
  const [myBail, setMyBail] = useState(0);
  const [opp1Status, setOpp1Status] = useState('racing');
  const [opp2Status, setOpp2Status] = useState('racing');
  
  const [crashPoint, setCrashPoint] = useState(0);
  const [opp1Target, setOpp1Target] = useState(0);
  const [opp2Target, setOpp2Target] = useState(0);

  useEffect(() => {
    if (view !== 'countdown') return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const mid = String(window.__spartanMatchId || "bot");
      let seed = 0;
      for (let i = 0; i < mid.length; i++) seed = (seed + mid.charCodeAt(i) * (i + 1)) % 350;
      setCrashPoint(1.1 + seed / 100);
      setOpp1Target(isHumanMatch() ? 99 : (1.0 + Math.random() * 3.5));
      setOpp2Target(99);
      setMultiplier(1.0);
      setMyStatus('racing'); setOpp1Status('racing'); setOpp2Status('racing');
      setView('arena');
    }
  }, [view, countdown]);

  useEffect(() => {
    if (view !== 'arena') return;
    if (multiplier >= crashPoint) {
      if (myStatus === 'racing') setMyStatus('crashed');
      if (opp1Status === 'racing') setOpp1Status('crashed');
      if (opp2Status === 'racing') setOpp2Status('crashed');
      setTimeout(() => settleMatch(), 1500);
      return;
    }
    const timer = setInterval(() => {
      setMultiplier(m => {
        const next = m + 0.02;
        if (opp1Status === 'racing' && next >= opp1Target) setOpp1Status('bailed');
        if (opp2Status === 'racing' && next >= opp2Target) setOpp2Status('bailed');
        return next;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [view, multiplier, opp1Status, opp2Status, myStatus, crashPoint]);

  const handleBail = () => {
    if(myStatus !== 'racing') return;
    setMyStatus('bailed');
    setMyBail(multiplier);
    if (isHumanMatch()) postScore(Math.round(multiplier * 100));
  };
  useEffect(() => {
    if (view !== 'arena') return;
    const id = setInterval(async () => {
      if (!isHumanMatch()) return;
      const v = await getOppScore();
      if (v && v > 0 && v < 9000) {
        setOpp1Target(v / 100);
        setOpp1Status('bailed');
      }
    }, 400);
    return () => clearInterval(id);
  }, [view]);

  const settleMatch = () => {
    setView('result');
    addWager(wager);
    let winner = 'none';
    if (myStatus === 'bailed' && myBail >= (opp1Status==='bailed'?opp1Target:0) && myBail >= (opp2Status==='bailed'?opp2Target:0)) winner = 'you';
    
    if (winner === 'you') {
        payIfWin(wager);


      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
      const payoutStr = wager.includes('M') ? (parseFloat(wager)*2)+'M' : wager.includes('K') ? (parseFloat(wager)*2)+'K' : (parseFloat(wager)*2).toString();
      addFeed(warriorName(), "Chariot Deathrace", wager, `${myBail.toFixed(2)}x`, `+${payoutStr}`, 'win');
    } else {
      addFeed(warriorName(), "Chariot Deathrace", wager, "0.0x", `-${wager}`, 'loss');
    }
  };

  if (view === 'lobby') return (
    <MatchmakingLobby 
      title="Chariot Deathrace" 
      subtitle="1v1 PvP. Same stake. Bail before the crash." 
      icon={TrendingUp} 
      iconColor="from-cyan-600 to-blue-800" 
      onBack={onBack} 
      onStart={(w, room) => startTapOnChain(w, () => { setWager(w); setView('countdown'); }, 'chariot', room)}
    >
      {/* HOW TO PLAY: CHARIOT DEATHRACE */}
      <div className="mt-8 bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <Info className="w-6 h-6 text-cyan-400" />
          <h3 className="font-spartan text-xl font-black text-white uppercase tracking-wider">How to Play Chariot Deathrace</h3>
        </div>

        {/* Visual Diagram */}
        <div className="w-full bg-black/60 border border-cyan-500/20 rounded-2xl p-6 mb-6 relative overflow-hidden">
          <h4 className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Multiplier Survival Mechanics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
            <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
              <span className="text-xs text-neutral-400 font-bold block mb-1">Challenger 1</span>
              <span className="text-lg font-black text-neutral-300">Bailed @ 1.8x</span>
              <span className="text-[10px] text-neutral-500 block mt-1">Too early</span>
            </div>
            <div className="bg-cyan-950/40 border border-cyan-500/40 p-4 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <span className="text-xs text-cyan-400 font-bold block mb-1">You</span>
              <span className="text-lg font-black text-green-400">Bailed @ 3.4x</span>
              <span className="text-[10px] text-green-400 font-bold block mt-1">WINNER (Highest Bail)</span>
            </div>
            <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-xl">
              <span className="text-xs text-red-400 font-bold block mb-1">Challenger 2</span>
              <span className="text-lg font-black text-red-500">Crashed @ 3.8x</span>
              <span className="text-[10px] text-red-500 block mt-1">Eliminated</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600/30 border border-cyan-500 text-cyan-400 text-xs flex items-center justify-center font-bold">1</span>
              Three Enter
            </h5>
            <p className="text-neutral-400 leading-relaxed text-xs">
              Exactly three gladiator chariots queue into the arena. Each puts up the matched stake to build a 3x global pot.
            </p>
          </div>
          <div>
            <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600/30 border border-cyan-500 text-cyan-400 text-xs flex items-center justify-center font-bold">2</span>
              Hold Your Nerve
            </h5>
            <p className="text-neutral-400 leading-relaxed text-xs">
              The speed multiplier rockets upward. Hit "Bail Out" to secure your jump before the crash point claims your chariot.
            </p>
          </div>
          <div>
            <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600/30 border border-cyan-500 text-cyan-400 text-xs flex items-center justify-center font-bold">3</span>
              Last Survivor Takes All
            </h5>
            <p className="text-neutral-400 leading-relaxed text-xs">
              The warrior who stays in the chariot longest without crashing takes the entire 3-player bounty. Greed will cost you everything.
            </p>
          </div>
        </div>
      </div>
    </MatchmakingLobby>
  );

  if (view === 'countdown') return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center relative z-20">
      <h3 className="text-sm uppercase tracking-widest text-neutral-400 font-black mb-4">Opponent locked. Race begins in:</h3>
            {window.__spartanOpponent && window.__spartanOpponent !== "Practice Bot" && (
        <div className="text-center mb-4">
          <div className="font-spartan text-3xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-red-500 to-yellow-300 animate-pulse drop-shadow-[0_0_20px_rgba(234,88,12,0.9)]">
            VS {String(window.__spartanOpponent).slice(0,4)}...{String(window.__spartanOpponent).slice(-4)}
          </div>
        </div>
      )}

      <span className="font-spartan text-[10rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-blue-600 animate-pulse">{countdown}</span>
    </div>
  );

  if (view === 'arena') return (
    <div className="w-full flex flex-col items-center mt-10 relative z-20">
      <div className="w-full max-w-3xl flex justify-between gap-4 mb-10">
        <div className={`flex-1 p-4 rounded-xl text-center border ${myStatus === 'racing' ? 'bg-orange-600/20 border-orange-500' : myStatus === 'crashed' ? 'bg-red-900/50 border-red-500 opacity-50' : 'bg-green-900/50 border-green-500'}`}>
          <span className="text-xs font-black uppercase tracking-widest text-white block mb-1">You</span>
          <span className="text-sm font-bold text-neutral-400">{myStatus === 'racing' ? 'Racing...' : myStatus === 'crashed' ? 'CRASHED' : `Bailed @ ${myBail.toFixed(2)}x`}</span>
        </div>
        <div className={`flex-1 p-4 rounded-xl text-center border ${opp1Status === 'racing' ? 'bg-white/5 border-white/10' : opp1Status === 'crashed' ? 'bg-red-900/50 border-red-500 opacity-50' : 'bg-green-900/50 border-green-500'}`}>
          <span className="text-xs font-black uppercase tracking-widest text-white block mb-1">Enemy 1</span>
          <span className="text-sm font-bold text-neutral-400">{opp1Status === 'racing' ? 'Racing...' : opp1Status === 'crashed' ? 'CRASHED' : `Bailed @ ${opp1Target.toFixed(2)}x`}</span>
        </div>

      </div>

      <div className={`w-80 h-80 mx-auto rounded-full flex flex-col items-center justify-center mb-10 shadow-[0_0_80px_rgba(34,211,238,0.2)] transition-all border-8 ${multiplier >= crashPoint ? 'bg-red-900 border-red-600 scale-110' : 'bg-black/50 border-cyan-500'}`}>
        {multiplier >= crashPoint ? <Flame className="w-16 h-16 text-red-500 mb-2" /> : <TrendingUp className="w-16 h-16 text-cyan-400 mb-2" />}
        <span className={`font-spartan text-7xl font-black ${multiplier >= crashPoint ? 'text-red-500' : 'text-cyan-400'}`}>{multiplier.toFixed(2)}x</span>
      </div>

      <button onClick={handleBail} disabled={myStatus !== 'racing' || multiplier >= crashPoint} className="w-full max-w-md py-6 rounded-2xl bg-orange-600 font-black text-2xl tracking-widest uppercase hover:bg-orange-500 shadow-[0_0_30px_rgba(234,88,12,0.6)] text-white active:scale-95 transition-transform disabled:opacity-50">
        {myStatus === 'racing' ? "Bail Out" : myStatus === 'bailed' ? "Awaiting Crash..." : "Dead"}
      </button>
    </div>
  );

  if (view === 'result') {
    const iWon = myStatus === 'bailed' && myBail >= (opp1Status==='bailed'?opp1Target:0) && myBail >= (opp2Status==='bailed'?opp2Target:0);
    return (
      <div className="w-full max-w-md mx-auto mt-10 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-12 text-center relative z-20">
        <h2 className={`font-spartan text-4xl font-black tracking-wider mb-6 ${iWon ? 'text-green-400' : 'text-red-500'}`}>{iWon ? 'LAST SURVIVOR' : 'DEFEATED'}</h2>{window.__spartanPayoutNote && (<div className="mb-6 font-spartan text-xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-red-500 to-yellow-300 animate-pulse">{window.__spartanPayoutNote}</div>)}
        <div className="bg-white/5 border border-white/10 rounded-2xl py-6 px-8 mb-8">
           <span className="text-xs font-black text-neutral-400 uppercase tracking-widest block mb-2">{iWon ? 'Pot claimed' : 'Wager Lost'}</span>
           <span className={`text-4xl font-black ${iWon ? 'text-green-400' : 'text-red-500'}`}>{iWon ? '+' : '-'}{iWon ? (wager.includes('M') ? (parseFloat(wager)*2)+'M' : wager.includes('K') ? (parseFloat(wager)*2)+'K' : parseFloat(wager)*2) : wager} $SPARTAN</span>
        </div>
        <button onClick={() => { setView('lobby'); setCountdown(3); }} className="w-full py-4 bg-white/10 rounded-xl text-white font-black text-sm uppercase tracking-widest">Race Again</button>
      </div>
    );
  }
}

// -------------------------------------------------------------
// GAME 3: PHALANX STANCE (1v1 Tactical)
// -------------------------------------------------------------

function PhalanxStance({ addWager, addFeed, username, onBack }) {
  const [view, setView] = useState('lobby');
  const [wager, setWager] = useState('100');
  const [countdown, setCountdown] = useState(3);
  const [timer, setTimer] = useState(10);
  const [step, setStep] = useState('idle');
  const [phase, setPhase] = useState(1);
  const [round, setRound] = useState(1);
  const [poison, setPoison] = useState([]);
  const [guess, setGuess] = useState(null);
  const [myHits, setMyHits] = useState(0);
  const [oppHits, setOppHits] = useState(0);
  const [picker, setPicker] = useState('');
  const [spinOn, setSpinOn] = useState(false);
  const [over, setOver] = useState(null);
  const [note, setNote] = useState('');
  const me = () => myPk();
  const iPick = () => picker && picker === me();
  useEffect(() => {
    if (view !== 'countdown') return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    const a = me();
    const b = String(window.__spartanOpponent || "opp");
    const first = [a, b].sort()[0] || a;
    setPicker(first); setPhase(1); setRound(1); setMyHits(0); setOppHits(0);
    setPoison([]); setGuess(null); setOver(null);
    setStep('pickPoison'); setTimer(10); setView('arena');
    patchState({ picker: first, step: 'pickPoison', phase: 1, round: 1, poison: [], guess: null, hits: {} });
  }, [view, countdown]);
  useEffect(() => {
    if (view !== 'arena' || over) return;
    const id = setInterval(async () => {
      const st = await readState();
      if (!st || !st.step) return;
      if (st.picker) setPicker(st.picker);
      if (st.phase) setPhase(st.phase);
      if (st.round) setRound(st.round);
      if (Array.isArray(st.poison) && st.poison.length) setPoison(st.poison);
      if (st.guess != null) setGuess(st.guess);
      if (st.hits) {
        setMyHits(Number(st.hits[me()] || 0));
        const other = Object.keys(st.hits).find((k) => k && k !== me());
        if (other) setOppHits(Number(st.hits[other] || 0));
      }
      if (st.step === 'spin' && step !== 'spin') {
        setStep('spin'); setSpinOn(true);
        setTimeout(() => { setSpinOn(false); setStep('guess'); setTimer(10); patchState({ step: 'guess' }); }, 2200);
      } else if (st.step && st.step !== step && st.step !== 'spin') setStep(st.step);
      if (st.over) { setOver(st.over); finish(st.over === me()); }
    }, 350);
    return () => clearInterval(id);
  }, [view, step, over]);
  useEffect(() => {
    if (view !== 'arena' || over) return;
    if (step !== 'pickPoison' && step !== 'guess') return;
    if (timer <= 0) {
      if (step === 'pickPoison' && iPick() && poison.length < (phase === 1 ? 1 : 2)) autoPoison();
      return;
    }
    const t = setTimeout(() => setTimer((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [view, step, timer, over]);
  const need = () => 1;
  const autoPoison = () => {
    const n = need(); const set = [];
    while (set.length < n) { const c = 1 + Math.floor(Math.random() * 3); if (!set.includes(c)) set.push(c); }
    lockPoison(set);
  };
  const tapCup = (n) => {
    if (over) return;
    if (step === 'pickPoison' && iPick()) {
      const max = need();
      setPoison([n]); lockPoison([n]); return;
      setPoison((prev) => {
        let next = prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n];
        if (next.length > max) next = next.slice(next.length - max);
        if (next.length === max) setTimeout(() => lockPoison(next), 0);
        return next;
      });
      return;
    }
    if (step === 'guess' && !iPick()) { setGuess(n); resolveGuess(n); }
  };
  const lockPoison = (cups) => {
    const p = cups && cups.length ? cups : poison;
    if (p.length < need()) return;
    setPoison(p); setGuess(null); setStep('spin'); setSpinOn(true);
    patchState({ poison: p, step: 'spin', guess: null });
    setTimeout(() => { setSpinOn(false); setStep('guess'); setTimer(10); patchState({ step: 'guess' }); }, 2200);
  };
  const resolveGuess = async (g) => {
    const st = await readState();
    const pois = (st.poison && st.poison.length ? st.poison : poison);
    const hit = pois.includes(g);
    const hits = Object.assign({}, st.hits || {});
    hits[me()] = Number(hits[me()] || 0) + (hit ? 1 : 0);
    setGuess(null); setMyHits(hits[me()] || 0); setNote(hit ? "POISON" : "SAFE"); setStep('reveal');
    if ((hits[me()] || 0) >= 3) { patchState({ step: 'reveal', guess: g, hits, over: picker }); setOver(picker); finish(picker === me()); return; }
    const nextRound = (st.round || round) + 1;
    const nextPhase = 1;
    const nextPicker = me();
    patchState({ step: 'reveal', guess: g, hits, round: nextRound, phase: nextPhase });
    setTimeout(() => {
      setRound(nextRound); setPhase(nextPhase); setPicker(nextPicker);
      setPoison([]); setGuess(null); setNote(''); setStep('pickPoison'); setTimer(10);
      patchState({ picker: nextPicker, step: 'pickPoison', poison: [], guess: null, round: nextRound, phase: nextPhase });
    }, 2200);
  };
  const finish = (iWon) => {
    if (view === 'result') return;
    setView('result'); addWager(wager);
    if (iWon) { payIfWin(wager); confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } }); addFeed(warriorName(), "Poison Pick", wager, "2.0x", "+" + (parseWager(wager) * 2), "win"); }
    else {
      if (typeof window.__spartanSetReady === "function") {
        const stakeL = Number(String(wager).replace(/[^0-9.]/g, "")) || 0;
        window.__spartanSetReady((prev) => Math.max(0, Number(prev) - stakeL));
      }
      addFeed(warriorName(), "Poison Pick", wager, "0.0x", "-" + wager, "loss");
    }
  };
  if (view === 'lobby') return (
    <MatchmakingLobby title="Poison Pick" subtitle="Two cups. One poison. First to 3 poison drinks loses." icon={Wine} iconColor="from-green-600 to-teal-800" onBack={onBack} onStart={(w, room) => startTapOnChain(w, () => { setWager(w); setView('countdown'); }, 'phalanx', room)}>
            <div className="mt-8 bg-black/50 border border-white/10 rounded-3xl p-8">
        <h3 className="font-spartan text-xl font-black text-white uppercase mb-6">How to Play Poison Pick</h3>
        <div className="grid md:grid-cols-3 gap-6 text-sm text-neutral-300 leading-relaxed">
          <div>
            <h4 className="text-white font-black uppercase tracking-widest mb-2">1. Two cups. One is death.</h4>
            <p>A 10-second clock starts. One warrior is the hider. They tap exactly one cup. That cup is poison. The other cup is safe. You do not get a second poison later. Every round is the same: two cups, one kill.</p>
          </div>
          <div>
            <h4 className="text-white font-black uppercase tracking-widest mb-2">2. The cups forget.</h4>
            <p>After the hide, the cups shuffle so the guesser cannot track your tap. When they stop, the guesser has 10 seconds to pick a cup. Same two cups on both screens. Same clock. No tells.</p>
          </div>
          <div>
            <h4 className="text-white font-black uppercase tracking-widest mb-2">3. Three sips and you fall.</h4>
            <p>Safe cup: you live, roles swap, next round. Poison cup: you take a mark. First warrior to drink poison three times loses the match. The other takes the 95 / 3 / 2 pot. Rounds do not cap. You play until somebody hits 3.</p>
          </div>
        </div>
      </div>
</MatchmakingLobby>
  );
  if (view === 'countdown') return (<div className="h-[60vh] flex flex-col items-center justify-center text-center"><h3 className="text-sm uppercase tracking-widest text-neutral-400 font-black mb-4">Opponent locked. Poison Pick begins in</h3>            {window.__spartanOpponent && window.__spartanOpponent !== "Practice Bot" && (
        <div className="text-center mb-4">
          <div className="font-spartan text-3xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-red-500 to-yellow-300 animate-pulse drop-shadow-[0_0_20px_rgba(234,88,12,0.9)]">
            VS {String(window.__spartanOpponent).slice(0,4)}...{String(window.__spartanOpponent).slice(-4)}
          </div>
        </div>
      )}
<span className="font-spartan text-[10rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-green-400 to-teal-600 animate-pulse">{countdown}</span></div>);
  if (view === 'arena') return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center mt-8">
      <div className="w-full flex justify-between items-center mb-6 bg-black/50 border border-white/10 rounded-2xl p-5">
        <div className="text-center"><span className="text-[10px] uppercase text-green-400 font-black block">You</span><span className="font-spartan text-4xl text-white">{myHits}/3</span></div>
        <div className="text-center"><div className="font-spartan text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-red-500 to-yellow-300 animate-pulse">{timer}s</div><div className="text-[10px] uppercase text-neutral-500 font-black">Round {round} · 1 poison · 2 cups</div></div>
        <div className="text-center"><span className="text-[10px] uppercase text-red-400 font-black block">Enemy</span><span className="font-spartan text-4xl text-white">{oppHits}/3</span></div>
      </div>
      <p className="mb-6 font-black uppercase tracking-widest text-orange-300 text-sm text-center">
        {step === 'pickPoison' && iPick() && "You hide the poison. Tap one cup."}
        {step === 'pickPoison' && !iPick() && "Opponent is hiding the poison..."}
        {step === 'spin' && "Cups are spinning..."}
        {step === 'guess' && !iPick() && "Pick a cup. Do not drink the poison."}
        {step === 'guess' && iPick() && "Opponent is choosing a cup..."}
        {step === 'reveal' && note}
      </p>
      <div className={"grid grid-cols-2 gap-6 w-full max-w-lg " + (spinOn ? "animate-pulse" : "")}>
        {[1,2].map((n) => (
          <button key={n} onClick={() => tapCup(n)} className="h-40 rounded-3xl border-2 border-white/15 bg-black/50 flex flex-col items-center justify-center hover:border-white/30">
            <span className="font-spartan text-5xl text-amber-300">Cup</span>
            <span className="mt-2 text-xs font-black uppercase tracking-widest text-white">{n}</span>
          </button>
        ))}
      </div>
      {step === 'pickPoison' && iPick() && (<button onClick={() => lockPoison(poison)} className="mt-8 w-full max-w-md py-4 rounded-2xl bg-orange-600 font-black uppercase tracking-widest text-white">Lock poison</button>)}
    </div>
  );
  if (view === 'result') return (
    <div className="w-full max-w-md mx-auto mt-10 bg-black/60 border border-white/10 rounded-[2rem] p-12 text-center">
      {over === me() ? (<><Trophy className="w-24 h-24 text-green-400 mx-auto mb-6" /><h2 className="font-spartan text-5xl font-black text-green-400 mb-2">VICTORY</h2><div className="bg-green-500/10 border border-green-500/30 rounded-2xl py-6 mb-6"><span className="text-4xl font-black text-green-400">+{parseWager(wager)*2} $SPARTAN</span></div>{window.__spartanPayoutNote && <div className="mb-6 font-spartan text-xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-red-500 to-yellow-300 animate-pulse">{window.__spartanPayoutNote}</div>}</>) : (<><Skull className="w-24 h-24 text-red-600 mx-auto mb-6" /><h2 className="font-spartan text-5xl font-black text-red-600 mb-2">SLAIN</h2><div className="bg-red-900/20 border border-red-500/30 rounded-2xl py-6 mb-6"><span className="text-4xl font-black text-red-500">-{wager} $SPARTAN</span></div></>)}
      <button onClick={() => { setView('lobby'); setCountdown(3); }} className="w-full py-4.5 rounded-xl bg-white/10 text-white font-black text-sm uppercase">Return to Matchmaking</button>
    </div>
  );
}

function BonesOfSparta({ addWager, addFeed, username, onBack }) {
  const [view, setView] = useState('lobby');
  const [wager, setWager] = useState('100');
  const [countdown, setCountdown] = useState(3);
  
  const [myRoll, setMyRoll] = useState(0);
  const [oppRoll, setOppRoll] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (view !== 'countdown') return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setMyRoll(0); setOppRoll(0); setView('arena');
    }
  }, [view, countdown]);

  const handleRoll = () => {
    setIsRolling(true);
    const anim = setInterval(() => {
      setMyRoll(Math.floor(Math.random() * 100) + 1);
      setOppRoll(Math.floor(Math.random() * 100) + 1);
    }, 50);

    setTimeout(async () => {
      clearInterval(anim);
      let m = Math.floor(Math.random() * 100) + 1;
      let o;
      if (!isHumanMatch()) {
        o = Math.floor(Math.random() * 100) + 1;
        if (m === o) m = Math.min(100, m + 1);
      } else {
        postScore(m);
        o = await waitOppScore(function(n){ return n >= 1 && n <= 100; }, 120);
        if (!o) { setIsRolling(false); alert("Waiting for opponent toss. Tap Toss again."); return; }
      }
      setMyRoll(m); setOppRoll(o);
      setIsRolling(false);
      
      setTimeout(() => {
        addWager(wager);
        if (m > o) {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          const payoutStr = wager.includes('M') ? (parseFloat(wager)*2)+'M' : wager.includes('K') ? (parseFloat(wager)*2)+'K' : (parseFloat(wager)*2).toString();
          payIfWin(wager);
          addFeed(warriorName(), "Bones of Sparta", wager, "2.0x", `+${payoutStr}`, 'win');
        } else {
          addFeed(warriorName(), "Bones of Sparta", wager, "0.0x", `-${wager}`, 'loss');
        }
        setView('result');
      }, 2000);
    }, 1500);
  };

  if (view === 'lobby') return (
    <MatchmakingLobby 
      title="Bones of Sparta" 
      subtitle="1v1 PvP High-Roller Dice Duel." 
      icon={Dices} 
      iconColor="from-fuchsia-600 to-purple-800" 
      onBack={onBack} 
      onStart={(w, room) => startTapOnChain(w, () => { setWager(w); setView('countdown'); }, 'bones', room)}
    >
      {/* HOW TO PLAY: BONES OF SPARTA */}
      <div className="mt-8 bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <Info className="w-6 h-6 text-fuchsia-400" />
          <h3 className="font-spartan text-xl font-black text-white uppercase tracking-wider">How to Play Bones of Sparta</h3>
        </div>

        {/* Visual Diagram */}
        <div className="w-full bg-black/60 border border-fuchsia-500/20 rounded-2xl p-6 mb-6 relative overflow-hidden">
          <h4 className="text-xs font-black uppercase tracking-widest text-fuchsia-400 mb-4 flex items-center gap-2">
            <Dices className="w-4 h-4" /> 1v1 High-Roll Showdown
          </h4>
          <div className="grid grid-cols-2 gap-4 text-center items-center max-w-md mx-auto">
            <div className="bg-fuchsia-950/30 border border-fuchsia-500/40 p-4 rounded-xl shadow-[0_0_15px_rgba(217,70,239,0.2)]">
              <span className="text-xs text-fuchsia-300 font-bold block mb-1">Your Toss</span>
              <span className="font-spartan text-5xl font-black text-green-400">88</span>
              <span className="text-[10px] text-green-400 font-bold block mt-1">WINNER</span>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
              <span className="text-xs text-neutral-400 font-bold block mb-1">Enemy Toss</span>
              <span className="font-spartan text-5xl font-black text-neutral-500">42</span>
              <span className="text-[10px] text-red-500 font-bold block mt-1">DEFEATED</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-fuchsia-600/30 border border-fuchsia-500 text-fuchsia-400 text-xs flex items-center justify-center font-bold">1</span>
              Match Wager
            </h5>
            <p className="text-neutral-400 leading-relaxed text-xs">
              Select your stake level. Enter public matchmaking to find a rival or challenge a friend directly via private arena room code.
            </p>
          </div>
          <div>
            <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-fuchsia-600/30 border border-fuchsia-500 text-fuchsia-400 text-xs flex items-center justify-center font-bold">2</span>
              Simultaneous Toss
            </h5>
            <p className="text-neutral-400 leading-relaxed text-xs">
              Both warriors shake and slam their carved bone cups at the same instant. Each die generates a verifiable random outcome from 1 to 100.
            </p>
          </div>
          <div>
            <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-fuchsia-600/30 border border-fuchsia-500 text-fuchsia-400 text-xs flex items-center justify-center font-bold">3</span>
              High Roll Takes All
            </h5>
            <p className="text-neutral-400 leading-relaxed text-xs">
              Highest score takes the entire duel bounty directly to their session balance. Ties prompt an immediate sudden death re-roll.
            </p>
          </div>
        </div>
      </div>
    </MatchmakingLobby>
  );

  if (view === 'countdown') return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center relative z-20">
      <h3 className="text-sm uppercase tracking-widest text-neutral-400 font-black mb-4">Opponent Matched. Grab the Bones.</h3>
            {window.__spartanOpponent && window.__spartanOpponent !== "Practice Bot" && (
        <div className="text-center mb-4">
          <div className="font-spartan text-3xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-red-500 to-yellow-300 animate-pulse drop-shadow-[0_0_20px_rgba(234,88,12,0.9)]">
            VS {String(window.__spartanOpponent).slice(0,4)}...{String(window.__spartanOpponent).slice(-4)}
          </div>
        </div>
      )}

      <span className="font-spartan text-[10rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-fuchsia-400 to-purple-600 animate-pulse">{countdown}</span>
    </div>
  );

  if (view === 'arena') return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center mt-20 relative z-20">
       <div className="w-full flex justify-between gap-8 mb-12">
          <div className="flex-1 bg-black/60 border border-white/10 rounded-[2rem] p-10 text-center shadow-2xl">
             <span className="text-xs font-black uppercase tracking-widest text-fuchsia-400 block mb-6">Your Roll</span>
             <span className={`font-spartan text-[8rem] leading-none font-black ${myRoll > 0 && !isRolling && myRoll > oppRoll ? 'text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,0.6)]' : 'text-white'}`}>{myRoll || '-'}</span>
          </div>
          <div className="flex flex-col justify-center font-spartan text-4xl font-black text-neutral-600">VS</div>
          <div className="flex-1 bg-black/60 border border-white/10 rounded-[2rem] p-10 text-center shadow-2xl">
             <span className="text-xs font-black uppercase tracking-widest text-red-500 block mb-6">Enemy Roll</span>
             <span className={`font-spartan text-[8rem] leading-none font-black ${oppRoll > 0 && !isRolling && oppRoll > myRoll ? 'text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'text-white'}`}>{oppRoll || '-'}</span>
          </div>
       </div>
       {myRoll === 0 || isRolling ? (
         <button onClick={handleRoll} disabled={isRolling} className="w-full max-w-md py-6 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 font-black text-2xl tracking-widest uppercase hover:brightness-110 shadow-[0_0_30px_rgba(192,132,252,0.6)] text-white disabled:animate-pulse">
            {isRolling ? "Rolling..." : "Toss the Bones"}
         </button>
       ) : (
         <h2 className="font-spartan text-4xl font-black uppercase tracking-widest text-white mt-4">Resolving...</h2>
       )}
    </div>
  );

  if (view === 'result') return (
    <div className="w-full max-w-md mx-auto mt-10 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-12 text-center relative z-20">
      {myRoll > oppRoll ? (
        <><Trophy className="w-24 h-24 text-fuchsia-400 mx-auto mb-6" /><h2 className="font-spartan text-5xl font-black text-fuchsia-400 mb-2">VICTORY</h2>{window.__spartanPayoutNote && (<div className="mb-6 font-spartan text-xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-red-500 to-yellow-300 animate-pulse">{window.__spartanPayoutNote}</div>)}<div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl py-6 px-8 mb-10 mt-8"><span className="text-4xl font-black text-fuchsia-400">+{wager.includes('M') ? (parseFloat(wager)*2)+'M' : wager.includes('K') ? (parseFloat(wager)*2)+'K' : parseFloat(wager)*2} $SPARTAN</span></div></>
      ) : (
        <><Skull className="w-24 h-24 text-red-600 mx-auto mb-6" /><h2 className="font-spartan text-5xl font-black text-red-600 mb-2">SLAIN</h2><div className="bg-red-900/20 border border-red-500/30 rounded-2xl py-6 px-8 mb-10 mt-8"><span className="text-4xl font-black text-red-500">-{wager} $SPARTAN</span></div></>
      )}
      <button onClick={() => { setView('lobby'); setCountdown(3); }} className="w-full py-4.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-sm uppercase">Return to Matchmaking</button>
    </div>
  );
}

// -------------------------------------------------------------
// GAME 5: THE 300 STAND & JACKPOT
// -------------------------------------------------------------

function The300Stand({ addWager, addFeed, username, onBack }) {
  const [view, setView] = useState('lobby');
  const [wave, setWave] = useState(1);
  const [timeToBlock, setTimeToBlock] = useState(3);
  const [blocked, setBlocked] = useState(false);
  const [status, setStatus] = useState('');

  const startStand = () => { setWave(1); setTimeToBlock(3); setBlocked(false); setStatus(''); () => { alert('The 300 Stand and Oracle Jackpot are locked until live pots are ready.'); }; };

  useEffect(() => {
    if (view !== 'stand' || status !== '') return;
    if (timeToBlock > 0 && !blocked) {
      const t = setTimeout(() => setTimeToBlock(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    } else if (timeToBlock === 0 && !blocked) {
      setStatus('dead');
      addWager('10K');
      addFeed(warriorName(), "The 300 Stand", "10K", "0.0x", "-10K", 'loss');
    }
  }, [view, timeToBlock, blocked, status]);

  const handleBlock = () => {
    if (status !== '' || blocked) return;
    setBlocked(true);
    if (wave === 5) {
      setStatus('won');
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      addWager('10K');
      addFeed(warriorName(), "The 300 Stand", "10K", "10.0x", "+100K", 'win');
    } else {
      setTimeout(() => { setWave(w => w + 1); setTimeToBlock(3); setBlocked(false); }, 1500);
    }
  };

  if (view === 'lobby') {
    return (
      <div className="w-full max-w-4xl mx-auto pb-16 pt-6 px-4 relative z-20">
        <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative text-center">
          <button onClick={onBack} className="absolute left-6 top-6 text-neutral-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full"><ChevronRight className="w-5 h-5 rotate-180" /></button>
          <Skull className="w-20 h-20 text-yellow-500 mx-auto mb-4 drop-shadow-[0_0_15px_#eab308]" />
          <h2 className="font-spartan text-3xl font-black text-white tracking-widest mb-2 uppercase">The 300 Stand</h2>
          <p className="text-sm text-neutral-400 mb-8 font-medium">Survive 5 waves of arrows. Buy-in: 10K $SPARTAN.</p>
          <button onClick={startStand} className="w-full max-w-md mx-auto py-4.5 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 font-black text-sm tracking-widest uppercase hover:brightness-110 shadow-[0_0_30px_rgba(234,179,8,0.4)] text-white block">
            Enter The Pass (10K Stake)
          </button>
        </div>

        {/* HOW TO PLAY: THE 300 STAND */}
        <div className="mt-8 bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
            <Info className="w-6 h-6 text-yellow-500" />
            <h3 className="font-spartan text-xl font-black text-white uppercase tracking-wider">How to Play The 300 Stand</h3>
          </div>

          <div className="w-full bg-black/60 border border-yellow-500/20 rounded-2xl p-6 mb-6 text-center">
            <h4 className="text-xs font-black uppercase tracking-widest text-yellow-500 mb-3 flex items-center justify-center gap-2">
              <Crosshair className="w-4 h-4" /> Survival Wave Progression
            </h4>
            <div className="flex justify-between max-w-lg mx-auto py-2">
              {[1, 2, 3, 4, 5].map(w => (
                <div key={w} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full border border-yellow-500/50 flex items-center justify-center font-bold text-yellow-400 mb-1 ${w === 5 ? 'bg-gradient-to-br from-yellow-600 to-amber-800 shadow-[0_0_15px_#eab308]' : 'bg-black'}`}>
                    W{w}
                  </div>
                  <span className={`text-[10px] ${w === 5 ? 'text-yellow-400 font-black' : 'text-neutral-400'}`}>{w === 5 ? '10x Grand Pot' : 'Pass'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-yellow-600/30 border border-yellow-500 text-yellow-400 text-xs flex items-center justify-center font-bold">1</span>
                Buy-in to the Phalanx
              </h5>
              <p className="text-neutral-400 leading-relaxed text-xs">
                Enter the Hot Gates with a standard 10,000 $SPARTAN contribution.
              </p>
            </div>
            <div>
              <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-yellow-600/30 border border-yellow-500 text-yellow-400 text-xs flex items-center justify-center font-bold">2</span>
                Block the Volleys
              </h5>
              <p className="text-neutral-400 leading-relaxed text-xs">
                Arrows blot out the sun. Tap 'Raise Shield' within the 3-second reaction timer to survive each incoming wave.
              </p>
            </div>
            <div>
              <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-yellow-600/30 border border-yellow-500 text-yellow-400 text-xs flex items-center justify-center font-bold">3</span>
                10x Immortal Treasury
              </h5>
              <p className="text-neutral-400 leading-relaxed text-xs">
                Survive all 5 waves to claim the grand 100,000 $SPARTAN payout. Failure on any wave forfeits your tribute.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative mt-10 z-20 text-center">
      <h2 className="font-spartan text-xl font-black text-amber-500 uppercase tracking-widest mb-6">Wave {wave} / 5</h2>
      {status === 'dead' ? (
        <div>
          <Crosshair className="w-24 h-24 text-red-600 mx-auto mb-4 animate-pulse" />
          <h2 className="font-spartan text-4xl font-black text-red-500 uppercase tracking-widest mb-6">PIERCED!</h2>
          <button onClick={() => setView('lobby')} className="w-full py-4 bg-white/10 rounded-xl text-white font-black text-sm uppercase tracking-widest">Return to Camp</button>
        </div>
      ) : status === 'won' ? (
        <div>
          <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_20px_#facc15]" />
          <h2 className="font-spartan text-4xl font-black text-yellow-400 uppercase tracking-widest mb-2">IMMORTAL</h2>
          <p className="text-yellow-200 font-bold mb-6">You survived the stand. +100K $SPARTAN</p>
          <button onClick={() => setView('lobby')} className="w-full py-4 bg-white/10 rounded-xl text-white font-black text-sm uppercase tracking-widest">Return to Camp</button>
        </div>
      ) : (
        <div>
          <div className="w-32 h-32 mx-auto border-4 border-red-500 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.4)]">
            <span className="font-spartan text-5xl font-black text-red-500">{timeToBlock}</span>
          </div>
          <button onClick={handleBlock} disabled={blocked} className={`w-full py-6 rounded-2xl font-black text-2xl tracking-widest uppercase transition-all ${blocked ? 'bg-green-600 border-green-400 text-white' : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)]'}`}>
            {blocked ? "SHIELD RAISED" : "RAISE SHIELD"}
          </button>
        </div>
      )}
    </div>
  );
}

function OracleJackpot({ username, onBack }) {
  const [view, setView] = useState('lobby');
  const [drawing, setDrawing] = useState(false);

  const drawJackpot = () => {
    setDrawing(true);
    setTimeout(() => { setDrawing(false); setView('result'); }, 3000);
  };

  if (view === 'lobby') {
    return (
      <div className="w-full max-w-4xl mx-auto pb-16 pt-6 px-4 relative z-20">
        <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative text-center">
          <button onClick={onBack} className="absolute left-6 top-6 text-neutral-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full"><ChevronRight className="w-5 h-5 rotate-180" /></button>
          <Zap className={`w-20 h-20 text-purple-400 mx-auto mb-4 drop-shadow-[0_0_15px_#c084fc] ${drawing ? 'animate-ping' : ''}`} />
          <h2 className="font-spartan text-3xl font-black text-white tracking-widest mb-2 uppercase">Oracle's Jackpot</h2>
          <p className="text-sm text-neutral-400 mb-8 font-medium">Global Accumulated Treasury: 1,250,000 $SPARTAN</p>
          <button onClick={drawJackpot} disabled={drawing} className="w-full max-w-md mx-auto py-4.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 font-black text-sm tracking-widest uppercase hover:brightness-110 shadow-[0_0_30px_rgba(168,85,247,0.4)] text-white disabled:opacity-50 block">
            {drawing ? "Consulting Oracle..." : "Buy Ticket (5K $SPARTAN)"}
          </button>
        </div>

        {/* HOW TO PLAY: ORACLE'S JACKPOT */}
        <div className="mt-8 bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
            <Info className="w-6 h-6 text-purple-400" />
            <h3 className="font-spartan text-xl font-black text-white uppercase tracking-wider">How to Play Oracle's Jackpot</h3>
          </div>

          <div className="w-full bg-black/60 border border-purple-500/20 rounded-2xl p-6 mb-6 text-center">
            <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-3 flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> 3% Global Protocol Inflow
            </h4>
            <p className="text-xs text-neutral-300 max-w-lg mx-auto leading-relaxed">
              Every single PVP duel in the Colosseum, Chariot track, and Dice tables deposits a mandatory 3% tribute directly into this pot.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600/30 border border-purple-500 text-purple-400 text-xs flex items-center justify-center font-bold">1</span>
                Acquire Entries
              </h5>
              <p className="text-neutral-400 leading-relaxed text-xs">
                Each 5,000 $SPARTAN ticket grants one permanent cryptographic entry for the current epoch's drawing.
              </p>
            </div>
            <div>
              <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600/30 border border-purple-500 text-purple-400 text-xs flex items-center justify-center font-bold">2</span>
                Oracle Selection
              </h5>
              <p className="text-neutral-400 leading-relaxed text-xs">
                At the conclusion of the epoch, the Solana on-chain VRF program picks a single winner at random.
              </p>
            </div>
            <div>
              <h5 className="font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600/30 border border-purple-500 text-purple-400 text-xs flex items-center justify-center font-bold">3</span>
                Total Treasury Payout
              </h5>
              <p className="text-neutral-400 leading-relaxed text-xs">
                100% of the gathered multi-million $SPARTAN treasury transfers directly into the victorious gladiator's wallet.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto mt-10 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-12 text-center relative z-20">
      <Skull className="w-24 h-24 text-neutral-600 mx-auto mb-6" />
      <h2 className="font-spartan text-3xl font-black text-neutral-400 tracking-wider mb-2 uppercase">NOT CHOSEN</h2>
      <p className="text-neutral-500 font-medium mb-8">The Oracle favored another warrior this cycle.</p>
      <button onClick={() => setView('lobby')} className="w-full py-4 bg-white/10 rounded-xl text-white font-black text-sm uppercase tracking-widest">Return</button>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
