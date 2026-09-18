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
  if (!provider?.isPhantom) {
    throw new Error("Open the Phantom extension and unlock it");
  }
  if (!provider.publicKey) {
    await provider.connect();
  }
  if (!provider.publicKey) {
    throw new Error("Phantom did not give a public key. Click the Phantom icon and Connect.");
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
  const player = mustPk(window.solana.publicKey, "player");
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
  escrowTokenAccount,
  winnerTokenAccount,
  jackpotTokenAccount,
}) {
  const program = await getProgram();
  const admin = mustPk(window.solana.publicKey, "admin");
  if (admin.toBase58() !== OPERATOR) {
    throw new Error("Only the operator wallet can settle");
  }
  const [escrowAuthority] = getEscrowPda();
  return program.methods
    .settleMatch()
    .accounts({
      admin,
      escrowAuthority,
      escrowTokenAccount: mustPk(escrowTokenAccount, "escrowTokenAccount"),
      winnerTokenAccount: mustPk(winnerTokenAccount, "winnerTokenAccount"),
      jackpotTokenAccount: mustPk(jackpotTokenAccount, "jackpotTokenAccount"),
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
  const urls = [
    "https://solana-rpc.publicnode.com",
    "https://rpc.ankr.com/solana",
    "https://solana.llamarpc.com",
    "https://1rpc.io/solana",
  ];
  async function byMint(url) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [ownerStr, { mint: SPARTAN_MINT }, { encoding: "jsonParsed" }],
      }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || "rpc error");
    let sum = 0;
    for (const a of json?.result?.value || []) {
      sum += Number(a.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0);
    }
    return sum;
  }
  for (const url of urls) {
    try {
      const spartan = await byMint(url);
      let sol = 0;
      try {
        sol = (await new Connection(url, "confirmed").getBalance(new PublicKey(ownerStr))) / 1e9;
      } catch {}
      return { sol, spartan };
    } catch (e) {
      console.warn("READY rpc fail", url, e);
    }
  }
  return empty;
}


