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
  const signer = [provider, window.__spartanWallet]
    .find((w) => w && typeof w.signTransaction === "function") || provider;
  const wallet = {
    publicKey: provider.publicKey || signer.publicKey,
    signTransaction: async (tx) => {
      if (typeof signer.signTransaction !== "function") {
        throw new Error("Reconnect a wallet from the list");
      }
      return signer.signTransaction(tx);
    },
    signAllTransactions: async (txs) => {
      if (typeof signer.signAllTransactions === "function") return signer.signAllTransactions(txs);
      const out = [];
      for (const tx of txs) out.push(await signer.signTransaction(tx));
      return out;
    },
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
  const {
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
  } = await import("@solana/web3.js");
  const provider = await getPhantom();
  const owner = mustPk(provider.publicKey, "owner");
  const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
  const TOKEN_LEGACY = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const mintInfo = await connection.getAccountInfo(mint);
  const tokenProgram = mintInfo && mintInfo.owner.equals(TOKEN_2022) ? TOKEN_2022 : TOKEN_LEGACY;
  const playerTokenAccount = await getAssociatedTokenAddress(mint, owner, false, tokenProgram);
  const rawAmt = BigInt(Math.floor(Number(amountUi) * 10 ** SPARTAN_DECIMALS));
  if (rawAmt <= 0n) throw new Error("Wager is zero");
  const [escrowAuthority] = getEscrowPda();
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("global:deposit_stake")));
  const data = Buffer.alloc(16);
  Buffer.from(hash.subarray(0, 8)).copy(data, 0);
  data.writeBigUInt64LE(rawAmt, 8);
  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: playerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: mustPk(ESCROW_TOKEN_ACCOUNT, "escrowTokenAccount"), isSigner: false, isWritable: true },
      { pubkey: escrowAuthority, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    data,
  });
  const latest = await connection.getLatestBlockhash("confirmed");
  const msg = new TransactionMessage({
    payerKey: owner,
    recentBlockhash: latest.blockhash,
    instructions: [ix],
  }).compileToV0Message();
  const vtx = new VersionedTransaction(msg);

  const pickSig = (value) => {
    if (value == null) return null;
    if (typeof value === "string" && value.length >= 32) return value;
    const bytes = value instanceof Uint8Array ? value
      : value?.signature instanceof Uint8Array ? value.signature
      : value?.result?.signature instanceof Uint8Array ? value.result.signature
      : null;
    if (bytes && bytes.length === 64) {
      const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
      let n = 0n;
      for (const b of bytes) n = (n << 8n) + BigInt(b);
      let out = "";
      while (n > 0n) {
        const i = Number(n % 58n);
        n = n / 58n;
        out = ALPHA[i] + out;
      }
      for (const b of bytes) {
        if (b === 0) out = "1" + out;
        else break;
      }
      return out;
    }
    if (typeof value?.signature === "string") return value.signature;
    if (typeof value?.txid === "string") return value.txid;
    if (typeof value?.result === "string") return value.result;
    return null;
  };

  const serialized = vtx.serialize();
  let signature = null;
  const signed = await provider.signTransaction(vtx);
  const raw = signed instanceof Uint8Array
    ? signed
    : (signed?.signedTransaction || (signed?.serialize ? signed.serialize() : null));
  if (!raw) throw new Error("Wallet signed but returned no bytes");
  signature = await connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 3 });

  if (!signature) {
    const stdWallet = provider._wallet || window.__spartanWallet?._wallet;
    const featSign = stdWallet?.features?.["solana:signTransaction"];
    const account = provider._account || stdWallet?.accounts?.[0];
    try {
      if (false) {
        signature = null;
      } else if (featSign && account) {
        const out = await featSign.signTransaction({
          transaction: serialized,
          account,
        });
        const raw = out?.signedTransaction || out;
        signature = await connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 3 });
      }
    } catch (e) {
      throw new Error("Jupiter/standard send failed: " + String(e?.message || e));
    }
  }
  if (!signature) {
    const names = Object.keys(provider || {}).join(",");
    throw new Error("Wallet did not return a signature. Methods: " + names);
  }
  return signature;
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



