import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Shield, Trophy, Wallet, Skull, Bot, 
  Swords, Flame, Zap, Search, LayoutDashboard, 
  Dices, ScrollText, User, Lock, Coins, ChevronRight,
  TrendingUp, Activity, History, MessageCircle, 
  Twitter, BarChart3, Lightbulb, Users, Key
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [username, setUsername] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [tempName, setTempName] = useState('');
  
  const [balanceLocked, setBalanceLocked] = useState(0);
  const [balanceReal, setBalanceReal] = useState(0);
  const [wageredTotal, setWageredTotal] = useState(0);
  
  const [view, setView] = useState('home');
  const [category, setCategory] = useState('Lobby');
  
  const [liveFeed, setLiveFeed] = useState([
    { id: 1, user: "XERXES_99", game: "Chariot Crash", wager: "250", multiplier: "2.0x", payout: "+500", type: 'win' },
    { id: 2, user: "LEONIDAS", game: "Colosseum Tap", wager: "10K", multiplier: "0.0x", payout: "-10K", type: 'loss' },
    { id: 3, user: "ARES_WRATH", game: "Leonidas' Dice", wager: "500", multiplier: "3.5x", payout: "+1750", type: 'win' },
    { id: 4, user: "BLOOD_GHOST", game: "Shield Wall", wager: "50K", multiplier: "0.5x", payout: "-25K", type: 'loss' },
    { id: 5, user: "IMMORTAL", game: "The 300 Stand", wager: "1M", multiplier: "10.0x", payout: "+10M", type: 'win' },
  ]);

  const connectWallet = async () => {
    if (window?.solana?.isPhantom) {
      try {
        const resp = await window.solana.connect();
        setWallet(resp.publicKey.toString().slice(0,4) + '...' + resp.publicKey.toString().slice(-4));
      } catch {
        setWallet("SPRT...9xK2");
      }
    } else {
      setWallet("7xK9...3bF2");
    }
    if (!username) setShowSignup(true);
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (tempName.trim().length > 0) {
      setUsername(tempName.toUpperCase());
      setBalanceLocked(1000);
      setShowSignup(false);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 }, colors: ['#EA580C', '#F59E0B', '#B91C1C'] });
      addFeed(tempName.toUpperCase(), "Arena Entry", 0, "-", "+1000 Bonus", "win");
    }
  };

  const addFeed = (user, game, wager, multiplier, payout, type) => {
    setLiveFeed(prev => [{ id: Date.now(), user, game, wager, multiplier, payout, type }, ...prev].slice(0, 8));
  };

  const addWager = (amount) => {
    // Parse 'K' and 'M' back to numbers for logic if needed, but keeping simple for UI
    const numericAmount = typeof amount === 'string' ? 
      (amount.includes('M') ? parseFloat(amount) * 1000000 : 
       amount.includes('K') ? parseFloat(amount) * 1000 : parseFloat(amount)) 
      : amount;
      
    const newTotal = wageredTotal + numericAmount;
    setWageredTotal(newTotal);
    if (newTotal >= 1000 && balanceLocked > 0) {
      setBalanceReal(prev => prev + balanceLocked);
      setBalanceLocked(0);
      addFeed(username, "Bonus Unlock", 1000, "-", "+1000 Real", "win");
    }
  };

  const SidebarItem = ({ icon: Icon, label, target, active }) => (
    <button 
      onClick={() => setView(target)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        active 
        ? 'bg-neutral-800/80 text-white shadow-[0_0_15px_rgba(234,88,12,0.15)] border border-orange-500/20' 
        : 'hover:bg-neutral-800/40 text-neutral-400 hover:text-neutral-200 border border-transparent'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-amber-500' : ''}`} />
      <span className="font-bold text-sm tracking-wide">{label}</span>
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
      onClick={() => setView(target)}
      className="relative w-full aspect-[4/5] rounded-2xl cursor-pointer group p-[1px] transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(234,88,12,0.4)] overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-white/20 group-hover:from-orange-500/80 group-hover:via-purple-500/80 group-hover:to-amber-500/80 transition-colors duration-500" />
      
      <div className={`relative h-full w-full rounded-[15px] overflow-hidden ${bgBase} flex flex-col justify-between`}>
        <div className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity duration-700">
          {renderArt()}
        </div>
        
        {/* Holographic 3D Logo Effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Core Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/20 blur-xl rounded-full group-hover:bg-white/30 transition-all duration-700 group-hover:scale-150" />
            {/* Ambient Ring */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white/10 ${accentColor} opacity-20 group-hover:scale-110 transition-all duration-500`} />
            {/* Main Icon */}
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
    <div className="flex h-screen bg-[#030105] text-neutral-100 font-sans overflow-hidden select-none relative">
      
      {/* BOLDER MAGICAL COSMIC BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.4] mix-blend-overlay"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-purple-700/50 blur-[130px] rounded-full mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-orange-600/50 blur-[130px] rounded-full mix-blend-screen animate-[pulse_12s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] left-[50%] w-[50vw] h-[50vw] bg-red-700/40 blur-[100px] rounded-full mix-blend-screen animate-[pulse_10s_ease-in-out_infinite]" style={{ animationDelay: '4s' }} />
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
          <p className="px-4 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Spartan Originals</p>
          <SidebarItem icon={Swords} label="Colosseum Tap" target="tap" active={view === 'tap'} />
          <SidebarItem icon={Flame} label="Chariot Crash" target="crash" active={view === 'crash'} />
          <SidebarItem icon={Dices} label="Leonidas' Dice" target="dice" active={view === 'dice'} />
          <SidebarItem icon={Shield} label="Shield Wall" target="plinko" active={view === 'plinko'} />
          <SidebarItem icon={Lightbulb} label="Suggest a Game" target="suggest" active={view === 'suggest'} />
          
          <div className="my-3 border-t border-white/5" />
          <p className="px-4 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Live Multiplayer</p>
          <SidebarItem icon={Skull} label="The 300 Stand" target="stand" active={view === 'stand'} />
          <SidebarItem icon={Zap} label="Oracle Jackpot" target="jackpot" active={view === 'jackpot'} />
          
          <div className="my-3 border-t border-white/5" />
          <p className="px-4 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Community</p>
          <SidebarLink icon={Twitter} label="X (Twitter)" href="https://x.com/SpartansOnchain" />
          <SidebarLink icon={MessageCircle} label="Discord" href="https://discord.gg/ME8PRr8YG" />
          <SidebarLink icon={BarChart3} label="Dexscreener" href="https://dexscreener.com/solana/dyow5usgjfsm6qfqnpowa2z5s44appe1bf7srbwq12ym" />
          
          <div className="my-3 border-t border-white/5" />
          <p className="px-4 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Information</p>
          <SidebarItem icon={Trophy} label="Leaderboard" target="leaderboard" active={view === 'leaderboard'} />
          <SidebarItem icon={ScrollText} label="Rules & Terms" target="rules" active={view === 'rules'} />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
        
        {/* TOP NAV */}
        <header className="h-24 border-b border-white/5 bg-black/30 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between shrink-0 shadow-sm relative z-20">
          <div className="flex-1 max-w-md hidden lg:block">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search the arena..." 
                className="w-full bg-black/50 border border-white/10 rounded-full py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:bg-black/80 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5 ml-auto">
            {wallet && (
              <div className="flex bg-black/50 border border-white/10 rounded-xl overflow-hidden shadow-inner backdrop-blur-md">
                <div className="px-4 py-2 border-r border-white/10 flex items-center gap-3">
                  <Lock className="w-4 h-4 text-red-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold leading-none">Locked</span>
                    <span className="text-red-400 font-black text-base leading-none mt-1">{balanceLocked.toLocaleString()}</span>
                  </div>
                </div>
                <div className="px-4 py-2 flex items-center gap-3 bg-orange-900/20">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-orange-200/50 uppercase font-bold leading-none">Balance</span>
                    <span className="text-white font-black text-base leading-none mt-1">{balanceReal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {username && (
              <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors backdrop-blur-md">
                <User className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-black text-white uppercase tracking-wider">{username}</span>
              </div>
            )}

            <button 
              onClick={connectWallet}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 px-8 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all text-white shadow-[0_0_20px_rgba(234,88,12,0.4)] border border-orange-400/50"
            >
              {!wallet && <Wallet className="w-4 h-4" />}
              {wallet ? "Wallet Connected" : "Sign In"}
            </button>
          </div>
        </header>

        {/* DYNAMIC VIEW ROUTING */}
        <div className="flex-1 overflow-y-auto relative custom-scrollbar z-10">
          
          {view === 'home' && (
            <div className="max-w-7xl mx-auto p-4 md:p-8">
              
              {/* Premium Promo Banners */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-red-900 via-orange-950 to-black border border-orange-500/30 shadow-[0_10px_40px_rgba(234,88,12,0.2)] h-64 md:h-72 cursor-pointer group">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNykiLz48L3N2Zz4=')] opacity-50 mix-blend-overlay" />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 blur-[80px] rounded-full group-hover:bg-orange-500/30 transition-colors duration-700" />
                  <div className="relative z-10 p-8 md:p-10 flex flex-col justify-center h-full w-2/3">
                    <h2 className="text-orange-200 font-black uppercase tracking-widest text-xs md:text-sm mb-2 opacity-90 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" /> Welcome Pack
                    </h2>
                    <h1 className="font-spartan text-3xl md:text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] mb-2 leading-tight">
                      First 1,000 Warriors
                    </h1>
                    <p className="text-orange-100/70 text-sm md:text-base font-medium mb-6">
                      Register your blade to claim <strong className="text-amber-400">1,000 $SPARTAN</strong> locked bonus.
                    </p>
                    <button onClick={connectWallet} className="self-start bg-white text-black px-6 py-2.5 rounded-lg font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(255,255,255,0.5)] hover:bg-neutral-200 transition-all">
                      Claim Now
                    </button>
                  </div>
                  <Skull className="absolute -right-10 -bottom-10 w-64 h-64 text-orange-500/30 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700 pointer-events-none drop-shadow-[0_0_30px_rgba(234,88,12,0.5)]" />
                </div>

                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-950 to-black border border-purple-500/30 shadow-[0_10px_40px_rgba(168,85,247,0.2)] h-64 md:h-72 cursor-pointer group hidden lg:block">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNykiLz48L3N2Zz4=')] opacity-50 mix-blend-overlay" />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full group-hover:bg-purple-500/30 transition-colors duration-700" />
                  <div className="relative z-10 p-10 flex flex-col justify-center h-full w-2/3">
                    <h2 className="text-purple-200 font-black uppercase tracking-widest text-sm mb-2 opacity-90">Oracle's Jackpot</h2>
                    <h1 className="font-spartan text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] mb-2">
                      1,250,000 <span className="text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]">$SPRT</span>
                    </h1>
                    <p className="text-purple-100/70 font-medium mb-6">
                      The treasury grows with every drop of blood.
                    </p>
                    <button onClick={() => setView('jackpot')} className="self-start bg-purple-600 border border-purple-400 text-white px-6 py-2.5 rounded-lg font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(168,85,247,0.6)] hover:bg-purple-500 transition-all">
                      View Pot
                    </button>
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
                    title="Colosseum Tap" icon={Swords} target="tap" players="142" tag="PvP"
                    bgBase="bg-[#1a0500]" accentColor="text-orange-400"
                    renderArt={() => (
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,88,12,0.6),transparent_70%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.1)_50%,transparent_75%)] bg-[length:20px_20px]" />
                        <div className="absolute top-1/4 left-0 w-[200%] h-32 bg-red-600/30 -rotate-45 blur-2xl" />
                      </div>
                    )}
                  />
                  <ArenaCard 
                    title="Chariot Crash" icon={TrendingUp} target="crash" players="89"
                    bgBase="bg-[#00081a]" accentColor="text-cyan-400"
                    renderArt={() => (
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[size:20px_20px] [transform:perspective(500px)_rotateX(60deg)] origin-bottom" />
                        <div className="absolute bottom-0 left-0 w-full h-full bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500/50 via-blue-900/20 to-transparent blur-xl" />
                      </div>
                    )}
                  />
                  <ArenaCard 
                    title="Shield Wall" icon={Shield} target="plinko" players="312"
                    bgBase="bg-[#001a0a]" accentColor="text-green-400"
                    renderArt={() => (
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-[radial-gradient(rgba(74,222,128,0.4)_2px,transparent_2px)] bg-[size:24px_24px]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#001a0a] via-[#001a0a]/50 to-emerald-900/50" />
                      </div>
                    )}
                  />
                  <ArenaCard 
                    title="Leonidas' Dice" icon={Dices} target="dice" players="56"
                    bgBase="bg-[#1a0024]" accentColor="text-fuchsia-400"
                    renderArt={() => (
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_15px,rgba(217,70,239,0.1)_15px,rgba(217,70,239,0.1)_30px)]" />
                        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(217,70,239,0.5),transparent_70%)] blur-2xl" />
                      </div>
                    )}
                  />
                  <ArenaCard 
                    title="The 300 Stand" icon={Skull} target="stand" players="1,204" tag="Royale"
                    bgBase="bg-[#240a00]" accentColor="text-yellow-500"
                    renderArt={() => (
                      <div className="absolute inset-0">
                        <div className="absolute bottom-0 left-0 w-full h-[150%] bg-[radial-gradient(ellipse_at_bottom,rgba(245,158,11,0.5),transparent_70%)]" />
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] mix-blend-overlay" />
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* Live Arena Feed Table */}
              <div className="mt-12 mb-10">
                <div className="flex items-center gap-4 mb-4 border-b border-white/5 pb-4">
                  <button className="text-white font-black uppercase tracking-widest flex items-center gap-2 bg-white/10 border border-white/10 px-5 py-2.5 rounded-lg shadow-inner">
                    <History className="w-4 h-4 text-orange-500" /> Recent Battles
                  </button>
                  <button className="text-neutral-500 font-bold uppercase tracking-widest hover:text-white transition-colors">High Rollers</button>
                </div>
                
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-black/80 text-neutral-400 text-xs uppercase tracking-widest font-black border-b border-white/10">
                      <tr>
                        <th className="px-6 py-5">Game</th>
                        <th className="px-6 py-5">Warrior</th>
                        <th className="px-6 py-5 text-right">Wager</th>
                        <th className="px-6 py-5 text-right">Multiplier</th>
                        <th className="px-6 py-5 text-right">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {liveFeed.map((feed) => (
                        <tr key={feed.id} className="hover:bg-white/5 transition-colors duration-200">
                          <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#ea580c]" /> {feed.game}
                          </td>
                          <td className="px-6 py-4 font-black text-neutral-300 tracking-wider">{feed.user}</td>
                          <td className="px-6 py-4 text-right font-bold text-neutral-400 flex items-center justify-end gap-1.5">
                            {feed.wager} <Coins className="w-3.5 h-3.5 text-amber-500 drop-shadow-md" />
                          </td>
                          <td className="px-6 py-4 text-right font-black text-neutral-200">{feed.multiplier}</td>
                          <td className={`px-6 py-4 text-right font-black flex items-center justify-end gap-1.5 ${feed.type === 'win' ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]' : 'text-neutral-500'}`}>
                            {feed.payout} {feed.type === 'win' && <Coins className="w-3.5 h-3.5 text-green-400" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <footer className="pt-8 pb-4 text-center text-[10px] text-neutral-500 uppercase tracking-widest font-black border-t border-white/5">
                The Spartan Arena • Solana Network • Play Responsibly
              </footer>
            </div>
          )}

          {/* GAME ROUTE: COLOSSEUM TAP */}
          {view === 'tap' && (
            <ArenaGame 
              wallet={wallet} 
              addWager={addWager} 
              addFeed={addFeed} 
              username={username}
              onBack={() => setView('home')}
            />
          )}

          {/* SUGGEST A GAME */}
          {view === 'suggest' && (
            <div className="max-w-2xl mx-auto mt-20 relative z-20">
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
                  Have an idea for a Web3 PVP or Casino game? Describe the mechanics below. If the developers build your game, you'll receive a massive $SPARTAN bounty dropped directly to your connected wallet.
                </div>
                <textarea 
                  rows={6}
                  placeholder="Describe your game mechanics, theme, and how it utilizes $SPARTAN..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 resize-none mb-4 shadow-inner"
                />
                <button onClick={() => {alert("Idea submitted to the Oracle!"); setView('home');}} className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 font-black text-sm tracking-widest uppercase hover:brightness-110 shadow-[0_0_20px_rgba(234,88,12,0.4)] transition-all text-white">
                  Submit to the Oracle
                </button>
              </div>
            </div>
          )}

          {/* GAME ROUTE STUBS */}
          {['crash', 'dice', 'plinko', 'stand', 'jackpot'].includes(view) && (
            <div className="flex flex-col items-center justify-center h-full text-center pb-20 mt-20 relative z-20">
              <div className="w-28 h-28 rounded-3xl bg-black/50 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <Lock className="w-12 h-12 text-neutral-500" />
              </div>
              <h1 className="font-spartan text-4xl font-black text-white mb-4 uppercase tracking-widest drop-shadow-lg">
                {view === 'crash' ? 'Chariot Crash' : view === 'dice' ? "Leonidas' Dice" : view === 'plinko' ? "Shield Wall" : view === 'stand' ? "The 300 Stand" : "Oracle's Jackpot"}
              </h1>
              <p className="text-neutral-400 max-w-md font-medium leading-relaxed">
                Smart contract audit in progress. This arena will unlock in the next phase of deployment.
              </p>
              <button onClick={() => setView('home')} className="mt-8 bg-white/10 border border-white/20 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg">
                Return to Lobby
              </button>
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
                    <strong className="text-purple-400 text-lg drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]">3%</strong> is automatically routed to fuel the Oracle's Jackpot.<br/><br/>
                    <strong className="text-orange-400 text-lg drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]">2%</strong> goes to the Spartan Onchain Treasury for continuous ecosystem development.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-widest mb-3 flex items-center gap-3">
                    <Lock className="w-6 h-6 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" /> Welcome Allowance Play-Through
                  </h3>
                  <p className="bg-black/50 p-6 rounded-2xl border border-white/5 shadow-inner">
                    The 1,000 $SPARTAN credit granted on account creation remains locked. Users must complete an aggregate wager turnover of 1,000 $SPARTAN across any arena games before balances unlock for chain withdrawal. Automated bot behavior will result in execution and forfeiture of funds.
                  </p>
                </div>
              </div>
            </div>
          )}

          {view === 'leaderboard' && (
            <div className="max-w-4xl mx-auto mt-10 mb-10 relative z-20">
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
                    <tr className="bg-gradient-to-r from-amber-900/30 to-transparent">
                      <td className="p-6 font-black text-yellow-500 text-xl drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">#1</td>
                      <td className="p-6 font-black text-white uppercase tracking-wider text-base">ARES_99</td>
                      <td className="p-6 font-bold text-neutral-300">78%</td>
                      <td className="p-6 text-right font-black text-amber-400 text-base">142,500 $SPRT</td>
                    </tr>
                    <tr className="bg-gradient-to-r from-neutral-600/20 to-transparent">
                      <td className="p-6 font-black text-neutral-300 text-xl drop-shadow-[0_0_10px_rgba(163,163,163,0.5)]">#2</td>
                      <td className="p-6 font-black text-white uppercase tracking-wider text-base">LEONIDAS</td>
                      <td className="p-6 font-bold text-neutral-300">65%</td>
                      <td className="p-6 text-right font-black text-amber-400 text-base">89,200 $SPRT</td>
                    </tr>
                    <tr className="bg-gradient-to-r from-orange-900/20 to-transparent">
                      <td className="p-6 font-black text-orange-600 text-xl drop-shadow-[0_0_10px_rgba(234,88,12,0.5)]">#3</td>
                      <td className="p-6 font-black text-white uppercase tracking-wider text-base">BLOOD_GHOST</td>
                      <td className="p-6 font-bold text-neutral-300">61%</td>
                      <td className="p-6 text-right font-black text-amber-400 text-base">45,100 $SPRT</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// --- UPDATED MATCHMAKING ARENA COMPONENT ---
function ArenaGame({ wallet, addWager, addFeed, username, onBack }) {
  const [view, setView] = useState('lobby'); 
  const [wager, setWager] = useState('100');
  const [league, setLeague] = useState('little'); // 'little' | 'big'
  const [roomCode, setRoomCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(10.0);
  const [myTaps, setMyTaps] = useState(0);
  const [oppTaps, setOppTaps] = useState(0);
  const [winner, setWinner] = useState(null);
  const [tapsEffect, setTapsEffect] = useState([]);

  const littleLeague = ['100', '500', '1K', '5K', '10K'];
  const bigLeague = ['50K', '100K', '500K', '1M'];

  const startMatch = () => {
    setIsSearching(true);
    // Simulate matchmaking delay
    setTimeout(() => {
      setIsSearching(false);
      setView('countdown');
    }, 2000);
  };

  useEffect(() => {
    if (view !== 'countdown') return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setMyTaps(0);
      setOppTaps(0);
      setTimeLeft(10.0);
      setView('arena');
    }
  }, [view, countdown]);

  useEffect(() => {
    if (view !== 'arena') return;
    const aiInterval = setInterval(() => {
      if (Math.random() > 0.3) setOppTaps(o => o + 1);
    }, 140);

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0.1) {
          clearInterval(timer);
          clearInterval(aiInterval);
          settleMatch();
          return 0;
        }
        return parseFloat((t - 0.1).toFixed(1));
      });
    }, 100);

    return () => { clearInterval(timer); clearInterval(aiInterval); };
  }, [view]);

  const handleStrike = (e) => {
    if (view !== 'arena' || timeLeft <= 0) return;
    setMyTaps(t => t + 1);
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setTapsEffect(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setTapsEffect(prev => prev.filter(item => item.id !== id)), 600);
  };

  const settleMatch = () => {
    setView('result');
    addWager(wager);
    
    if (myTaps > oppTaps) {
      setWinner('you');
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#EA580C', '#F59E0B'] });
      // Simulate payout doubling (e.g. 100 -> 200, 1M -> 2M)
      const payoutStr = wager.includes('M') ? (parseFloat(wager)*2)+'M' : wager.includes('K') ? (parseFloat(wager)*2)+'K' : (parseFloat(wager)*2).toString();
      addFeed(username || 'Hoplite', "Colosseum Tap", wager, "2.0x", `+${payoutStr}`, 'win');
    } else if (oppTaps > myTaps) {
      setWinner('opp');
      addFeed(username || 'Hoplite', "Colosseum Tap", wager, "0.0x", `-${wager}`, 'loss');
    } else {
      setWinner('tie');
    }
  };

  const totalTaps = myTaps + oppTaps || 1;
  const myLeadPct = Math.min(100, Math.max(0, (myTaps / totalTaps) * 100));

  if (view === 'lobby') {
    return (
      <div className="w-full max-w-2xl mx-auto bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative mt-10 z-20">
        <button onClick={onBack} className="absolute left-6 top-6 text-neutral-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full border border-white/5"><ChevronRight className="w-5 h-5 rotate-180" /></button>
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-orange-700 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(234,88,12,0.4)] border border-orange-400/30 mb-4 mt-2">
            <Swords className="w-10 h-10 text-white drop-shadow-md" />
          </div>
          <h2 className="font-spartan text-3xl font-black text-white tracking-widest drop-shadow-lg uppercase">Colosseum Tap</h2>
          <p className="text-sm text-neutral-400 font-medium">10-Second PvP Combat</p>
        </div>
        
        {/* LOBBY CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Matchmaking Side */}
          <div className="bg-black/50 border border-white/5 rounded-2xl p-6 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-orange-500"/> Ranked Matchmaking</h3>
            
            {/* League Toggle */}
            <div className="flex bg-black/80 rounded-xl p-1 mb-4 border border-white/5">
              <button onClick={() => {setLeague('little'); setWager('100');}} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${league === 'little' ? 'bg-white/10 text-white' : 'text-neutral-500'}`}>Little League</button>
              <button onClick={() => {setLeague('big'); setWager('50K');}} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${league === 'big' ? 'bg-orange-600/20 text-orange-400' : 'text-neutral-500'}`}>Big League</button>
            </div>

            {/* Wager Grid */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {(league === 'little' ? littleLeague : bigLeague).map(amt => (
                <button 
                  key={amt} 
                  onClick={() => setWager(amt)} 
                  className={`py-2 rounded-lg text-xs font-black border transition-all ${wager === amt ? 'border-orange-500 bg-orange-600/20 text-orange-400 shadow-[0_0_15px_rgba(234,88,12,0.3)]' : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/30 hover:text-white'}`}
                >
                  {amt}
                </button>
              ))}
            </div>

            <button onClick={startMatch} disabled={isSearching} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 font-black text-sm tracking-widest uppercase hover:brightness-110 shadow-[0_0_30px_rgba(234,88,12,0.4)] transition-all flex items-center justify-center gap-2 text-white border border-orange-400/50">
              {isSearching ? <span className="animate-pulse">Searching...</span> : "Find Random Warrior"}
            </button>
          </div>

          {/* Private Room Side */}
          <div className="bg-black/50 border border-white/5 rounded-2xl p-6 shadow-inner relative overflow-hidden flex flex-col justify-between">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Key className="w-4 h-4 text-purple-500"/> Private Arena</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">Enter a specific lobby code to challenge a rival directly. Wagers are set by the lobby creator.</p>
              
              <input 
                type="text" 
                placeholder="ENTER 6-DIGIT CODE"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-3 text-center text-white font-black uppercase tracking-widest focus:outline-none focus:border-purple-500 transition-all shadow-inner mb-4"
              />
            </div>
            
            <button onClick={startMatch} disabled={roomCode.length < 3} className="w-full py-3.5 rounded-xl bg-white/10 border border-white/20 font-black text-sm tracking-widest uppercase hover:bg-white/20 transition-all flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed">
              Join Private Match
            </button>
          </div>
          
        </div>
      </div>
    );
  }

  if (view === 'countdown') {
    return (
      <div className="h-[60vh] flex items-center justify-center text-center animate-pulse relative z-20">
        <div>
          <h3 className="text-sm uppercase tracking-widest text-neutral-400 font-black mb-4">Match Found. Prepare Your Blade.</h3>
          <span className="font-spartan text-[10rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-600 drop-shadow-[0_0_50px_rgba(234,88,12,0.8)]">{countdown}</span>
        </div>
      </div>
    );
  }

  if (view === 'arena') {
    return (
      <div className="w-full flex flex-col items-center mt-10 relative z-20">
        <div className="mb-8 flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-3">Time Remaining</span>
          <div className="px-10 py-3 rounded-full border border-white/10 bg-black/50 shadow-inner backdrop-blur-md">
            <span className="font-spartan text-5xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">{timeLeft}s</span>
          </div>
        </div>
        <div className="w-full max-w-2xl mb-12 bg-black/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl">
          <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-4">
            <span className="text-orange-400 flex items-center gap-2 drop-shadow-md"><User className="w-4 h-4"/> You: {myTaps}</span>
            <span className="text-red-500 flex items-center gap-2 drop-shadow-md">Enemy: {oppTaps} <Bot className="w-4 h-4"/></span>
          </div>
          <div className="w-full h-6 bg-black/80 rounded-full overflow-hidden border border-white/10 flex shadow-inner relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-50 z-10 mix-blend-overlay pointer-events-none" />
            <div style={{ width: `${myLeadPct}%` }} className="bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 transition-all duration-100 shadow-[0_0_20px_rgba(245,158,11,0.8)] z-0" />
            <div style={{ width: `${100 - myLeadPct}%` }} className="bg-gradient-to-l from-red-700 via-purple-900 to-[#050308] transition-all duration-100 z-0" />
          </div>
        </div>
        <div className="relative my-4">
          {tapsEffect.map(t => (
            <span key={t.id} style={{ left: t.x, top: t.y }} className="absolute text-4xl font-black text-amber-300 pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-[ping_0.6s_ease-out_forwards] drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] z-50">+1</span>
          ))}
          <button onClick={handleStrike} className="w-80 h-80 rounded-full bg-[#050308] border-[8px] border-orange-600 flex flex-col items-center justify-center relative select-none active:scale-95 transition-transform duration-75 shadow-[0_0_80px_rgba(234,88,12,0.6)] group">
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-orange-500/20 to-transparent pointer-events-none" />
            <span className="font-spartan text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-600 drop-shadow-[0_0_30px_rgba(234,88,12,0.8)] group-active:scale-90 transition-transform">Λ</span>
            <span className="font-spartan text-sm font-black tracking-widest text-amber-400 mt-6 uppercase drop-shadow-md">STRIKE</span>
          </button>
        </div>
      </div>
    );
  }

  if (view === 'result') {
    return (
      <div className="w-full max-w-md mx-auto mt-10 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-12 shadow-[0_30px_60px_rgba(0,0,0,0.8)] text-center relative z-20 overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-2 ${winner === 'you' ? 'bg-gradient-to-r from-amber-400 to-yellow-600' : winner === 'opp' ? 'bg-gradient-to-r from-red-600 to-red-900' : 'bg-neutral-600'}`} />
        
        {winner === 'you' ? (
          <>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/20 blur-[80px] rounded-full pointer-events-none" />
            <Trophy className="w-24 h-24 text-amber-400 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(245,158,11,0.6)] relative z-10" />
            <h2 className="font-spartan text-5xl font-black text-amber-400 tracking-wider mb-2 relative z-10 drop-shadow-lg">VICTORY</h2>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl py-6 px-8 mb-10 mt-8 relative z-10 shadow-inner">
              <span className="text-xs font-black text-amber-500/80 uppercase tracking-widest block mb-2">Spoils Claimed</span>
              <span className="text-4xl font-black text-amber-400 drop-shadow-md">+{wager.includes('M') ? (parseFloat(wager)*2)+'M' : wager.includes('K') ? (parseFloat(wager)*2)+'K' : parseFloat(wager)*2} <span className="text-xl">$SPRT</span></span>
            </div>
          </>
        ) : winner === 'opp' ? (
          <>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-600/20 blur-[80px] rounded-full pointer-events-none" />
            <Skull className="w-24 h-24 text-red-600 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(220,38,38,0.6)] relative z-10" />
            <h2 className="font-spartan text-5xl font-black text-red-600 tracking-wider mb-2 relative z-10 drop-shadow-lg">SLAIN</h2>
            <div className="bg-red-900/20 border border-red-500/30 rounded-2xl py-6 px-8 mb-10 mt-8 relative z-10 shadow-inner">
               <span className="text-xs font-black text-red-500/80 uppercase tracking-widest block mb-2">Wager Lost</span>
              <span className="text-4xl font-black text-red-500 drop-shadow-md">-{wager} <span className="text-xl">$SPRT</span></span>
            </div>
          </>
        ) : (
          <h2 className="font-spartan text-4xl font-black text-neutral-300 tracking-wider mb-10 mt-8">DRAW</h2>
        )}
        <button onClick={() => { setView('lobby'); setCountdown(3); }} className="w-full py-4.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-sm tracking-widest uppercase transition-all shadow-lg relative z-10">
          Return to Matchmaking
        </button>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
