import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Shield, Trophy, Wallet, Skull, Bot, 
  Swords, Flame, Zap, Search, LayoutDashboard, 
  Dices, ScrollText, User, Lock, Coins, ChevronRight,
  TrendingUp, Activity, History
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
    { id: 1, user: "XERXES_99", game: "Chariot Crash", wager: 250, multiplier: "2.0x", payout: "+500", type: 'win' },
    { id: 2, user: "LEONIDAS", game: "Colosseum Tap", wager: 100, multiplier: "0.0x", payout: "-100", type: 'loss' },
    { id: 3, user: "ARES_WRATH", game: "Leonidas' Dice", wager: 500, multiplier: "3.5x", payout: "+1750", type: 'win' },
    { id: 4, user: "BLOOD_GHOST", game: "Shield Wall", wager: 50, multiplier: "0.5x", payout: "-25", type: 'loss' },
    { id: 5, user: "IMMORTAL", game: "The 300 Stand", wager: 1000, multiplier: "10.0x", payout: "+10000", type: 'win' },
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
    const newTotal = wageredTotal + amount;
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
        ? 'bg-neutral-800/80 text-white shadow-sm border border-neutral-700' 
        : 'hover:bg-neutral-800/40 text-neutral-400 hover:text-neutral-200 border border-transparent'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-amber-500' : ''}`} />
      <span className="font-bold text-sm tracking-wide">{label}</span>
    </button>
  );

  const CategoryPill = ({ icon: Icon, label }) => (
    <button 
      onClick={() => setCategory(label)}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
        category === label 
        ? 'bg-orange-600 text-white shadow-[0_0_15px_#ea580c44]' 
        : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const CasinoCard = ({ title, icon: Icon, target, gradient, tag, players }) => (
    <div 
      onClick={() => setView(target)}
      className={`relative w-full aspect-[4/5] rounded-xl cursor-pointer overflow-hidden group border border-white/5 transition-all hover:scale-105 hover:shadow-2xl ${gradient}`}
    >
      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className="w-24 h-24 text-white/90 drop-shadow-xl group-hover:scale-110 transition-transform duration-500" />
      </div>
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <h3 className="font-spartan text-lg font-black text-white uppercase tracking-wider">{title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-300 bg-black/50 px-2 py-0.5 rounded">
            <Activity className="w-3 h-3 text-green-400" /> {players} Playing
          </div>
          {tag && <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">{tag}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-neutral-100 font-sans overflow-hidden select-none">
      
      {/* LEFT SIDEBAR (Stake Style) */}
      <aside className="w-64 bg-[#0f0f0f] border-r border-neutral-800/80 flex flex-col z-20 shrink-0 hidden md:flex shadow-2xl">
        <div className="h-20 px-6 flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 rounded bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center shadow-lg">
            <span className="font-spartan text-2xl font-black text-white">Λ</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-spartan text-xl font-black tracking-widest text-white uppercase leading-none mt-1">Sparta</h1>
            <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Arena & Casino</span>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-1 custom-scrollbar">
          <SidebarItem icon={LayoutDashboard} label="Casino Lobby" target="home" active={view === 'home'} />
          <div className="my-4 border-t border-neutral-800/50" />
          <p className="px-4 text-[11px] text-neutral-500 font-bold uppercase tracking-wider mb-2">Spartan Originals</p>
          <SidebarItem icon={Swords} label="Colosseum Tap" target="tap" active={view === 'tap'} />
          <SidebarItem icon={Flame} label="Chariot Crash" target="crash" active={view === 'crash'} />
          <SidebarItem icon={Dices} label="Leonidas' Dice" target="dice" active={view === 'dice'} />
          <SidebarItem icon={Shield} label="Shield Wall" target="plinko" active={view === 'plinko'} />
          <div className="my-4 border-t border-neutral-800/50" />
          <p className="px-4 text-[11px] text-neutral-500 font-bold uppercase tracking-wider mb-2">Live Multiplayer</p>
          <SidebarItem icon={Skull} label="The 300 Stand" target="stand" active={view === 'stand'} />
          <SidebarItem icon={Zap} label="Oracle Jackpot" target="jackpot" active={view === 'jackpot'} />
          <div className="my-4 border-t border-neutral-800/50" />
          <p className="px-4 text-[11px] text-neutral-500 font-bold uppercase tracking-wider mb-2">Information</p>
          <SidebarItem icon={Trophy} label="Leaderboard" target="leaderboard" active={view === 'leaderboard'} />
          <SidebarItem icon={ScrollText} label="Rules & Terms" target="rules" active={view === 'rules'} />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative z-10 h-full overflow-hidden bg-[#0a0a0a]">
        
        {/* TOP NAV */}
        <header className="h-20 border-b border-neutral-800/80 bg-[#0f0f0f] px-4 md:px-8 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex-1 max-w-md hidden lg:block">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input 
                type="text" 
                placeholder="Search your game..." 
                className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-full py-2.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5 ml-auto">
            {wallet && (
              <div className="flex bg-[#1a1a1a] border border-neutral-800 rounded-lg overflow-hidden shadow-inner">
                <div className="px-3 py-1.5 border-r border-neutral-800 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-red-500" />
                  <div className="flex flex-col">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold leading-none">Locked</span>
                    <span className="text-red-400 font-bold text-sm leading-none mt-0.5">{balanceLocked.toLocaleString()}</span>
                  </div>
                </div>
                <div className="px-3 py-1.5 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <div className="flex flex-col">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold leading-none">Balance</span>
                    <span className="text-white font-bold text-sm leading-none mt-0.5">{balanceReal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {username && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-800 transition-colors">
                <User className="w-4 h-4 text-neutral-400" />
                <span className="text-sm font-bold text-white uppercase">{username}</span>
              </div>
            )}

            <button 
              onClick={connectWallet}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-6 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all text-white shadow-lg"
            >
              {!wallet && <Wallet className="w-4 h-4" />}
              {wallet ? "Wallet Connected" : "Sign In"}
            </button>
          </div>
        </header>

        {/* DYNAMIC VIEW ROUTING */}
        <div className="flex-1 overflow-y-auto relative custom-scrollbar">
          
          {view === 'home' && (
            <div className="max-w-7xl mx-auto p-4 md:p-8">
              
              {/* Promo Banners (7Bit/Stake Style Carousel) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-red-900 via-orange-900 to-[#0a0a0a] border border-orange-500/20 shadow-2xl h-64 md:h-72 cursor-pointer group">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
                  <div className="relative z-10 p-8 md:p-10 flex flex-col justify-center h-full w-2/3">
                    <h2 className="text-white font-black uppercase tracking-widest text-xs md:text-sm mb-2 opacity-80 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" /> Welcome Pack
                    </h2>
                    <h1 className="font-spartan text-3xl md:text-5xl font-black text-amber-500 drop-shadow-md mb-2 leading-tight">
                      First 1,000 Warriors
                    </h1>
                    <p className="text-neutral-300 text-sm md:text-base font-medium mb-6">
                      Register your blade to claim <strong className="text-white">1,000 $SPARTAN</strong> locked bonus.
                    </p>
                    <button onClick={connectWallet} className="self-start bg-white text-black px-6 py-2.5 rounded-lg font-black uppercase tracking-widest text-xs shadow-xl hover:bg-neutral-200 transition-colors">
                      Claim Now
                    </button>
                  </div>
                  <Skull className="absolute -right-10 -bottom-10 w-64 h-64 text-orange-500/20 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-950 to-[#0a0a0a] border border-purple-500/20 shadow-2xl h-64 md:h-72 cursor-pointer group hidden lg:block">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
                  <div className="relative z-10 p-10 flex flex-col justify-center h-full w-2/3">
                    <h2 className="text-white font-black uppercase tracking-widest text-sm mb-2 opacity-80">Oracle's Jackpot</h2>
                    <h1 className="font-spartan text-4xl font-black text-white drop-shadow-md mb-2">
                      1,250,000 <span className="text-purple-400">$SPRT</span>
                    </h1>
                    <p className="text-neutral-300 font-medium mb-6">
                      The treasury grows with every drop of blood.
                    </p>
                    <button onClick={() => setView('jackpot')} className="self-start bg-purple-600 text-white px-6 py-2.5 rounded-lg font-black uppercase tracking-widest text-xs shadow-xl hover:bg-purple-500 transition-colors">
                      View Pot
                    </button>
                  </div>
                  <Trophy className="absolute -right-4 top-1/2 -translate-y-1/2 w-48 h-48 text-purple-400/20 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
                </div>
              </div>

              {/* Navigation Pills */}
              <div className="flex gap-3 overflow-x-auto pb-4 mb-4 custom-scrollbar">
                <CategoryPill icon={LayoutDashboard} label="Lobby" />
                <CategoryPill icon={Swords} label="Spartan Originals" />
                <CategoryPill icon={Flame} label="High Stakes" />
                <CategoryPill icon={Skull} label="Live Multiplayer" />
              </div>
              
              {/* Game Grid (Stake Style) */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center gap-2 font-spartan text-xl font-black text-white uppercase tracking-widest">
                    <span className="w-1.5 h-6 bg-orange-600 rounded-full" />
                    Spartan Originals
                  </h2>
                  <div className="flex gap-2">
                    <button className="bg-neutral-900 p-2 rounded hover:bg-neutral-800 text-neutral-400"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                    <button className="bg-neutral-900 p-2 rounded hover:bg-neutral-800 text-neutral-400"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <CasinoCard 
                    title="Colosseum Tap" icon={Swords} target="tap" players="142" tag="PvP"
                    gradient="bg-gradient-to-br from-red-600 to-orange-700" 
                  />
                  <CasinoCard 
                    title="Chariot Crash" icon={TrendingUp} target="crash" players="89"
                    gradient="bg-gradient-to-br from-indigo-600 to-blue-800" 
                  />
                  <CasinoCard 
                    title="Shield Wall" icon={Shield} target="plinko" players="312"
                    gradient="bg-gradient-to-br from-emerald-600 to-teal-800" 
                  />
                  <CasinoCard 
                    title="Leonidas' Dice" icon={Dices} target="dice" players="56"
                    gradient="bg-gradient-to-br from-purple-600 to-fuchsia-800" 
                  />
                  <CasinoCard 
                    title="The 300 Stand" icon={Skull} target="stand" players="1,204" tag="Royale"
                    gradient="bg-gradient-to-br from-amber-600 to-yellow-800" 
                  />
                </div>
              </div>

              {/* Live Casino Feed Table (Stake/Rollbit Style) */}
              <div className="mt-12 mb-10">
                <div className="flex items-center gap-4 mb-4 border-b border-neutral-800 pb-4">
                  <button className="text-white font-bold flex items-center gap-2 bg-neutral-800/50 px-4 py-2 rounded-lg">
                    <History className="w-4 h-4 text-orange-500" /> Recent Battles
                  </button>
                  <button className="text-neutral-500 font-bold hover:text-white transition-colors">High Rollers</button>
                </div>
                
                <div className="bg-[#0f0f0f] border border-neutral-800/80 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#141414] text-neutral-500 text-xs uppercase tracking-wider font-bold">
                      <tr>
                        <th className="px-6 py-4 font-medium">Game</th>
                        <th className="px-6 py-4 font-medium">Warrior</th>
                        <th className="px-6 py-4 font-medium text-right">Wager</th>
                        <th className="px-6 py-4 font-medium text-right">Multiplier</th>
                        <th className="px-6 py-4 font-medium text-right">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50">
                      {liveFeed.map((feed) => (
                        <tr key={feed.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-neutral-700" /> {feed.game}
                          </td>
                          <td className="px-6 py-4 font-bold text-neutral-300">{feed.user}</td>
                          <td className="px-6 py-4 text-right font-medium text-neutral-400 flex items-center justify-end gap-1.5">
                            {feed.wager} <Coins className="w-3 h-3 text-amber-500" />
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-neutral-300">{feed.multiplier}</td>
                          <td className={`px-6 py-4 text-right font-black flex items-center justify-end gap-1.5 ${feed.type === 'win' ? 'text-green-500' : 'text-neutral-500'}`}>
                            {feed.payout} {feed.type === 'win' && <Coins className="w-3 h-3 text-green-500" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <footer className="pt-8 pb-4 text-center text-xs text-neutral-600 uppercase tracking-widest font-bold border-t border-neutral-800">
                The Sparta Arena Casino • Solana Network • Play Responsibly
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

          {/* GAME ROUTE STUBS */}
          {['crash', 'dice', 'plinko', 'stand', 'jackpot'].includes(view) && (
            <div className="flex flex-col items-center justify-center h-full text-center pb-20 mt-20">
              <div className="w-24 h-24 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6 shadow-2xl">
                <Lock className="w-10 h-10 text-neutral-600" />
              </div>
              <h1 className="font-spartan text-4xl font-black text-white mb-4 uppercase tracking-widest">
                {view === 'crash' ? 'Chariot Crash' : view === 'dice' ? "Leonidas' Dice" : view === 'plinko' ? "Shield Wall" : view === 'stand' ? "The 300 Stand" : "Oracle's Jackpot"}
              </h1>
              <p className="text-neutral-400 max-w-md">
                Smart contract audit in progress. This game will unlock in the next phase of the arena deployment.
              </p>
              <button onClick={() => setView('home')} className="mt-8 bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors">
                Back to Lobby
              </button>
            </div>
          )}

          {/* INFORMATION ROUTES */}
          {view === 'rules' && (
            <div className="max-w-3xl mx-auto bg-[#0f0f0f] border border-neutral-800 rounded-2xl p-10 mt-10 mb-10 shadow-2xl">
              <h1 className="font-spartan text-3xl font-black text-amber-500 mb-8 border-b border-neutral-800 pb-4 flex items-center gap-3">
                <ScrollText className="w-8 h-8" /> Casino Rules & Conditions
              </h1>
              <div className="space-y-8 text-neutral-300 leading-relaxed text-sm">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-orange-500 rounded" /> Welcome Allowance Play-Through</h3>
                  <p className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">The 1,000 $SPARTAN credit granted on account creation remains locked. Users must complete an aggregate turnover (wagers) of 1,000 $SPARTAN across arena games before balances unlock for chain withdrawal. Bots will be executed.</p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><div className="w-1.5 h-4 bg-orange-500 rounded" /> Arena Protocol Fee</h3>
                  <p className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">A standard 2.5% protocol fee is retained from all multiplayer match pots. This tribute funds the global Oracle's Jackpot pool.</p>
                </div>
              </div>
            </div>
          )}

          {view === 'leaderboard' && (
            <div className="max-w-4xl mx-auto mt-10 mb-10">
              <h1 className="font-spartan text-3xl font-black text-amber-500 mb-8 flex items-center gap-4">
                <Trophy className="w-8 h-8 text-amber-500" /> Hall of Legends
              </h1>
              <div className="bg-[#0f0f0f] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#141414] text-neutral-400 text-xs uppercase tracking-widest border-b border-neutral-800">
                    <tr>
                      <th className="p-5">Rank</th>
                      <th className="p-5">Warrior</th>
                      <th className="p-5">Win Rate</th>
                      <th className="p-5 text-right">Total Won</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    <tr className="bg-gradient-to-r from-amber-900/20 to-transparent">
                      <td className="p-5 font-black text-yellow-500 text-lg">#1</td>
                      <td className="p-5 font-bold text-white uppercase tracking-wider">ARES_99</td>
                      <td className="p-5 font-medium text-neutral-300">78%</td>
                      <td className="p-5 text-right font-black text-amber-400">142,500 $SPRT</td>
                    </tr>
                    <tr className="bg-gradient-to-r from-neutral-600/10 to-transparent">
                      <td className="p-5 font-black text-neutral-400 text-lg">#2</td>
                      <td className="p-5 font-bold text-white uppercase tracking-wider">LEONIDAS</td>
                      <td className="p-5 font-medium text-neutral-300">65%</td>
                      <td className="p-5 text-right font-black text-amber-400">89,200 $SPRT</td>
                    </tr>
                    <tr className="bg-gradient-to-r from-orange-900/10 to-transparent">
                      <td className="p-5 font-black text-orange-600 text-lg">#3</td>
                      <td className="p-5 font-bold text-white uppercase tracking-wider">BLOOD_GHOST</td>
                      <td className="p-5 font-medium text-neutral-300">61%</td>
                      <td className="p-5 text-right font-black text-amber-400">45,100 $SPRT</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* SIGN UP MODAL */}
      {showSignup && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] border border-neutral-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-600 to-amber-500" />
            <Skull className="w-16 h-16 text-amber-500 mx-auto mb-4 drop-shadow-[0_0_15px_#f59e0b]" />
            <h2 className="font-spartan text-2xl font-black text-white uppercase tracking-widest mb-2">Claim Your Spoils</h2>
            <p className="text-sm text-neutral-400 mb-6 font-medium">
              Create a warrior alias to credit <strong className="text-amber-500">1,000 Locked $SPARTAN</strong> to your session.
            </p>
            <form onSubmit={handleSignup}>
              <input 
                type="text" 
                maxLength={12}
                required
                placeholder="ENTER USERNAME"
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                className="w-full bg-[#141414] border border-neutral-800 rounded-xl px-4 py-3.5 text-center text-white font-black uppercase tracking-widest mb-4 focus:outline-none focus:border-orange-500 focus:bg-black transition-all"
              />
              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 text-white font-black uppercase tracking-widest py-3.5 rounded-xl shadow-lg transition-all"
              >
                Enter the Arena
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COLOSSEUM TAP GAME COMPONENT ---
function ArenaGame({ wallet, addWager, addFeed, username, onBack }) {
  const [view, setView] = useState('lobby'); 
  const [wager, setWager] = useState(100);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(10.0);
  const [myTaps, setMyTaps] = useState(0);
  const [oppTaps, setOppTaps] = useState(0);
  const [winner, setWinner] = useState(null);
  const [tapsEffect, setTapsEffect] = useState([]);

  const startPractice = () => setView('countdown');

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
      addFeed(username || 'Hoplite', "Colosseum Tap", wager, "2.0x", `+${wager * 2}`, 'win');
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
      <div className="w-full max-w-md mx-auto bg-[#0f0f0f] border border-neutral-800 rounded-3xl p-8 shadow-2xl relative text-center mt-10">
        <button onClick={onBack} className="absolute left-6 top-6 text-neutral-500 hover:text-white"><ChevronRight className="w-6 h-6 rotate-180" /></button>
        <div className="flex justify-center mb-4 mt-2">
          <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-orange-700 rounded-2xl flex items-center justify-center shadow-[0_0_30px_#ea580c44]">
            <Swords className="w-10 h-10 text-white drop-shadow-md" />
          </div>
        </div>
        <h2 className="font-spartan text-2xl font-black text-white tracking-wider mb-1">THE COLOSSEUM</h2>
        <p className="text-sm text-neutral-400 mb-8 font-medium">10-Second PvP Tap Battles</p>
        
        <div className="bg-[#141414] border border-neutral-800 rounded-xl p-4 mb-6">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-3 text-left">Wager Amount</label>
          <div className="flex items-center justify-between gap-2">
            {[50, 100, 250, 500].map(amt => (
              <button key={amt} onClick={() => setWager(amt)} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${wager === amt ? 'border-orange-500 bg-orange-600/20 text-orange-400 shadow-[0_0_10px_#ea580c33]' : 'border-neutral-800 bg-[#0f0f0f] text-neutral-400 hover:border-neutral-600 hover:text-white'}`}>
                {amt}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={startPractice} className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 font-black text-sm tracking-widest uppercase hover:brightness-110 shadow-[0_0_20px_#ea580c44] transition-all flex items-center justify-center gap-2 text-white">
            <Bot className="w-5 h-5" /> Start Match vs Bot
          </button>
        </div>
      </div>
    );
  }

  if (view === 'countdown') {
    return (
      <div className="h-[60vh] flex items-center justify-center text-center animate-pulse">
        <div>
          <h3 className="text-sm uppercase tracking-widest text-neutral-500 font-bold mb-2">Prepare for Battle</h3>
          <span className="font-spartan text-8xl font-black text-orange-500 drop-shadow-[0_0_30px_#ea580c]">{countdown}</span>
        </div>
      </div>
    );
  }

  if (view === 'arena') {
    return (
      <div className="w-full flex flex-col items-center mt-10">
        <div className="mb-8 flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-neutral-500 font-bold mb-2">Time Remaining</span>
          <div className="px-8 py-2.5 rounded-full border border-neutral-800 bg-[#0f0f0f] shadow-inner">
            <span className="font-spartan text-4xl font-black text-amber-400">{timeLeft}s</span>
          </div>
        </div>
        <div className="w-full max-w-lg mb-10">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-3">
            <span className="text-orange-400 flex items-center gap-2"><User className="w-4 h-4"/> You: {myTaps}</span>
            <span className="text-red-500 flex items-center gap-2">Undead Bot: {oppTaps} <Bot className="w-4 h-4"/></span>
          </div>
          <div className="w-full h-4 bg-[#0f0f0f] rounded-full overflow-hidden border border-neutral-800 flex shadow-inner">
            <div style={{ width: `${myLeadPct}%` }} className="bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-100" />
            <div style={{ width: `${100 - myLeadPct}%` }} className="bg-gradient-to-l from-red-700 to-purple-900 transition-all duration-100" />
          </div>
        </div>
        <div className="relative my-4">
          {tapsEffect.map(t => (
            <span key={t.id} style={{ left: t.x, top: t.y }} className="absolute text-2xl font-black text-amber-300 pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-ping">+1</span>
          ))}
          <button onClick={handleStrike} className="w-72 h-72 rounded-full bg-[#0a0a0a] border-[6px] border-orange-600 flex flex-col items-center justify-center relative select-none active:scale-95 transition-transform duration-75 shadow-[0_0_50px_#ea580c66]">
            <span className="font-spartan text-7xl font-black text-orange-500 drop-shadow-[0_0_20px_#ea580c]">Λ</span>
            <span className="font-spartan text-sm font-black tracking-widest text-amber-400 mt-4 uppercase">STRIKE</span>
          </button>
        </div>
      </div>
    );
  }

  if (view === 'result') {
    return (
      <div className="w-full max-w-md mx-auto mt-10 bg-[#0f0f0f] border border-neutral-800 rounded-3xl p-10 shadow-2xl text-center">
        {winner === 'you' ? (
          <>
            <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-4 drop-shadow-[0_0_20px_#f59e0b]" />
            <h2 className="font-spartan text-4xl font-black text-amber-400 tracking-wider mb-2">VICTORY</h2>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl py-4 px-6 mb-8 mt-6">
              <span className="text-sm font-bold text-amber-500/80 uppercase block mb-1">Payout</span>
              <span className="text-2xl font-black text-amber-400">+{wager * 2} $SPARTAN</span>
            </div>
          </>
        ) : winner === 'opp' ? (
          <>
            <Skull className="w-20 h-20 text-red-600 mx-auto mb-4 drop-shadow-[0_0_20px_#dc2626]" />
            <h2 className="font-spartan text-4xl font-black text-red-600 tracking-wider mb-2">SLAIN</h2>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl py-4 px-6 mb-8 mt-6">
               <span className="text-sm font-bold text-red-500/80 uppercase block mb-1">Lost Wager</span>
              <span className="text-2xl font-black text-red-500">-{wager} $SPARTAN</span>
            </div>
          </>
        ) : (
          <h2 className="font-spartan text-3xl font-black text-neutral-300 tracking-wider mb-8">DRAW</h2>
        )}
        <button onClick={() => { setView('lobby'); setCountdown(3); }} className="w-full py-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-black text-sm tracking-widest uppercase transition-colors">
          Play Again
        </button>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
