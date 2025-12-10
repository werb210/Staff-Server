import { OcrCategory, OcrExtractedJson, OcrGlobalFields } from "./ocr.types";

const categoryKeywords: Record<OcrCategory, RegExp[]> = {
  balance_sheet: [/balance sheet/i, /assets/i, /liabilities/i],
  income_statement: [/income statement/i, /revenue/i, /expenses/i],
  cash_flow: [/cash flow/i, /operating activities/i],
  taxes: [/irs/i, /tax/i],
  contracts: [/contract/i, /agreement/i],
  invoices: [/invoice/i, /bill/i],
};

const globalPatterns = {
  sinOrSsn: /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g,
  websiteUrls: /https?:\/\/[\w./-]+/gi,
  phoneNumbers: /\+?\d?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  emails: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  legalNames: /(Inc\.|LLC|Corporation|Corp\.)/gi,
  addresses: /\d+\s+[^,\n]+\,?\s+[A-Za-z ]+\,?\s*[A-Z]{2}\s*\d{5}/g,
};

export function extractCategories(rawText: string): { categories: Partial<Record<OcrCategory, string>>; detected: OcrCategory[] } {
  const categories: Partial<Record<OcrCategory, string>> = {};
  const detected: OcrCategory[] = [];
  (Object.keys(categoryKeywords) as OcrCategory[]).forEach((category) => {
    const hit = categoryKeywords[category].some((regex) => regex.test(rawText));
    if (hit) {
      categories[category] = rawText;
      detected.push(category);
    }
  });
  return { categories, detected };
}

export function extractGlobalFields(rawText: string): OcrGlobalFields {
  return {
    sinOrSsn: rawText.match(globalPatterns.sinOrSsn) ?? undefined,
    websiteUrls: rawText.match(globalPatterns.websiteUrls) ?? undefined,
    phoneNumbers: rawText.match(globalPatterns.phoneNumbers) ?? undefined,
    emails: rawText.match(globalPatterns.emails) ?? undefined,
    legalNames: rawText.match(globalPatterns.legalNames) ?? undefined,
    addresses: rawText.match(globalPatterns.addresses) ?? undefined,
  };
}

export function buildExtractedJson(rawText: string): OcrExtractedJson {
  const { categories, detected } = extractCategories(rawText);
  const globalFields = extractGlobalFields(rawText);
  return {
    rawText,
    categories,
    globalFields,
  };
}

export function mergeConflicts(existing: OcrExtractedJson[], current: OcrExtractedJson) {
  const conflicts: { field: keyof OcrGlobalFields; values: string[] }[] = [];
  const fields: (keyof OcrGlobalFields)[] = ["sinOrSsn", "websiteUrls", "phoneNumbers", "emails", "legalNames", "addresses"];
  fields.forEach((field) => {
    const values = new Set<string>();
    existing.forEach((item) => (item.globalFields[field] || []).forEach((value) => values.add(value)));
    (current.globalFields[field] || []).forEach((value) => values.add(value));
    if (values.size > 1) {
      conflicts.push({ field, values: Array.from(values) });
    }
  });
  return conflicts;
}

export function summarizeCategories(extracted: OcrExtractedJson[]): Record<string, OcrCategory[]> {
  const map: Record<string, OcrCategory[]> = {};
  extracted.forEach((item, idx) => {
    const categories = Object.keys(item.categories) as OcrCategory[];
    map[idx.toString()] = categories;
  });
  return map;
}
