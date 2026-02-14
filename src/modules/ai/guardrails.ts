const CAPITAL_SOURCE_PHRASE = "We have lenders across different capital types, including Institutional lenders, Banking, and Private Capital sources as well as our own funding offerings.";

const LENDER_NAME_PATTERNS = [
  /\b(on deck|ondeck|bluevine|fundbox|stripe capital|shopify capital|paypal working capital|kabbage)\b/gi,
  /\blender\s+[A-Z][a-z]+/g,
];

const PROMISE_PATTERNS = [
  /\bguaranteed?\b/gi,
  /\bwill\s+be\s+approved\b/gi,
  /\bdefinitely\s+approved\b/gi,
  /\binstant\s+approval\b/gi,
];

const EXPLICIT_RATE_PATTERN = /\b\d+(?:\.\d+)?%\b/g;

export function applyAiGuardrails(input: string): string {
  let output = input.trim();

  for (const pattern of LENDER_NAME_PATTERNS) {
    output = output.replace(pattern, "our lending network");
  }

  for (const pattern of PROMISE_PATTERNS) {
    output = output.replace(pattern, "potential");
  }

  output = output.replace(EXPLICIT_RATE_PATTERN, "a range based on your profile");

  if (!/capital types|private capital sources/i.test(output)) {
    output = `${output}\n\n${CAPITAL_SOURCE_PHRASE}`.trim();
  }

  if (!/subject to underwriting/i.test(output)) {
    output = `${output}\n\nAll funding outcomes are subject to underwriting review.`.trim();
  }

  return output;
}

export { CAPITAL_SOURCE_PHRASE };
