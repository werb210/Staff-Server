import { randomUUID } from "crypto";
import { pool } from "../../db";
import { type PoolClient } from "pg";

type Queryable = Pick<PoolClient, "query">;

export type ApplicationRecord = {
  id: string;
  owner_user_id: string;
  name: string;
  metadata: unknown | null;
  pipeline_state: string;
  created_at: Date;
  updated_at: Date;
};

export type DocumentRecord = {
  id: string;
  application_id: string;
  owner_user_id: string;
  title: string;
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

export async function createApplication(params: {
  ownerUserId: string;
  name: string;
  metadata: unknown | null;
  client?: Queryable;
}): Promise<ApplicationRecord> {
  const runner = params.client ?? pool;
  const res = await runner.query<ApplicationRecord>(
    `insert into applications
     (id, owner_user_id, name, metadata, pipeline_state, created_at, updated_at)
     values ($1, $2, $3, $4, $5, now(), now())
     returning id, owner_user_id, name, metadata, pipeline_state, created_at, updated_at`,
    [randomUUID(), params.ownerUserId, params.name, params.metadata, "new"]
  );
  return res.rows[0];
}

export async function findApplicationById(
  id: string,
  client?: Queryable
): Promise<ApplicationRecord | null> {
  const runner = client ?? pool;
  const res = await runner.query<ApplicationRecord>(
    `select id, owner_user_id, name, metadata, pipeline_state, created_at, updated_at
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
  ownerUserId: string;
  title: string;
  client?: Queryable;
}): Promise<DocumentRecord> {
  const runner = params.client ?? pool;
  const res = await runner.query<DocumentRecord>(
    `insert into documents
     (id, application_id, owner_user_id, title, created_at)
     values ($1, $2, $3, $4, now())
     returning id, application_id, owner_user_id, title, created_at`,
    [randomUUID(), params.applicationId, params.ownerUserId, params.title]
  );
  return res.rows[0];
}

export async function findDocumentById(
  id: string,
  client?: Queryable
): Promise<DocumentRecord | null> {
  const runner = client ?? pool;
  const res = await runner.query<DocumentRecord>(
    `select id, application_id, owner_user_id, title, created_at
     from documents
     where id = $1
     limit 1`,
    [id]
  );
  return res.rows[0] ?? null;
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
