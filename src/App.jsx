import { createRoot } from 'react-dom/client';
import React, { useState, useEffect } from 'react';
import { Shield, Trophy, Wallet, Skull, Bot } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [view, setView] = useState('lobby'); 
  const [wager, setWager] = useState(100);
  const [roomCode, setRoomCode] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);
  
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(10.0);
  const [myTaps, setMyTaps] = useState(0);
  const [oppTaps, setOppTaps] = useState(0);
  const [winner, setWinner] = useState(null);

  const [tapsEffect, setTapsEffect] = useState([]);

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
  };

  const startPractice = () => {
    if (!wallet) connectWallet();
    setIsAiMode(true);
    setRoomCode("ARENA-" + Math.floor(1000 + Math.random() * 9000));
    setCountdown(3);
    setView('countdown');
  };

  const createMatch = () => {
    if (!wallet) connectWallet();
    setIsAiMode(false);
    setRoomCode("SPRT" + Math.floor(10 + Math.random() * 89));
    setCountdown(3);
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
      if (isAiMode && Math.random() > 0.3) {
        setOppTaps(o => o + 1);
      }
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

    return () => {
      clearInterval(timer);
      clearInterval(aiInterval);
    };
  }, [view, myTaps, oppTaps, isAiMode]);

  const handleStrike = (e) => {
    if (view !== 'arena' || timeLeft <= 0) return;
    setMyTaps(t => t + 1);

    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setTapsEffect(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => {
      setTapsEffect(prev => prev.filter(item => item.id !== id));
    }, 600);
  };

  const settleMatch = () => {
    setView('result');
    if (myTaps > oppTaps) {
      setWinner('you');
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } else if (oppTaps > myTaps) {
      setWinner('opp');
    } else {
      setWinner('tie');
    }
  };

  const totalTaps = myTaps + oppTaps || 1;
  const myLeadPct = Math.min(100, Math.max(0, (myTaps / totalTaps) * 100));

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 flex flex-col justify-between relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,#b91c1c22,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_90%,#ea580c15,transparent_50%)] pointer-events-none" />

      <header className="w-full border-b border-orange-950/40 bg-black/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-orange-600/50 bg-black flex items-center justify-center shadow-[0_0_15px_#ea580c44]">
            <span className="font-spartan text-xl font-black text-orange-500">Λ</span>
          </div>
          <div>
            <h1 className="font-spartan text-lg font-black tracking-widest text-amber-500 uppercase">The Sparta Arena</h1>
            <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Web3 PvP Combat</p>
          </div>
        </div>

        <button 
          onClick={connectWallet}
          className="flex items-center gap-2 border border-purple-500/40 bg-purple-950/20 hover:bg-purple-900/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 text-purple-300 shadow-[0_0_15px_#9945ff22]"
        >
          <Wallet className="w-4 h-4 text-purple-400" />
          {wallet ? wallet : "Connect Blade"}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 max-w-4xl mx-auto w-full">
        {view === 'lobby' && (
          <div className="w-full max-w-md bg-zinc-950/90 border border-orange-900/40 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative text-center">
            <div className="flex justify-center mb-4">
              <Skull className="w-16 h-16 text-orange-600 drop-shadow-[0_0_15px_#ea580c]" />
            </div>
            
            <h2 className="font-spartan text-2xl font-black text-amber-400 tracking-wider mb-1">ENTER THE COLOSSEUM</h2>
            <p className="text-sm text-neutral-400 mb-6">10-Second PvP Tap Battles for $Spartan</p>

            <div className="bg-black/60 border border-orange-900/30 rounded-xl p-4 mb-6">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2 text-left">Wager Stake ($Spartan)</label>
              <div className="flex items-center justify-between gap-3">
                {[50, 100, 250, 500].map(amt => (
                  <button 
                    key={amt} 
                    onClick={() => setWager(amt)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${wager === amt ? 'border-orange-500 bg-orange-600/20 text-orange-400 shadow-[0_0_10px_#ea580c44]' : 'border-neutral-800 bg-neutral-900/50 text-neutral-400'}`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={createMatch}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-700 via-orange-600 to-amber-600 font-spartan font-black text-sm tracking-widest uppercase hover:brightness-110 shadow-[0_0_25px_#ea580c66] transition-all"
              >
                Summon Challenger
              </button>

              <button 
                onClick={startPractice}
                className="w-full py-3 rounded-xl border border-neutral-800 bg-neutral-900/60 font-semibold text-xs tracking-wider uppercase hover:border-orange-800 text-neutral-300 transition-all flex items-center justify-center gap-2"
              >
                <Bot className="w-4 h-4 text-orange-500" />
                Practice vs Undead Bot
              </button>
            </div>
          </div>
        )}

        {view === 'countdown' && (
          <div className="text-center animate-pulse">
            <h3 className="text-sm uppercase tracking-widest text-neutral-500 font-bold mb-2">Battle Begins In</h3>
            <span className="font-spartan text-8xl font-black text-orange-500 drop-shadow-[0_0_30px_#ea580c]">{countdown}</span>
          </div>
        )}

        {view === 'arena' && (
          <div className="w-full flex flex-col items-center">
            <div className="mb-6 flex flex-col items-center">
              <span className="text-xs uppercase tracking-widest text-neutral-400 font-bold mb-1">Time Remaining</span>
              <div className="px-6 py-2 rounded-full border border-orange-500/40 bg-black/80 shadow-[0_0_20px_#ea580c33]">
                <span className="font-spartan text-3xl font-black text-amber-400">{timeLeft}s</span>
              </div>
            </div>

            <div className="w-full max-w-lg mb-8">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                <span className="text-orange-400">You: {myTaps}</span>
                <span className="text-red-500">{isAiMode ? "Undead Xerxes" : "Opponent"}: {oppTaps}</span>
              </div>
              <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 flex">
                <div style={{ width: `${myLeadPct}%` }} className="bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-100" />
                <div style={{ width: `${100 - myLeadPct}%` }} className="bg-gradient-to-l from-red-700 to-purple-800 transition-all duration-100" />
              </div>
            </div>

            <div className="relative my-4">
              {tapsEffect.map(t => (
                <span 
                  key={t.id} 
                  style={{ left: t.x, top: t.y }} 
                  className="absolute text-2xl font-black text-amber-300 pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-ping"
                >
                  +1
                </span>
              ))}

              <button 
                onClick={handleStrike}
                className="w-64 h-64 rounded-full bg-[#0a0a0a] border-4 border-orange-500 flex flex-col items-center justify-center relative select-none active:scale-95 transition-transform duration-75 flame-glow"
              >
                <span className="font-spartan text-6xl font-black text-orange-500 drop-shadow-[0_0_20px_#ea580c]">Λ</span>
                <span className="font-spartan text-sm font-black tracking-widest text-amber-400 mt-2 uppercase">STRIKE</span>
              </button>
            </div>
          </div>
        )}

        {view === 'result' && (
          <div className="w-full max-w-md bg-zinc-950/95 border border-orange-900/60 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_50px_#000000] text-center">
            {winner === 'you' ? (
              <>
                <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-3 drop-shadow-[0_0_20px_#f59e0b]" />
                <h2 className="font-spartan text-4xl font-black text-amber-400 tracking-wider mb-2">VICTORY</h2>
                <p className="text-neutral-400 text-sm mb-4">You claimed the spoils of combat!</p>
                <div className="bg-amber-950/30 border border-amber-600/30 rounded-xl py-3 px-6 mb-6">
                  <span className="text-xl font-bold text-amber-400">+{wager * 2} $SPARTAN</span>
                </div>
              </>
            ) : winner === 'opp' ? (
              <>
                <Skull className="w-16 h-16 text-red-600 mx-auto mb-3 drop-shadow-[0_0_20px_#dc2626]" />
                <h2 className="font-spartan text-4xl font-black text-red-600 tracking-wider mb-2">SLAIN</h2>
                <p className="text-neutral-400 text-sm mb-4">You were bested in the arena.</p>
                <div className="bg-red-950/30 border border-red-600/30 rounded-xl py-3 px-6 mb-6">
                  <span className="text-xl font-bold text-red-500">-{wager} $SPARTAN</span>
                </div>
              </>
            ) : (
              <>
                <Shield className="w-16 h-16 text-neutral-400 mx-auto mb-3" />
                <h2 className="font-spartan text-3xl font-black text-neutral-300 tracking-wider mb-2">DRAW</h2>
                <p className="text-neutral-400 text-sm mb-4">Honor was equal. Stakes refunded.</p>
              </>
            )}

            <button 
              onClick={() => setView('lobby')}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 font-spartan font-black text-sm tracking-widest uppercase hover:brightness-110 shadow-[0_0_20px_#ea580c55] transition-all"
            >
              Return to Camp
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-orange-950/20 py-4 px-6 text-center text-xs text-neutral-600 z-10 uppercase tracking-widest font-semibold">
        The Sparta Arena • Solana Network
      </footer>
    </div>
  );
}
const root = createRoot(document.getElementById('root'));
root.render(<App />);
