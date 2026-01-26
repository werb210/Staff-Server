export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;

export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];
export type RequiredDocuments = JsonObject[];
export type Eligibility = JsonObject | null;

export type LenderProductRecord = {
  id: string;
  lender_id: string;
  name: string;
  description: string | null;
  active: boolean;
  required_documents: RequiredDocuments;
  eligibility: Eligibility;
  created_at: Date;
  updated_at: Date;
};
