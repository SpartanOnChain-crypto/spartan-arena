const MINT = "8omgduFEjztUuJy1gpo2rzpX95FA9n6y96NAEVdRT6oi";
const URLS = [
  "https://solana-rpc.publicnode.com",
  "https://rpc.ankr.com/solana",
  "https://solana.llamarpc.com",
];

async function byMint(url, owner) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [owner, { mint: MINT }, { encoding: "jsonParsed" }],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  let sum = 0;
  for (const a of json?.result?.value || []) {
    sum += Number(a.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0);
  }
  return sum;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const owner = req.query?.owner;
  if (!owner) {
    res.status(400).json({ error: "owner required", spartan: 0 });
    return;
  }
  for (const url of URLS) {
    try {
      const spartan = await byMint(url, owner);
      res.status(200).json({ spartan, sol: 0 });
      return;
    } catch (e) {}
  }
  res.status(200).json({ spartan: 0, sol: 0, error: "rpc" });
}
