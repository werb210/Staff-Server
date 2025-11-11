export const createSummary = (text: string): string =>
  `Summary: ${text.slice(0, 140)}${text.length > 140 ? "..." : ""}`;

export const createRecommendation = (score: number): string => {
  if (score >= 80) {
    return "Excellent fit based on borrower profile";
  }
  if (score >= 60) {
    return "Good match with minor conditions";
  }
  if (score >= 40) {
    return "Requires manual review";
  }
  return "Not recommended for automatic routing";
};
