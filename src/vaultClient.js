import { Buffer } from "buffer";
if (!globalThis.Buffer) globalThis.Buffer = Buffer;
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getMint } from "@solana/spl-token";
import idl from "./idl/spartan_arena.json";
import { PROGRAM_ID, SPARTAN_MINT, TREASURY, OPERATOR, ESCROW_SEED, ESCROW_TOKEN_ACCOUNT } from "./vault.js";

export const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
export const programId = new PublicKey(PROGRAM_ID);
export const mint = new PublicKey(SPARTAN_MINT);
export const treasury = new PublicKey(TREASURY);
export const operator = new PublicKey(OPERATOR);

export function getEscrowPda() {
  return PublicKey.findProgramAddressSync([Buffer.from(ESCROW_SEED)], programId);
}

async function getProgram() {
  const provider = window?.solana;
  if (!provider?.isPhantom) {
    throw new Error("Open Phantom and connect first");
  }
  if (!provider.publicKey) {
    await provider.connect();
  }
  if (!provider.publicKey) {
    throw new Error("Phantom did not return a public key. Unlock Phantom and connect again.");
  }
  const wallet = {
    publicKey: provider.publicKey,
    signTransaction: (tx) => provider.signTransaction(tx),
    signAllTransactions: (txs) => provider.signAllTransactions(txs),
  };
  const anchorProvider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const idlFixed = { ...idl, address: PROGRAM_ID };
  return new anchor.Program(idlFixed, anchorProvider);
}

export async function depositStake({ amount, playerTokenAccount, escrowTokenAccount }) {
  const program = await getProgram();
  const [escrowAuthority] = getEscrowPda();
  return program.methods
    .depositStake(new anchor.BN(amount))
    .accounts({
      player: program.provider.publicKey,
      playerTokenAccount: new PublicKey(playerTokenAccount),
      escrowTokenAccount: new PublicKey(escrowTokenAccount),
      escrowAuthority,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

export async function settleMatch({
  escrowTokenAccount,
  winnerTokenAccount,
  jackpotTokenAccount,
}) {
  const program = await getProgram();
  if (program.provider.publicKey.toBase58() !== OPERATOR) {
    throw new Error("Only the operator wallet can settle");
  }
  const [escrowAuthority] = getEscrowPda();
  return program.methods
    .settleMatch()
    .accounts({
      admin: program.provider.publicKey,
      escrowAuthority,
      escrowTokenAccount: new PublicKey(escrowTokenAccount),
      winnerTokenAccount: new PublicKey(winnerTokenAccount),
      jackpotTokenAccount: new PublicKey(jackpotTokenAccount),
      spartanMint: mint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}


export async function lockStakeOnChain(amountUi) {
  const program = await getProgram();
  const owner = window.solana.publicKey;
  if (!owner) throw new Error("Phantom did not return a public key. Unlock Phantom and click Connect in the Phantom popup.");
  const playerTokenAccount = await getAssociatedTokenAddress(mint, owner);
  const raw = BigInt(Math.floor(Number(amountUi) * (10 ** 6)));
  return depositStake({
    amount: raw.toString(),
    playerTokenAccount: playerTokenAccount.toBase58(),
    escrowTokenAccount: ESCROW_TOKEN_ACCOUNT,
  });
}
