import React from "react";

export default function WalletModal({ open, wallets, onPick, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-black mb-1">Connect wallet</h3>
        <p className="text-xs text-white/50 mb-4">$Spartan is on Solana. Pick a wallet.</p>
        <div className="space-y-2">
          {wallets.map((w) => (
            <button key={w.id} onClick={() => onPick(w)} className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold">
              {w.name}
              {w.note && <span className="block text-[10px] text-red-300 font-medium">{w.note}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
