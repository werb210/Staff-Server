"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsController = void 0;
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const applications_service_1 = require("./applications.service");
const applications_repository_1 = require("./applications.repository");
const owners_service_1 = require("./owners.service");
const timeline_service_1 = require("./timeline.service");
const creditSummaryEngine_1 = require("../ai/creditSummaryEngine");
const ocr_service_1 = require("../ocr/ocr.service");
const banking_service_1 = require("../banking/banking.service");
const assignSchema = zod_1.z.object({ assignedTo: zod_1.z.string().uuid().nullable().optional() });
class ApplicationsController {
    service;
    owners;
    creditSummaryEngine;
    ocrService;
    bankingService;
    constructor(service, repo = new applications_repository_1.DrizzleApplicationsRepository()) {
        const timeline = new timeline_service_1.TimelineService(repo);
        this.service = service ?? new applications_service_1.ApplicationsService(repo);
        this.owners = new owners_service_1.OwnersService(repo, timeline);
        this.creditSummaryEngine = new creditSummaryEngine_1.CreditSummaryEngine();
        this.ocrService = new ocr_service_1.OcrService();
        this.bankingService = new banking_service_1.BankingService();
    }
    list = async (_req, res, next) => {
        try {
            const apps = await this.service.listApplications();
            res.json(apps);
        }
        catch (err) {
            next(err);
        }
    };
    create = async (req, res, next) => {
        try {
            const app = await this.service.createApplication(req.body, req.user?.id);
            res.status(201).json(app);
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                return res.status(400).json((0, applications_service_1.mapZodError)(err));
            }
            next(err);
        }
    };
    getById = async (req, res, next) => {
        try {
            const app = await this.service.getApplicationWithDetails(req.params.id);
            if (!app)
                return res.status(404).json({ error: "Application not found" });
            res.json(app);
        }
        catch (err) {
            next(err);
        }
    };
    update = async (req, res, next) => {
        try {
            const app = await this.service.updateApplication(req.params.id, req.body, req.user?.id);
            if (!app)
                return res.status(404).json({ error: "Application not found" });
            res.json(app);
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                return res.status(400).json((0, applications_service_1.mapZodError)(err));
            }
            next(err);
        }
    };
    changeStatus = async (req, res, next) => {
        try {
            const app = await this.service.changeStatus(req.params.id, req.body, req.user?.id);
            if (!app)
                return res.status(404).json({ error: "Application not found" });
            res.json(app);
        }
        catch (err) {
            if (err instanceof Error && err.message.includes("Status transition")) {
                return res.status(400).json({ error: err.message });
            }
            if (err instanceof zod_1.ZodError) {
                return res.status(400).json((0, applications_service_1.mapZodError)(err));
            }
            next(err);
        }
    };
    accept = async (req, res, next) => {
        try {
            const app = await this.service.acceptApplication(req.params.id, req.user?.id);
            if (!app)
                return res.status(404).json({ error: "Application not found" });
            res.json(app);
        }
        catch (err) {
            if (err instanceof Error && err.message.includes("Status transition")) {
                return res.status(400).json({ error: err.message });
            }
            next(err);
        }
    };
    decline = async (req, res, next) => {
        try {
            const app = await this.service.declineApplication(req.params.id, req.body, req.user?.id);
            if (!app)
                return res.status(404).json({ error: "Application not found" });
            res.json(app);
        }
        catch (err) {
            if (err instanceof Error && err.message.includes("Status transition")) {
                return res.status(400).json({ error: err.message });
            }
            if (err instanceof zod_1.ZodError) {
                return res.status(400).json((0, applications_service_1.mapZodError)(err));
            }
            next(err);
        }
    };
    assign = async (req, res, next) => {
        try {
            const parsed = assignSchema.parse(req.body);
            const app = await this.service.assignApplication(req.params.id, parsed.assignedTo ?? null, req.user?.id);
            if (!app)
                return res.status(404).json({ error: "Application not found" });
            res.json(app);
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                return res.status(400).json((0, applications_service_1.mapZodError)(err));
            }
            next(err);
        }
    };
    timeline = async (req, res, next) => {
        try {
            const events = await this.service.getTimeline(req.params.id);
            res.json(events);
        }
        catch (err) {
            next(err);
        }
    };
    addOwner = async (req, res, next) => {
        try {
            const owner = await this.owners.addOwner(req.params.id, req.body, req.user?.id);
            res.status(201).json(owner);
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                return res.status(400).json((0, applications_service_1.mapZodError)(err));
            }
            next(err);
        }
    };
    updateOwner = async (req, res, next) => {
        try {
            const owner = await this.owners.updateOwner(req.params.id, req.params.ownerId, req.body, req.user?.id);
            if (!owner)
                return res.status(404).json({ error: "Owner not found" });
            res.json(owner);
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                return res.status(400).json((0, applications_service_1.mapZodError)(err));
            }
            next(err);
        }
    };
    deleteOwner = async (req, res, next) => {
        try {
            await this.owners.deleteOwner(req.params.id, req.params.ownerId, req.user?.id);
            res.status(204).end();
        }
        catch (err) {
            next(err);
        }
    };
    requiredDocs = async (req, res, next) => {
        try {
            const [application] = await db_1.db
                .select()
                .from(schema_1.applications)
                .where((0, drizzle_orm_1.eq)(schema_1.applications.id, req.params.id))
                .limit(1);
            if (!application)
                return res.status(404).json({ error: "Application not found" });
            const lenderProductId = req.query.lenderProductId || application.productSelection?.lenderProductId;
            if (!lenderProductId) {
                return res.json({ applicationId: req.params.id, requiredDocuments: [] });
            }
            const requiredDocuments = await db_1.db
                .select({
                mappingId: schema_1.requiredDocMap.id,
                requiredDocumentId: schema_1.lenderRequiredDocuments.id,
                title: schema_1.lenderRequiredDocuments.title,
                description: schema_1.lenderRequiredDocuments.description,
                category: schema_1.lenderRequiredDocuments.category,
                isMandatory: schema_1.lenderRequiredDocuments.isMandatory,
                isRequired: schema_1.requiredDocMap.isRequired,
            })
                .from(schema_1.requiredDocMap)
                .innerJoin(schema_1.lenderRequiredDocuments, (0, drizzle_orm_1.eq)(schema_1.requiredDocMap.requiredDocumentId, schema_1.lenderRequiredDocuments.id))
                .where((0, drizzle_orm_1.eq)(schema_1.requiredDocMap.lenderProductId, lenderProductId));
            res.json({ applicationId: req.params.id, requiredDocuments });
        }
        catch (err) {
            next(err);
        }
    };
    context = async (req, res, next) => {
        try {
            const applicationId = req.params.id;
            const ocrResults = await this.ocrService.listByApplication(applicationId);
            const banking = await this.bankingService.listByApplication(applicationId);
            const ocrSummaries = ocrResults.map((r) => ({
                documentId: r.documentId,
                categoriesDetected: r.categoriesDetected,
                extractedJson: r.extractedJson,
            }));
            const extractedEntitiesGlobal = ocrResults.flatMap((r) => Object.values(r.extractedJson.globalFields || {})).filter(Boolean);
            const conflictingValues = ocrResults.flatMap((r) => r.conflictingFields || []);
            const ocrDocumentMap = ocrResults.reduce((acc, r) => {
                acc[r.documentId] = r.categoriesDetected;
                return acc;
            }, {});
            const bankingMonthlyBreakdown = banking.flatMap((b) => Object.keys(b.monthlyJson || {}).map((month) => ({ month, transactions: b.monthlyJson[month] })));
            const financialSignals = banking[0]
                ? {
                    revenueTrend: banking[0].metricsJson.monthToMonthRevenueTrend,
                    nsfCount: banking[0].metricsJson.nsfCount,
                    volatilityIndex: banking[0].metricsJson.volatilityIndex,
                }
                : undefined;
            res.json({
                applicationId,
                ocrSummaries,
                bankingSummaries: banking,
                extractedEntitiesGlobal,
                conflictingValues,
                ocrDocumentMap,
                bankingMonthlyBreakdown,
                financialSignals,
            });
        }
        catch (err) {
            next(err);
        }
    };
    regenerateCreditSummary = async (req, res, next) => {
        try {
            const result = await this.creditSummaryEngine.generate({
                applicationId: req.params.id,
                userId: req.user?.id,
                context: req.body.context ?? {},
            });
            res.status(201).json(result);
        }
        catch (err) {
            next(err);
        }
    };
}
exports.ApplicationsController = ApplicationsController;
