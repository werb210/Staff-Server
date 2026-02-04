import {
  getOcrFieldDefinitionByKey,
  getOcrFieldRegistry,
  type OcrFieldDefinition,
} from "../../../ocr/ocrFieldRegistry";
import { listOcrFieldsForApplication } from "../../ocr/ocr.repo";

export type OcrFieldSource = {
  documentId: string;
  page: number | null;
};

export type OcrInsightField = {
  value: string;
  confidence: number;
  sources: OcrFieldSource[];
};

export type OcrInsightsSummary = {
  complete: boolean;
  missingFields: string[];
  conflictingFields: string[];
  warnings: string[];
};

export type OcrInsightsResponse = {
  fields: Record<string, OcrInsightField>;
  missingFields: string[];
  conflictingFields: string[];
  warnings: string[];
};

const NUMERIC_CATEGORIES = new Set([
  "balance_sheet",
  "income_statement",
  "cash_flow",
  "ar",
  "ap",
  "inventory",
  "equipment",
]);

const NUMERIC_RELATIVE_TOLERANCE = 0.01;
const NUMERIC_ABSOLUTE_TOLERANCE = 1;

function normalizeTextValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseNumericValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed
    .replace(/\(([^)]+)\)/g, "-$1")
    .replace(/[^0-9.-]/g, "")
    .replace(/(\..*)\./g, "$1");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function valuesWithinTolerance(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  const scale = Math.max(Math.abs(a), Math.abs(b));
  const tolerance = Math.max(NUMERIC_ABSOLUTE_TOLERANCE, scale * NUMERIC_RELATIVE_TOLERANCE);
  return diff <= tolerance;
}

function isNumericField(field: OcrFieldDefinition | undefined): boolean {
  if (!field) {
    return false;
  }
  return NUMERIC_CATEGORIES.has(field.category);
}

function toSortedUnique(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function analyzeOcrFields(params: {
  entries: Array<{
    fieldKey: string;
    value: string;
  }>;
}): OcrInsightsSummary {
  const registry = getOcrFieldRegistry();
  const valuesByField = new Map<string, string[]>();

  params.entries.forEach((entry) => {
    const normalized = normalizeTextValue(entry.value);
    if (!normalized) {
      return;
    }
    const existing = valuesByField.get(entry.fieldKey) ?? [];
    existing.push(normalized);
    valuesByField.set(entry.fieldKey, existing);
  });

  const missingFields: string[] = [];
  const conflictingFields: string[] = [];
  const warnings: string[] = [];

  registry.forEach((field) => {
    const values = valuesByField.get(field.key) ?? [];
    if (field.required && values.length === 0) {
      missingFields.push(field.key);
      if (field.warnIfMissing) {
        warnings.push(`Missing ${field.label}`);
      }
      return;
    }

    if (values.length > 1) {
      const numeric = isNumericField(field);
      if (numeric) {
        const uniqueGroups: number[] = [];
        values.forEach((value) => {
          const parsed = parseNumericValue(value);
          if (parsed === null) {
            return;
          }
          if (!uniqueGroups.some((existing) => valuesWithinTolerance(existing, parsed))) {
            uniqueGroups.push(parsed);
          }
        });
        if (uniqueGroups.length > 1) {
          conflictingFields.push(field.key);
          if (field.warnIfConflicting) {
            warnings.push(`Conflicting ${field.label}`);
          }
        }
      } else {
        const unique = toSortedUnique(values);
        if (unique.length > 1) {
          conflictingFields.push(field.key);
          if (field.warnIfConflicting) {
            warnings.push(`Conflicting ${field.label}`);
          }
        }
      }
    }
  });

  const complete = missingFields.length === 0 && conflictingFields.length === 0;
  return {
    complete,
    missingFields: toSortedUnique(missingFields),
    conflictingFields: toSortedUnique(conflictingFields),
    warnings: toSortedUnique(warnings),
  };
}

export async function analyzeOcrForApplication(
  applicationId: string
): Promise<OcrInsightsSummary> {
  const rows = await listOcrFieldsForApplication(applicationId);
  return analyzeOcrFields({
    entries: rows.map((row) => ({
      fieldKey: row.field_key,
      value: row.value,
    })),
  });
}

export async function getOcrInsightsForApplication(
  applicationId: string
): Promise<OcrInsightsResponse> {
  const rows = await listOcrFieldsForApplication(applicationId);
  const summary = analyzeOcrFields({
    entries: rows.map((row) => ({ fieldKey: row.field_key, value: row.value })),
  });

  const fields: Record<string, OcrInsightField> = {};

  rows.forEach((row) => {
    const existing = fields[row.field_key];
    const source: OcrFieldSource = {
      documentId: row.document_id,
      page: row.page,
    };
    if (!existing) {
      fields[row.field_key] = {
        value: row.value,
        confidence: row.confidence,
        sources: [source],
      };
      return;
    }
    existing.sources.push(source);
    if (row.confidence > existing.confidence) {
      existing.value = row.value;
      existing.confidence = row.confidence;
    }
  });

  getOcrFieldRegistry().forEach((field) => {
    if (!fields[field.key]) {
      return;
    }
    const normalizedValue = normalizeTextValue(fields[field.key].value);
    if (normalizedValue) {
      fields[field.key].value = normalizedValue;
    }
  });

  return {
    fields,
    missingFields: summary.missingFields,
    conflictingFields: summary.conflictingFields,
    warnings: summary.warnings,
  };
}

export function isNumericOcrField(fieldKey: string): boolean {
  return isNumericField(getOcrFieldDefinitionByKey(fieldKey));
}
