export type ReadinessTier = "green" | "yellow" | "red";

export function mapReadinessTier(score: number): ReadinessTier {
  if (score >= 85) {
    return "green";
  }
  if (score >= 65) {
    return "yellow";
  }
  return "red";
}
