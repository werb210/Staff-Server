import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { applications as applicationsTable, lenderRequiredDocuments, requiredDocMap } from "../db/schema";
import { ApplicationsService, mapZodError } from "./applications.service";
import { DrizzleApplicationsRepository } from "./applications.repository";
import { OwnersService } from "./owners.service";
import { TimelineService } from "./timeline.service";
import { ApplicationsRepository } from "./types";
import { CreditSummaryEngine } from "../ai/creditSummaryEngine";
import { OcrService } from "../ocr/ocr.service";
import { BankingService } from "../banking/banking.service";

const assignSchema = z.object({ assignedTo: z.string().uuid().nullable().optional() });

export class ApplicationsController {
  private service: ApplicationsService;
  private owners: OwnersService;
  private creditSummaryEngine: CreditSummaryEngine;
  private ocrService: OcrService;
  private bankingService: BankingService;

  constructor(service?: ApplicationsService, repo: ApplicationsRepository = new DrizzleApplicationsRepository()) {
    const timeline = new TimelineService(repo);
    this.service = service ?? new ApplicationsService(repo);
    this.owners = new OwnersService(repo, timeline);
    this.creditSummaryEngine = new CreditSummaryEngine();
    this.ocrService = new OcrService();
    this.bankingService = new BankingService();
  }

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const apps = await this.service.listApplications();
      res.json({ items: apps ?? [] });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = await this.service.createApplication(req.body, req.user?.id);
      res.status(201).json(app);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json(mapZodError(err));
      }
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = await this.service.getApplicationWithDetails(req.params.id);
      if (!app) return res.status(404).json({ error: "Application not found" });
      res.json(app);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = await this.service.updateApplication(req.params.id, req.body, req.user?.id);
      if (!app) return res.status(404).json({ error: "Application not found" });
      res.json(app);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json(mapZodError(err));
      }
      next(err);
    }
  };

  changeStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = await this.service.changeStatus(req.params.id, req.body, req.user?.id);
      if (!app) return res.status(404).json({ error: "Application not found" });
      res.json(app);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Status transition")) {
        return res.status(400).json({ error: err.message });
      }
      if (err instanceof ZodError) {
        return res.status(400).json(mapZodError(err));
      }
      next(err);
    }
  };

  accept = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = await this.service.acceptApplication(req.params.id, req.user?.id);
      if (!app) return res.status(404).json({ error: "Application not found" });
      res.json(app);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Status transition")) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  };

  decline = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = await this.service.declineApplication(req.params.id, req.body, req.user?.id);
      if (!app) return res.status(404).json({ error: "Application not found" });
      res.json(app);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Status transition")) {
        return res.status(400).json({ error: err.message });
      }
      if (err instanceof ZodError) {
        return res.status(400).json(mapZodError(err));
      }
      next(err);
    }
  };

  assign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = assignSchema.parse(req.body);
      const app = await this.service.assignApplication(req.params.id, parsed.assignedTo ?? null, req.user?.id);
      if (!app) return res.status(404).json({ error: "Application not found" });
      res.json(app);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json(mapZodError(err));
      }
      next(err);
    }
  };

  timeline = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const events = await this.service.getTimeline(req.params.id);
      res.json(events);
    } catch (err) {
      next(err);
    }
  };

  addOwner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const owner = await this.owners.addOwner(req.params.id, req.body, req.user?.id);
      res.status(201).json(owner);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json(mapZodError(err));
      }
      next(err);
    }
  };

  updateOwner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const owner = await this.owners.updateOwner(req.params.id, req.params.ownerId, req.body, req.user?.id);
      if (!owner) return res.status(404).json({ error: "Owner not found" });
      res.json(owner);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json(mapZodError(err));
      }
      next(err);
    }
  };

  deleteOwner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.owners.deleteOwner(req.params.id, req.params.ownerId, req.user?.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  requiredDocs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [application] = await db
        .select()
        .from(applicationsTable)
        .where(eq(applicationsTable.id, req.params.id))
        .limit(1);

      if (!application) return res.status(404).json({ error: "Application not found" });

      const lenderProductId =
        (req.query.lenderProductId as string | undefined) || (application.productSelection as any)?.lenderProductId;

      if (!lenderProductId) {
        return res.json({ applicationId: req.params.id, requiredDocuments: [] });
      }

      const requiredDocuments = await db
        .select({
          mappingId: requiredDocMap.id,
          requiredDocumentId: lenderRequiredDocuments.id,
          title: lenderRequiredDocuments.title,
          description: lenderRequiredDocuments.description,
          category: lenderRequiredDocuments.category,
          isMandatory: lenderRequiredDocuments.isMandatory,
          isRequired: requiredDocMap.isRequired,
        })
        .from(requiredDocMap)
        .innerJoin(lenderRequiredDocuments, eq(requiredDocMap.requiredDocumentId, lenderRequiredDocuments.id))
        .where(eq(requiredDocMap.lenderProductId, lenderProductId));

      res.json({ applicationId: req.params.id, requiredDocuments });
    } catch (err) {
      next(err);
    }
  };

  context = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = req.params.id;
      const ocrResults = await this.ocrService.listByApplication(applicationId);
      const banking = await this.bankingService.listByApplication(applicationId);

      const ocrSummaries = ocrResults.map((r) => ({
        documentId: (r as any).documentId,
        categoriesDetected: r.categoriesDetected,
        extractedJson: r.extractedJson,
      }));

      const extractedEntitiesGlobal = ocrResults.flatMap((r) => Object.values(r.extractedJson.globalFields || {})).filter(Boolean);
      const conflictingValues = ocrResults.flatMap((r) => r.conflictingFields || []);
      const ocrDocumentMap = ocrResults.reduce<Record<string, any>>((acc, r) => {
        acc[(r as any).documentId] = r.categoriesDetected;
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
    } catch (err) {
      next(err);
    }
  };

  regenerateCreditSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.creditSummaryEngine.generate({
        applicationId: req.params.id,
        userId: req.user?.id,
        context: req.body.context ?? {},
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };
}
