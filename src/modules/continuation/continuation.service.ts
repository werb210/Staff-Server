import { randomUUID } from "node:crypto";
import { pool } from "../../db";

export type ContinuationPayload = {
  companyName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  industry?: string;
  yearsInBusiness?: number | string;
  monthlyRevenue?: number | string;
  annualRevenue?: number | string;
  arBalance?: number | string;
  collateralAvailable?: boolean | string;
  prefillToken?: string;
};

function toNullableNumber(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableInteger(value: number | string | undefined): number | null {
  const parsed = toNullableNumber(value);
  if (parsed === null) {
    return null;
  }
  return Math.trunc(parsed);
}

export async function createContinuation(
  payload: ContinuationPayload,
  crmLeadId: string
): Promise<string> {
  const token = randomUUID();

  await pool.query(
    `
    INSERT INTO application_continuations (
      token,
      prefill_json,
      company_name,
      full_name,
      email,
      phone,
      industry,
      years_in_business,
      monthly_revenue,
      annual_revenue,
      crm_lead_id
    )
    VALUES ($1,$2::jsonb,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `,
    [
      token,
      JSON.stringify(payload),
      payload.companyName ?? null,
      payload.fullName ?? null,
      payload.email ?? null,
      payload.phone ?? null,
      payload.industry ?? null,
      toNullableInteger(payload.yearsInBusiness),
      toNullableNumber(payload.monthlyRevenue),
      toNullableNumber(payload.annualRevenue),
      crmLeadId,
    ]
  );

  return token;
}

export async function getContinuation(token: string): Promise<Record<string, unknown> | null> {
  const { rows } = await pool.query(
    "SELECT * FROM application_continuations WHERE token = $1",
    [token]
  );

  return rows[0] ?? null;
}

export async function convertContinuation(
  token: string,
  applicationId: string
): Promise<void> {
  await pool.query(
    `
    UPDATE application_continuations
    SET converted_application_id = $1,
        converted_at = NOW()
    WHERE token = $2
    `,
    [applicationId, token]
  );
}
