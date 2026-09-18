// Spartan Arena vault plug — 95% winner / 3% treasury / 2% burn
export const PROGRAM_ID = "Dw8c9YJLzv8m3EiKcwdCg2DiQPPeJAB3bwTfqRRe3riN";
export const SPARTAN_MINT = "8omgduFEjztUuJy1gpo2rzpX95FA9n6y96NAEVdRT6oi";
export const TREASURY = "8sYXvt5WSk1SVJ8UmWPLSTAYapZ1BBf2VbQECSPF2H34";
export const OPERATOR = "2fzt95p1oznswzeAFNcpv86qjN4bVSoeJ7dMQXurN59y";
export const ESCROW_SEED = "escrow";
export const ESCROW_TOKEN_ACCOUNT = "AX5CTvHHK7NATgmUb9LYn8eEr11QeQniHhvDMgkNkuhv";
export const ESCROW_AUTHORITY = "FqLiuZsE4wGeeknfAz9YVdmjC6EdMZL1aYNwUF4qQGfp";

export const SPLIT = {
  winnerBps: 95,
  treasuryBps: 3,
  burnBps: 2,
};

export function splitPot(total) {
  const winner = Math.floor((total * SPLIT.winnerBps) / 100);
  const treasury = Math.floor((total * SPLIT.treasuryBps) / 100);
  const burn = total - winner - treasury;
  return { winner, treasury, burn };
}
