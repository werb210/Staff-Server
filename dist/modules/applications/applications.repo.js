"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApplication = createApplication;
exports.findApplicationById = findApplicationById;
exports.updateApplicationPipelineState = updateApplicationPipelineState;
exports.createDocument = createDocument;
exports.findDocumentById = findDocumentById;
exports.findDocumentByApplicationAndType = findDocumentByApplicationAndType;
exports.listDocumentsByApplicationId = listDocumentsByApplicationId;
exports.getLatestDocumentVersion = getLatestDocumentVersion;
exports.createDocumentVersion = createDocumentVersion;
exports.findDocumentVersionById = findDocumentVersionById;
exports.findDocumentVersionReview = findDocumentVersionReview;
exports.findAcceptedDocumentVersion = findAcceptedDocumentVersion;
exports.createDocumentVersionReview = createDocumentVersionReview;
exports.findLatestDocumentVersionStatus = findLatestDocumentVersionStatus;
exports.listLatestAcceptedDocumentVersions = listLatestAcceptedDocumentVersions;
exports.findActiveDocumentVersion = findActiveDocumentVersion;
const crypto_1 = require("crypto");
const db_1 = require("../../db");
async function createApplication(params) {
    const runner = params.client ?? db_1.pool;
    const res = await runner.query(`insert into applications
     (id, owner_user_id, name, metadata, product_type, pipeline_state, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, now(), now())
     returning id, owner_user_id, name, metadata, product_type, pipeline_state, created_at, updated_at`, [
        (0, crypto_1.randomUUID)(),
        params.ownerUserId,
        params.name,
        params.metadata,
        params.productType,
        "NEW",
    ]);
    return res.rows[0];
}
async function findApplicationById(id, client) {
    const runner = client ?? db_1.pool;
    const res = await runner.query(`select id, owner_user_id, name, metadata, product_type, pipeline_state, created_at, updated_at
     from applications
     where id = $1
     limit 1`, [id]);
    return res.rows[0] ?? null;
}
async function updateApplicationPipelineState(params) {
    const runner = params.client ?? db_1.pool;
    await runner.query(`update applications
     set pipeline_state = $1, updated_at = now()
     where id = $2`, [params.pipelineState, params.applicationId]);
}
async function createDocument(params) {
    const runner = params.client ?? db_1.pool;
    const res = await runner.query(`insert into documents
     (id, application_id, owner_user_id, title, document_type, created_at)
     values ($1, $2, $3, $4, $5, now())
     returning id, application_id, owner_user_id, title, document_type, created_at`, [
        (0, crypto_1.randomUUID)(),
        params.applicationId,
        params.ownerUserId,
        params.title,
        params.documentType,
    ]);
    return res.rows[0];
}
async function findDocumentById(id, client) {
    const runner = client ?? db_1.pool;
    const res = await runner.query(`select id, application_id, owner_user_id, title, document_type, created_at
     from documents
     where id = $1
     limit 1`, [id]);
    return res.rows[0] ?? null;
}
async function findDocumentByApplicationAndType(params) {
    const runner = params.client ?? db_1.pool;
    const res = await runner.query(`select id, application_id, owner_user_id, title, document_type, created_at
     from documents
     where application_id = $1
       and document_type = $2
     limit 1`, [params.applicationId, params.documentType]);
    return res.rows[0] ?? null;
}
async function listDocumentsByApplicationId(applicationId, client) {
    const runner = client ?? db_1.pool;
    const res = await runner.query(`select id, application_id, owner_user_id, title, document_type, created_at
     from documents
     where application_id = $1
     order by created_at asc`, [applicationId]);
    return res.rows;
}
async function getLatestDocumentVersion(documentId, client) {
    const runner = client ?? db_1.pool;
    const res = await runner.query(`select coalesce(max(version), 0) as version
     from document_versions
     where document_id = $1`, [documentId]);
    return Number(res.rows[0]?.version ?? 0);
}
async function createDocumentVersion(params) {
    const runner = params.client ?? db_1.pool;
    const res = await runner.query(`insert into document_versions
     (id, document_id, version, metadata, content, created_at)
     values ($1, $2, $3, $4, $5, now())
     returning id, document_id, version, metadata, content, created_at`, [
        (0, crypto_1.randomUUID)(),
        params.documentId,
        params.version,
        params.metadata,
        params.content,
    ]);
    return res.rows[0];
}
async function findDocumentVersionById(id, client) {
    const runner = client ?? db_1.pool;
    const res = await runner.query(`select id, document_id, version, metadata, content, created_at
     from document_versions
     where id = $1
     limit 1`, [id]);
    return res.rows[0] ?? null;
}
async function findDocumentVersionReview(documentVersionId, client) {
    const runner = client ?? db_1.pool;
    const res = await runner.query(`select id, document_version_id, status, reviewed_by_user_id, reviewed_at
     from document_version_reviews
     where document_version_id = $1
     limit 1`, [documentVersionId]);
    return res.rows[0] ?? null;
}
async function findAcceptedDocumentVersion(params) {
    const runner = params.client ?? db_1.pool;
    const res = await runner.query(`select dv.id, dv.document_id, dv.version, dv.metadata, dv.content, dv.created_at
     from document_versions dv
     join document_version_reviews r on r.document_version_id = dv.id
     where dv.document_id = $1
       and r.status = 'accepted'
     order by dv.version desc
     limit 1`, [params.documentId]);
    return res.rows[0] ?? null;
}
async function createDocumentVersionReview(params) {
    const runner = params.client ?? db_1.pool;
    const res = await runner.query(`insert into document_version_reviews
     (id, document_version_id, status, reviewed_by_user_id, reviewed_at)
     values ($1, $2, $3, $4, now())
     returning id, document_version_id, status, reviewed_by_user_id, reviewed_at`, [(0, crypto_1.randomUUID)(), params.documentVersionId, params.status, params.reviewedByUserId]);
    return res.rows[0];
}
async function findLatestDocumentVersionStatus(params) {
    const runner = params.client ?? db_1.pool;
    const res = await runner.query(`select d.id as document_id,
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
     limit 1`, [params.applicationId, params.documentType]);
    return res.rows[0] ?? null;
}
async function listLatestAcceptedDocumentVersions(params) {
    const runner = params.client ?? db_1.pool;
    const res = await runner.query(`select distinct on (d.document_type)
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
     order by d.document_type, dv.version desc`, [params.applicationId, params.documentTypes]);
    return res.rows;
}
async function findActiveDocumentVersion(params) {
    const runner = params.client ?? db_1.pool;
    const accepted = await runner.query(`select dv.id, dv.document_id, dv.version, dv.metadata, dv.content, dv.created_at
     from document_versions dv
     join document_version_reviews r on r.document_version_id = dv.id
     where dv.document_id = $1
       and r.status = 'accepted'
     order by dv.version desc
     limit 1`, [params.documentId]);
    if (accepted.rows[0]) {
        return accepted.rows[0];
    }
    const latest = await runner.query(`select id, document_id, version, metadata, content, created_at
     from document_versions
     where document_id = $1
     order by version desc
     limit 1`, [params.documentId]);
    return latest.rows[0] ?? null;
}
