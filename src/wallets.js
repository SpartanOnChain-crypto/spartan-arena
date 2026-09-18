export function listWallets() {
  const list = [];
  if (window?.phantom?.solana?.isPhantom || window?.solana?.isPhantom) {
    list.push({ id: "phantom", name: "Phantom", provider: window.phantom?.solana || window.solana });
  }
  if (window?.solflare?.isSolflare || window?.solflare) {
    list.push({ id: "solflare", name: "Solflare", provider: window.solflare });
  }
  if (window?.backpack?.isBackpack || window?.backpack) {
    list.push({ id: "backpack", name: "Backpack", provider: window.backpack });
  }
  if (window?.jupiter?.isJupiter || window?.JupiterWallet || window?.jupiterWallet) {
    list.push({ id: "jupiter", name: "Jupiter", provider: window.jupiter || window.JupiterWallet || window.jupiterWallet });
  }
  list.push({
    id: "metamask",
    name: "MetaMask",
    provider: null,
    note: "Ethereum only. $Spartan is on Solana.",
  });
  if (!list.find((w) => w.id === "phantom")) {
    list.unshift({ id: "phantom-missing", name: "Phantom (not installed)", provider: null, note: "Install the Phantom extension" });
  }
  return list;
}

export async function connectProvider(provider) {
  if (!provider) throw new Error("Wallet not installed");
  const resp = await provider.connect();
  const pk = resp?.publicKey || provider.publicKey;
  if (!pk) throw new Error("Wallet did not return a public key");
  window.__spartanWallet = provider;
  return pk;
}
