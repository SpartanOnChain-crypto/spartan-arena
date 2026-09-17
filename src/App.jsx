import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Shield, Trophy, Wallet, Skull, Bot, 
  Swords, Flame, Zap
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
  
  const [liveFeed, setLiveFeed] = useState([
    { id: 1, text: "💀 Xerxes_99 won 500 $SPARTAN in Chariot Crash", type: 'win' },
    { id: 2, text: "🩸 Leonidas lost 100 $SPARTAN in The Colosseum", type: 'loss' },
    { id: 3, text: "⚡ Oracle distributed 25,000 $SPARTAN Jackpot", type: 'win' }
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
      addFeed(`🔥 ${tempName.toUpperCase()} joined the Arena!`, 'win');
    }
  };

  const addFeed = (text, type) => {
    setLiveFeed(prev => [{ id: Date.now(), text, type }, ...prev].slice(0, 15));
  };

  const addWager = (amount) => {
    const newTotal = wageredTotal + amount;
    setWageredTotal(newTotal);
    if (newTotal >= 1000 && balanceLocked > 0) {
      setBalanceReal(prev => prev + balanceLocked);
      setBalanceLocked(0);
      addFeed(`🔓 ${username} UNLOCKED their 1,000 $SPARTAN bonus!`, 'win');
    }
  };

  const SidebarItem = ({ label, target, active }) => (
    <button 
      onClick={() => setView(target)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
        ? 'bg-orange-600/20 border border-orange-500/50 text-orange-400 shadow-[0_0_15px_#ea580c33]' 
        : 'hover:bg-white/5 text-neutral-400 hover:text-neutral-200 border border-transparent'
      }`}
    >
      <span className="font-semibold text-sm tracking-wider uppercase">{label}</span>
    </button>
  );

  const GameCard = ({ title, desc, target, tag }) => (
    <div 
      onClick={() => setView(target)}
      className="bg-black/60 border border-orange-900/40 hover:border-orange-500/60 rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_#ea580c44] relative overflow-hidden group"
    >
      <h3 className="font-spartan text-xl font-black text-white mb-2 uppercase tracking-wider">{title}</h3>
      <p className="text-sm text-neutral-400 mb-4">{desc}</p>
      <div className="inline-block bg-red-950/50 border border-red-900/50 text-red-400 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest">
        {tag}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#050505] text-neutral-100 font-sans overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,#b91c1c15,transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,#ea580c10,transparent_50%)] pointer-events-none" />

      {/* Left Sidebar */}
      <aside className="w-64 border-r border-orange-950/40 bg-black/40 backdrop-blur-xl flex flex-col z-20">
        <div className="p-6 border-b border-orange-950/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-orange-600/50 bg-black flex items-center justify-center shadow-[0_0_15px_#ea580c44]">
            <span className="font-spartan text-xl font-black text-orange-500">Λ</span>
          </div>
          <div>
            <h1 className="font-spartan text-lg font-black tracking-widest text-amber-500 uppercase leading-none">Sparta</h1>
            <span className="text-[10px] text-red-500 uppercase tracking-widest font-black">Casino & Arena</span>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-2">
          <SidebarItem label="Casino Lobby" target="home" active={view === 'home'} />
          <div className="my-2 border-t border-white/5" />
          <p className="px-4 text-[10px] text-neutral-600 font-bold uppercase tracking-widest mb-1">Live Games</p>
          <SidebarItem label="Colosseum Tap" target="tap" active={view === 'tap'} />
          <SidebarItem label="Chariot Crash" target="crash" active={view === 'crash'} />
          <SidebarItem label="Oracle Jackpot" target="jackpot" active={view === 'jackpot'} />
          <SidebarItem label="The 300 Stand" target="stand" active={view === 'stand'} />
          <div className="my-2 border-t border-white/5" />
          <p className="px-4 text-[10px] text-neutral-600 font-bold uppercase tracking-widest mb-1">Information</p>
          <SidebarItem label="Leaderboard" target="leaderboard" active={view === 'leaderboard'} />
          <SidebarItem label="Rules & terms" target="rules" active={view === 'rules'} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
        <header className="h-20 border-b border-orange-950/40 bg-black/40 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            {username && (
              <div>
                <div className="text-sm font-black text-white uppercase tracking-wider">{username}</div>
                <div className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Play-Through: {wageredTotal} / 1000</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {wallet && (
              <div className="flex bg-black/50 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-r border-neutral-800 flex items-center gap-2 bg-red-950/20">
                  <span className="text-xs text-neutral-400">Locked:</span>
                  <span className="text-red-400 font-bold text-sm">{balanceLocked}</span>
                </div>
                <div className="px-4 py-2 flex items-center gap-2 bg-orange-950/20">
                  <span className="text-xs text-neutral-400">Ready:</span>
                  <span className="text-amber-400 font-bold text-sm">{balanceReal}</span>
                </div>
              </div>
            )}

            <button 
              onClick={connectWallet}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all text-white shadow-[0_0_15px_#9945ff66]"
            >
              <Wallet className="w-4 h-4" />
              {wallet ? wallet : "Connect Blade"}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          {view === 'home' && (
            <div className="max-w-6xl mx-auto pb-10">
              <div className="w-full bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-orange-500/30 rounded-3xl p-10 mb-10 relative overflow-hidden shadow-[0_0_40px_#ea580c22]">
                <h2 className="text-orange-500 font-black tracking-widest uppercase text-sm mb-2">Global Prize Pool</h2>
                <h1 className="font-spartan text-6xl font-black text-amber-400 drop-shadow-[0_0_15px_#f59e0b] mb-4">
                  1,250,000 <span className="text-3xl text-orange-600">$SPARTAN</span>
                </h1>
                <p className="text-neutral-300 max-w-xl mb-6 font-medium">
                  The Oracle's Jackpot accumulates across every battle. Buy entries for the recurring distribution.
                </p>
                <button onClick={() => setView('jackpot')} className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm shadow-[0_0_20px_#ea580c]">
                  Enter the Jackpot
                </button>
              </div>

              <h2 className="font-spartan text-2xl font-black text-white uppercase tracking-widest mb-6 border-b border-white/10 pb-4">
                Available Battles
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GameCard 
                  title="The Colosseum Tap" 
                  desc="1v1 Combat. Highest strikes within 10 seconds wins the pot."
                  target="tap" tag="Live PvP"
                />
                <GameCard 
                  title="Chariot Crash" 
                  desc="3-Player sprint. Multiplier increases until the crash occurs."
                  target="crash" tag="High Volatility"
                />
                <GameCard 
                  title="The 300 Stand" 
                  desc="King-of-the-Hill elimination. Pay upkeep to remain standing."
                  target="stand" tag="Battle Royale"
                />
                <GameCard 
                  title="Leonidas' Dice" 
                  desc="Select probability thresholds for immediate settled outcomes."
                  target="home" tag="Under Review"
                />
              </div>
            </div>
          )}

          {view === 'tap' && (
            <ArenaGame 
              wallet={wallet} 
              addWager={addWager} 
              addFeed={addFeed} 
              username={username}
            />
          )}

          {view === 'crash' && (
            <div className="flex flex-col items-center justify-center h-full text-center pb-20">
              <Flame className="w-24 h-24 text-orange-600/50 mb-6" />
              <h1 className="font-spartan text-4xl font-black text-amber-500 mb-4">Chariot Crash</h1>
              <p className="text-neutral-400 max-w-md border border-orange-900/50 bg-black/50 p-6 rounded-2xl">
                Preparing the arena sands. Engine contract is currently pending deployment.
              </p>
            </div>
          )}

          {view === 'jackpot' && (
            <div className="flex flex-col items-center justify-center h-full text-center pb-20">
              <Zap className="w-24 h-24 text-purple-600/50 mb-6" />
              <h1 className="font-spartan text-4xl font-black text-purple-400 mb-4">Oracle's Jackpot</h1>
              <p className="text-neutral-400 max-w-md border border-purple-900/50 bg-black/50 p-6 rounded-2xl">
                Ticket accumulation pool active. Entry contracts open next round.
              </p>
            </div>
          )}

          {view === 'stand' && (
            <div className="flex flex-col items-center justify-center h-full text-center pb-20">
              <Skull className="w-24 h-24 text-red-600/50 mb-6" />
              <h1 className="font-spartan text-4xl font-black text-red-500 mb-4">The 300 Stand</h1>
              <p className="text-neutral-400 max-w-md border border-red-900/50 bg-black/50 p-6 rounded-2xl">
                Last-man-standing battle royale mechanic launching next phase.
              </p>
            </div>
          )}

          {view === 'rules' && (
            <div className="max-w-3xl mx-auto bg-black/60 border border-neutral-800 rounded-2xl p-10 mb-10">
              <h1 className="font-spartan text-3xl font-black text-amber-500 mb-8 border-b border-neutral-800 pb-4">Casino Rules & Conditions</h1>
              <div className="space-y-6 text-neutral-300 leading-relaxed text-sm">
                <div>
                  <h3 className="text-base font-bold text-orange-500 mb-1">1. Welcome Allowance Play-Through</h3>
                  <p>The 1,000 $SPARTAN credit granted on account creation remains locked. Users must complete an aggregate turnover of 1,000 $SPARTAN across arena games before balances unlock for chain withdrawal.</p>
                </div>
                <div>
                  <h3 className="text-base font-bold text-orange-500 mb-1">2. Arena Contribution</h3>
                  <p>A standard 2.5% protocol fee is retained from match pots to fund the global jackpot pool.</p>
                </div>
                <div>
                  <h3 className="text-base font-bold text-orange-500 mb-1">3. Escrow Settlement</h3>
                  <p>Pots settle on Solana via program escrow. Match outcomes are validated against time-stamped inputs.</p>
                </div>
              </div>
            </div>
          )}

          {view === 'leaderboard' && (
            <div className="max-w-4xl mx-auto mb-10">
              <h1 className="font-spartan text-3xl font-black text-amber-500 mb-8 flex items-center gap-4">
                <Trophy className="w-8 h-8 text-amber-500" /> 
                Leaderboard
              </h1>
              <div className="bg-black/60 border border-neutral-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-900/80 text-neutral-400 text-xs uppercase tracking-widest border-b border-neutral-800">
                    <tr>
                      <th className="p-4">Rank</th>
                      <th className="p-4">Player</th>
                      <th className="p-4">Win Rate</th>
                      <th className="p-4 text-right">Total Won</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    <tr>
                      <td className="p-4 font-bold text-amber-400">#1</td>
                      <td className="p-4 font-bold text-white uppercase">ARES_99</td>
                      <td className="p-4 text-neutral-400">78%</td>
                      <td className="p-4 text-right font-black text-amber-400">142,500 $SPARTAN</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-neutral-300">#2</td>
                      <td className="p-4 font-bold text-white uppercase">LEONIDAS</td>
                      <td className="p-4 text-neutral-400">65%</td>
                      <td className="p-4 text-right font-black text-amber-400">89,200 $SPARTAN</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-amber-700">#3</td>
                      <td className="p-4 font-bold text-white uppercase">BLOOD_GHOST</td>
                      <td className="p-4 text-neutral-400">61%</td>
                      <td className="p-4 text-right font-black text-amber-400">45,100 $SPARTAN</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Feed Sidebar */}
      <aside className="w-72 border-l border-orange-950/40 bg-black/40 backdrop-blur-xl flex flex-col z-20 shrink-0 hidden lg:flex">
        <div className="p-6 border-b border-orange-950/40">
          <h2 className="font-spartan text-sm font-black tracking-widest text-amber-500 uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Live Arena Feed
          </h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3">
          {liveFeed.map(feed => (
            <div key={feed.id} className="bg-black/40 border border-neutral-800/50 p-3 rounded-xl text-xs font-semibold leading-relaxed">
              <span className={feed.type === 'win' ? 'text-green-400' : 'text-red-400'}>
                {feed.text}
              </span>
            </div>
          ))}
        </div>
      </aside>

      {/* Sign Up Modal */}
      {showSignup && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-orange-600/50 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_#ea580c44] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-600 to-amber-500" />
            <Skull className="w-16 h-16 text-amber-500 mx-auto mb-4 drop-shadow-[0_0_15px_#f59e0b]" />
            <h2 className="font-spartan text-2xl font-black text-white uppercase tracking-widest mb-2">Claim Your Spoils</h2>
            <p className="text-sm text-neutral-400 mb-6">
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
                className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-center text-white font-black uppercase tracking-widest mb-4 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 text-white font-black uppercase tracking-widest py-3 rounded-xl shadow-[0_0_20px_#ea580c44]"
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

function ArenaGame({ wallet, addWager, addFeed, username }) {
  const [view, setView] = useState('lobby'); 
  const [wager, setWager] = useState(100);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(10.0);
  const [myTaps, setMyTaps] = useState(0);
  const [oppTaps, setOppTaps] = useState(0);
  const [winner, setWinner] = useState(null);
  const [tapsEffect, setTapsEffect] = useState([]);

  const startPractice = () => {
    setView('countdown');
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
      addFeed(`💀 ${username || 'Hoplite'} won ${wager * 2} $SPARTAN in The Colosseum!`, 'win');
    } else if (oppTaps > myTaps) {
      setWinner('opp');
      addFeed(`🩸 ${username || 'Hoplite'} lost ${wager} $SPARTAN to Undead Bot`, 'loss');
    } else {
      setWinner('tie');
    }
  };

  const totalTaps = myTaps + oppTaps || 1;
  const myLeadPct = Math.min(100, Math.max(0, (myTaps / totalTaps) * 100));

  if (view === 'lobby') {
    return (
      <div className="w-full max-w-md mx-auto bg-zinc-950/90 border border-orange-900/40 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_40px_#000000] text-center mt-10">
        <div className="flex justify-center mb-4">
          <Skull className="w-16 h-16 text-orange-600 drop-shadow-[0_0_15px_#ea580c]" />
        </div>
        <h2 className="font-spartan text-2xl font-black text-amber-400 tracking-wider mb-1">THE COLOSSEUM</h2>
        <p className="text-sm text-neutral-400 mb-6">10-Second PvP Tap Battles</p>
        <div className="bg-black/60 border border-orange-900/30 rounded-xl p-4 mb-6">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2 text-left">Wager Stake ($Spartan)</label>
          <div className="flex items-center justify-between gap-3">
            {[50, 100, 250, 500].map(amt => (
              <button key={amt} onClick={() => setWager(amt)} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${wager === amt ? 'border-orange-500 bg-orange-600/20 text-orange-400 shadow-[0_0_10px_#ea580c44]' : 'border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-600'}`}>
                {amt}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={startPractice} className="w-full py-4 rounded-xl bg-gradient-to-r from-red-700 via-orange-600 to-amber-600 font-spartan font-black text-sm tracking-widest uppercase hover:brightness-110 shadow-[0_0_25px_#ea580c66] transition-all flex items-center justify-center gap-2">
            <Bot className="w-4 h-4 text-white" />
            Enter Arena (Practice Bot)
          </button>
        </div>
      </div>
    );
  }

  if (view === 'countdown') {
    return (
      <div className="h-[60vh] flex items-center justify-center text-center animate-pulse">
        <div>
          <h3 className="text-sm uppercase tracking-widest text-neutral-500 font-bold mb-2">Battle Begins In</h3>
          <span className="font-spartan text-8xl font-black text-orange-500 drop-shadow-[0_0_30px_#ea580c]">{countdown}</span>
        </div>
      </div>
    );
  }

  if (view === 'arena') {
    return (
      <div className="w-full flex flex-col items-center mt-10">
        <div className="mb-6 flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-neutral-400 font-bold mb-1">Time Remaining</span>
          <div className="px-6 py-2 rounded-full border border-orange-500/40 bg-black/80 shadow-[0_0_20px_#ea580c33]">
            <span className="font-spartan text-3xl font-black text-amber-400">{timeLeft}s</span>
          </div>
        </div>
        <div className="w-full max-w-lg mb-8">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
            <span className="text-orange-400">You: {myTaps}</span>
            <span className="text-red-500">Undead Bot: {oppTaps}</span>
          </div>
          <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 flex">
            <div style={{ width: `${myLeadPct}%` }} className="bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-100" />
            <div style={{ width: `${100 - myLeadPct}%` }} className="bg-gradient-to-l from-red-700 to-purple-800 transition-all duration-100" />
          </div>
        </div>
        <div className="relative my-4">
          {tapsEffect.map(t => (
            <span key={t.id} style={{ left: t.x, top: t.y }} className="absolute text-2xl font-black text-amber-300 pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-ping">+1</span>
          ))}
          <button onClick={handleStrike} className="w-64 h-64 rounded-full bg-[#0a0a0a] border-4 border-orange-500 flex flex-col items-center justify-center relative select-none active:scale-95 transition-transform duration-75 flame-glow">
            <span className="font-spartan text-6xl font-black text-orange-500 drop-shadow-[0_0_20px_#ea580c]">Λ</span>
            <span className="font-spartan text-sm font-black tracking-widest text-amber-400 mt-2 uppercase">STRIKE</span>
          </button>
        </div>
      </div>
    );
  }

  if (view === 'result') {
    return (
      <div className="w-full max-w-md mx-auto mt-10 bg-zinc-950/95 border border-orange-900/60 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_50px_#000000] text-center">
        {winner === 'you' ? (
          <>
            <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-3 drop-shadow-[0_0_20px_#f59e0b]" />
            <h2 className="font-spartan text-4xl font-black text-amber-400 tracking-wider mb-2">VICTORY</h2>
            <div className="bg-amber-950/30 border border-amber-600/30 rounded-xl py-3 px-6 mb-6">
              <span className="text-xl font-bold text-amber-400">+{wager * 2} $SPARTAN</span>
            </div>
          </>
        ) : winner === 'opp' ? (
          <>
            <Skull className="w-16 h-16 text-red-600 mx-auto mb-3 drop-shadow-[0_0_20px_#dc2626]" />
            <h2 className="font-spartan text-4xl font-black text-red-600 tracking-wider mb-2">SLAIN</h2>
            <div className="bg-red-950/30 border border-red-600/30 rounded-xl py-3 px-6 mb-6">
              <span className="text-xl font-bold text-red-500">-{wager} $SPARTAN</span>
            </div>
          </>
        ) : (
          <h2 className="font-spartan text-3xl font-black text-neutral-300 tracking-wider mb-6">DRAW</h2>
        )}
        <button onClick={() => { setView('lobby'); setCountdown(3); }} className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 font-spartan font-black text-sm tracking-widest uppercase shadow-[0_0_20px_#ea580c55] transition-all">
          Return to Games
        </button>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
