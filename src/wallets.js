const CATALOG = [
  { id: "phantom", name: "Phantom", install: "https://phantom.app/download" },
  { id: "solflare", name: "Solflare", install: "https://solflare.com" },
  { id: "backpack", name: "Backpack", install: "https://backpack.app" },
  { id: "jupiter", name: "Jupiter", install: "https://jup.ag/wallet" },
  { id: "metamask", name: "MetaMask", install: "https://metamask.io/download" },
  { id: "rabby", name: "Rabby", install: "https://rabby.io" },
  { id: "coinbase", name: "Coinbase Wallet", install: "https://www.coinbase.com/wallet" },
  { id: "brave", name: "Brave Wallet", install: "https://brave.com/wallet" },
];

function detect(id) {
  if (id === "phantom") return window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
  if (id === "solflare") return window.solflare || null;
  if (id === "backpack") return window.backpack || null;
  if (id === "jupiter") return window.jupiter || window.JupiterWallet || window.jupiterWallet || null;
  if (id === "metamask") return window.metamask || window.ethereum?.solana || null;
  if (id === "rabby") return window.rabby?.solana || window.rabby || null;
  if (id === "coinbase") return window.coinbaseSolana || window.coinbaseWalletExtension || null;
  if (id === "brave") return window.braveSolana || (window.solana && !window.solana.isPhantom ? window.solana : null);
  return null;
}

function fromStandard() {
  const found = [];
  try {
    window.dispatchEvent(
      new CustomEvent("wallet-standard:app-ready", {
        detail: {
          register(wallet) {
            if (!wallet?.name) return;
            found.push({
              id: "std-" + wallet.name.toLowerCase().replace(/\s+/g, "-"),
              name: wallet.name,
              provider: {
                async connect() {
                  const feat = wallet.features["standard:connect"];
                  if (!feat) throw new Error(wallet.name + " cannot connect");
                  const { accounts } = await feat.connect();
                  const acc = accounts?.[0];
                  if (!acc) throw new Error(wallet.name + " gave no account");
                  const { PublicKey } = await import("@solana/web3.js");
                  const publicKey = new PublicKey(acc.address);
                  this.publicKey = publicKey;
                  this._account = acc;
                  this._wallet = wallet;
                  return { publicKey };
                },
                publicKey: null,
              },
            });
          },
        },
      })
    );
  } catch {}
  return found;
}

export function listWallets() {
  const standard = fromStandard();
  const list = CATALOG.map((item) => {
    const std = standard.find((s) => s.name.toLowerCase().includes(item.id) || s.name.toLowerCase() === item.name.toLowerCase());
    const provider = std?.provider || detect(item.id);
    return {
      ...item,
      provider,
      note: provider ? null : "Not installed in this browser",
    };
  });
  for (const s of standard) {
    if (!list.some((w) => w.name.toLowerCase() === s.name.toLowerCase())) {
      list.push({ id: s.id, name: s.name, provider: s.provider });
    }
  }
  return list;
}

export async function connectProvider(provider) {
  if (!provider) throw new Error("Install that wallet, refresh this page, then connect");
  const resp = await provider.connect();
  const pk = resp?.publicKey || provider.publicKey;
  if (!pk) throw new Error("Wallet did not return a Solana address");
  window.__spartanWallet = provider;
  return pk;
}
