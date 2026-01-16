import { randomUUID } from "crypto";
import { pool } from "../../db";
import { type PoolClient } from "pg";

type Queryable = Pick<PoolClient, "query">;

export type ApplicationRecord = {
  id: string;
  owner_user_id: string | null;
  name: string;
  metadata: unknown | null;
  product_type: string;
  pipeline_state: string;
  created_at: Date;
  updated_at: Date;
};

export type DocumentRecord = {
  id: string;
  application_id: string;
  owner_user_id: string | null;
  title: string;
  document_type: string;
  created_at: Date;
};

export type DocumentVersionRecord = {
  id: string;
  document_id: string;
  version: number;
  metadata: unknown;
  content: string;
  created_at: Date;
};

export type DocumentVersionReviewRecord = {
  id: string;
  document_version_id: string;
  status: string;
  reviewed_by_user_id: string | null;
  reviewed_at: Date;
};

export async function createApplication(params: {
  ownerUserId: string | null;
  name: string;
  metadata: unknown | null;
  productType: string;
  pipelineState?: string;
  client?: Queryable;
}): Promise<ApplicationRecord> {
  const runner = params.client ?? pool;
  const pipelineState = params.pipelineState ?? "NEW";
  const res = await runner.query<ApplicationRecord>(
    `insert into applications
     (id, owner_user_id, name, metadata, product_type, pipeline_state, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, now(), now())
     returning id, owner_user_id, name, metadata, product_type, pipeline_state, created_at, updated_at`,
    [
      randomUUID(),
      params.ownerUserId,
      params.name,
      params.metadata,
      params.productType,
      pipelineState,
    ]
  );
  return res.rows[0];
}

export async function findApplicationById(
  id: string,
  client?: Queryable
): Promise<ApplicationRecord | null> {
  const runner = client ?? pool;
  const res = await runner.query<ApplicationRecord>(
    `select id, owner_user_id, name, metadata, product_type, pipeline_state, created_at, updated_at
     from applications
     where id = $1
     limit 1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function updateApplicationPipelineState(params: {
  applicationId: string;
  pipelineState: string;
  client?: Queryable;
}): Promise<void> {
  const runner = params.client ?? pool;
  await runner.query(
    `update applications
     set pipeline_state = $1, updated_at = now()
     where id = $2`,
    [params.pipelineState, params.applicationId]
  );
}

export async function createDocument(params: {
  applicationId: string;
  ownerUserId: string | null;
  title: string;
  documentType: string;
  client?: Queryable;
}): Promise<DocumentRecord> {
  const runner = params.client ?? pool;
  const res = await runner.query<DocumentRecord>(
    `insert into documents
     (id, application_id, owner_user_id, title, document_type, created_at)
     values ($1, $2, $3, $4, $5, now())
     returning id, application_id, owner_user_id, title, document_type, created_at`,
    [
      randomUUID(),
      params.applicationId,
      params.ownerUserId,
      params.title,
      params.documentType,
    ]
  );
  return res.rows[0];
}

export async function findDocumentById(
  id: string,
  client?: Queryable
): Promise<DocumentRecord | null> {
  const runner = client ?? pool;
  const res = await runner.query<DocumentRecord>(
    `select id, application_id, owner_user_id, title, document_type, created_at
     from documents
     where id = $1
     limit 1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function findDocumentByApplicationAndType(params: {
  applicationId: string;
  documentType: string;
  client?: Queryable;
}): Promise<DocumentRecord | null> {
  const runner = params.client ?? pool;
  const res = await runner.query<DocumentRecord>(
    `select id, application_id, owner_user_id, title, document_type, created_at
     from documents
     where application_id = $1
       and document_type = $2
     limit 1`,
    [params.applicationId, params.documentType]
  );
  return res.rows[0] ?? null;
}

export async function listDocumentsByApplicationId(
  applicationId: string,
  client?: Queryable
): Promise<DocumentRecord[]> {
  const runner = client ?? pool;
  const res = await runner.query<DocumentRecord>(
    `select id, application_id, owner_user_id, title, document_type, created_at
     from documents
     where application_id = $1
     order by created_at asc`,
    [applicationId]
  );
  return res.rows;
}

export async function getLatestDocumentVersion(
  documentId: string,
  client?: Queryable
): Promise<number> {
  const runner = client ?? pool;
  const res = await runner.query<{ version: number }>(
    `select coalesce(max(version), 0) as version
     from document_versions
     where document_id = $1`,
    [documentId]
  );
  return Number(res.rows[0]?.version ?? 0);
}

export async function createDocumentVersion(params: {
  documentId: string;
  version: number;
  metadata: unknown;
  content: string;
  client?: Queryable;
}): Promise<DocumentVersionRecord> {
  const runner = params.client ?? pool;
  const res = await runner.query<DocumentVersionRecord>(
    `insert into document_versions
     (id, document_id, version, metadata, content, created_at)
     values ($1, $2, $3, $4, $5, now())
     returning id, document_id, version, metadata, content, created_at`,
    [
      randomUUID(),
      params.documentId,
      params.version,
      params.metadata,
      params.content,
    ]
  );
  return res.rows[0];
}

export async function findDocumentVersionById(
  id: string,
  client?: Queryable
): Promise<DocumentVersionRecord | null> {
  const runner = client ?? pool;
  const res = await runner.query<DocumentVersionRecord>(
    `select id, document_id, version, metadata, content, created_at
     from document_versions
     where id = $1
     limit 1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function findDocumentVersionReview(
  documentVersionId: string,
  client?: Queryable
): Promise<DocumentVersionReviewRecord | null> {
  const runner = client ?? pool;
  const res = await runner.query<DocumentVersionReviewRecord>(
    `select id, document_version_id, status, reviewed_by_user_id, reviewed_at
     from document_version_reviews
     where document_version_id = $1
     limit 1`,
    [documentVersionId]
  );
  return res.rows[0] ?? null;
}

export async function findAcceptedDocumentVersion(params: {
  documentId: string;
  client?: Queryable;
}): Promise<DocumentVersionRecord | null> {
  const runner = params.client ?? pool;
  const res = await runner.query<DocumentVersionRecord>(
    `select dv.id, dv.document_id, dv.version, dv.metadata, dv.content, dv.created_at
     from document_versions dv
     join document_version_reviews r on r.document_version_id = dv.id
     where dv.document_id = $1
       and r.status = 'accepted'
     order by dv.version desc
     limit 1`,
    [params.documentId]
  );
  return res.rows[0] ?? null;
}

export async function createDocumentVersionReview(params: {
  documentVersionId: string;
  status: string;
  reviewedByUserId: string | null;
  client?: Queryable;
}): Promise<DocumentVersionReviewRecord> {
  const runner = params.client ?? pool;
  const res = await runner.query<DocumentVersionReviewRecord>(
    `insert into document_version_reviews
     (id, document_version_id, status, reviewed_by_user_id, reviewed_at)
     values ($1, $2, $3, $4, now())
     returning id, document_version_id, status, reviewed_by_user_id, reviewed_at`,
    [randomUUID(), params.documentVersionId, params.status, params.reviewedByUserId]
  );
  return res.rows[0];
}

export async function findLatestDocumentVersionStatus(params: {
  applicationId: string;
  documentType: string;
  client?: Queryable;
}): Promise<{
  document_id: string;
  document_type: string;
  version_id: string;
  version: number;
  status: string | null;
} | null> {
  const runner = params.client ?? pool;
  const res = await runner.query<{
    document_id: string;
    document_type: string;
    version_id: string;
    version: number;
    status: string | null;
  }>(
    `select d.id as document_id,
            d.document_type,
            dv.id as version_id,
            dv.version,
            r.status
     from documents d
     join document_versions dv on dv.document_id = d.id
     left join document_version_reviews r on r.document_version_id = dv.id
     where d.application_id = $1
       and d.document_type = $2
     order by dv.version desc
     limit 1`,
    [params.applicationId, params.documentType]
  );
  return res.rows[0] ?? null;
}

export async function listLatestAcceptedDocumentVersions(params: {
  applicationId: string;
  documentTypes: string[];
  client?: Queryable;
}): Promise<
  Array<{
    document_id: string;
    document_type: string;
    title: string;
    version_id: string;
    version: number;
    metadata: unknown;
    content: string;
  }>
> {
  const runner = params.client ?? pool;
  const res = await runner.query<{
    document_id: string;
    document_type: string;
    title: string;
    version_id: string;
    version: number;
    metadata: unknown;
    content: string;
  }>(
    `select distinct on (d.document_type)
        d.id as document_id,
        d.document_type,
        d.title,
        dv.id as version_id,
        dv.version,
        dv.metadata,
        dv.content
     from documents d
     join document_versions dv on dv.document_id = d.id
     join document_version_reviews r on r.document_version_id = dv.id
     where d.application_id = $1
       and d.document_type = any($2)
       and r.status = 'accepted'
     order by d.document_type, dv.version desc`,
    [params.applicationId, params.documentTypes]
  );
  return res.rows;
}

export async function findActiveDocumentVersion(params: {
  documentId: string;
  client?: Queryable;
}): Promise<DocumentVersionRecord | null> {
  const runner = params.client ?? pool;
  const accepted = await runner.query<DocumentVersionRecord>(
    `select dv.id, dv.document_id, dv.version, dv.metadata, dv.content, dv.created_at
     from document_versions dv
     join document_version_reviews r on r.document_version_id = dv.id
     where dv.document_id = $1
       and r.status = 'accepted'
     order by dv.version desc
     limit 1`,
    [params.documentId]
  );
  if (accepted.rows[0]) {
    return accepted.rows[0];
  }
  const latest = await runner.query<DocumentVersionRecord>(
    `select id, document_id, version, metadata, content, created_at
     from document_versions
     where document_id = $1
     order by version desc
     limit 1`,
    [params.documentId]
  );
  return latest.rows[0] ?? null;
}
