import { Buffer } from "buffer";
if (!globalThis.Buffer) globalThis.Buffer = Buffer;
if (!globalThis.process) globalThis.process = { env: {} };

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import idl from "./idl/spartan_arena.json";
import {
  PROGRAM_ID,
  SPARTAN_MINT,
  TREASURY,
  OPERATOR,
  ESCROW_SEED,
  ESCROW_TOKEN_ACCOUNT,
} from "./vault.js";

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SPARTAN_DECIMALS = 9;

export const connection = new Connection("https://solana-rpc.publicnode.com", "confirmed");
export const programId = new PublicKey(PROGRAM_ID);
export const mint = new PublicKey(SPARTAN_MINT);
export const treasury = new PublicKey(TREASURY);
export const operator = new PublicKey(OPERATOR);

function mustPk(value, label) {
  try {
    if (value instanceof PublicKey) return value;
    const s = String(value || "").trim();
    if (!s) throw new Error("empty");
    return new PublicKey(s);
  } catch (e) {
    throw new Error("Bad address for " + label + ": " + String(value) + " (" + (e.message || e) + ")");
  }
}

export function getEscrowPda() {
  return PublicKey.findProgramAddressSync([Buffer.from(ESCROW_SEED)], programId);
}

async function getPhantom() {
  const provider = window.__spartanWallet || window?.phantom?.solana || window?.solana;
  if (!provider) {
    throw new Error("Connect a wallet first");
  }
  if (!provider.publicKey && provider.connect) {
    await provider.connect();
  }
  if (!provider.publicKey) {
    throw new Error("Wallet did not give a public key. Click Connect again.");
  }
  return provider;
}

async function getProgram() {
  const provider = await getPhantom();
  const wallet = {
    publicKey: provider.publicKey,
    signTransaction: (tx) => provider.signTransaction(tx),
    signAllTransactions: (txs) => provider.signAllTransactions(txs),
  };
  const anchorProvider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const idlFixed = {
    ...idl,
    address: PROGRAM_ID,
    metadata: { ...(idl.metadata || {}), address: PROGRAM_ID },
  };
  return new anchor.Program(idlFixed, anchorProvider);
}

export async function depositStake({ amount, playerTokenAccount, escrowTokenAccount }) {
  const program = await getProgram();
  const player = mustPk((window.__spartanWallet||window.solana).publicKey, "player");
  const [escrowAuthority] = getEscrowPda();
  return program.methods
    .depositStake(new anchor.BN(String(amount)))
    .accounts({
      player,
      playerTokenAccount: mustPk(playerTokenAccount, "playerTokenAccount"),
      escrowTokenAccount: mustPk(escrowTokenAccount, "escrowTokenAccount"),
      escrowAuthority,
      tokenProgram: TOKEN_PROGRAM,
    })
    .rpc();
}

export async function settleMatch({
  amountUi,
  winnerTokenAccount,
  jackpotTokenAccount,
}) {
  const program = await getProgram();
  const adminPk = window.__spartanWallet?.publicKey || window.solana?.publicKey;
  const admin = mustPk(adminPk, "admin");
  if (admin.toBase58() !== OPERATOR) {
    throw new Error("Only the operator wallet can settle");
  }
  const raw = BigInt(Math.round(Number(amountUi) * 1e9));
  if (raw <= 0n) throw new Error("settle amount must be > 0");
  const [escrowAuthority] = getEscrowPda();
  return program.methods
    .settleMatch(new anchor.BN(raw.toString()))
    .accounts({
      admin,
      escrowAuthority,
      escrowTokenAccount: mustPk(ESCROW_TOKEN_ACCOUNT, "escrowTokenAccount"),
      winnerTokenAccount: mustPk(winnerTokenAccount, "winnerTokenAccount"),
      jackpotTokenAccount: mustPk(jackpotTokenAccount || TREASURY_ATA, "jackpotTokenAccount"),
      spartanMint: mint,
      tokenProgram: TOKEN_PROGRAM,
    })
    .rpc();
}

export async function lockStakeOnChain(amountUi) {
  const provider = await getPhantom();
  const owner = mustPk(provider.publicKey, "owner");
  const playerTokenAccount = await getAssociatedTokenAddress(mint, owner);
  const raw = BigInt(Math.floor(Number(amountUi) * 10 ** SPARTAN_DECIMALS));
  if (raw <= 0n) throw new Error("Wager is zero");
  return depositStake({
    amount: raw.toString(),
    playerTokenAccount: playerTokenAccount.toBase58(),
    escrowTokenAccount: ESCROW_TOKEN_ACCOUNT,
  });
}


export async function getWalletBalances(ownerPk) {
  const empty = { sol: 0, spartan: 0 };
  const raw = ownerPk || window.__spartanWallet?.publicKey || window?.phantom?.solana?.publicKey || window?.solana?.publicKey;
  if (!raw) return empty;
  const ownerStr = typeof raw.toBase58 === "function" ? raw.toBase58() : String(raw);
  try {
    const r = await fetch("/api/balance?owner=" + encodeURIComponent(ownerStr));
    const j = await r.json();
    return { sol: Number(j.sol) || 0, spartan: Number(j.spartan) || 0 };
  } catch (e) {
    console.warn("READY api", e);
    return empty;
  }
}



