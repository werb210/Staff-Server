import express from "express";
import request from "supertest";
import { randomUUID } from "crypto";
import {
  applicantOwners,
  applicationStatusHistory,
  applicationTimelineEvents,
  applications,
} from "../db/schema";
import { ApplicationsController } from "../applications/applications.controller";
import { ApplicationsService } from "../applications/applications.service";
import { PipelineService } from "../applications/pipeline.service";
import { ApplicationRecord, ApplicationsRepository, OwnerRecord } from "../applications/types";
import { createApplicationsRouter } from "../applications/applications.routes";

class InMemoryApplicationsRepository implements ApplicationsRepository {
  applications: ApplicationRecord[] = [];
  owners: OwnerRecord[] = [];
  statusHistory: (typeof applicationStatusHistory.$inferSelect)[] = [];
  timeline: (typeof applicationTimelineEvents.$inferSelect)[] = [];

  async createApplication(data: typeof applications.$inferInsert) {
    const record: ApplicationRecord = {
      id: data.id ?? randomUUID(),
      status: data.status!,
      productCategory: data.productCategory!,
      kycData: data.kycData ?? {},
      businessData: data.businessData ?? {},
      applicantData: data.applicantData ?? {},
      productSelection: data.productSelection ?? {},
      signatureData: data.signatureData ?? {},
      creditSummaryVersion: (data as any).creditSummaryVersion ?? 0,
      assignedTo: data.assignedTo ?? null,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    };
    this.applications.push(record);
    return record;
  }

  async updateApplication(id: string, updates: Partial<ApplicationRecord>) {
    const existing = this.applications.find((a) => a.id === id);
    if (!existing) return null;
    Object.assign(existing, updates);
    existing.updatedAt = new Date();
    return { ...existing };
  }

  async findApplicationById(id: string) {
    const found = this.applications.find((a) => a.id === id);
    return found ? { ...found } : null;
  }

  async listApplications() {
    return this.applications.map((a) => ({ ...a }));
  }

  async listOwners(applicationId: string) {
    return this.owners.filter((o) => o.applicationId === applicationId).map((o) => ({ ...o }));
  }

  async createOwner(applicationId: string, data: Omit<typeof applicantOwners.$inferInsert, "applicationId">) {
    const record: OwnerRecord = {
      id: data.id ?? randomUUID(),
      applicationId,
      firstName: data.firstName!,
      lastName: data.lastName!,
      email: data.email!,
      phone: data.phone!,
      address: data.address!,
      city: data.city!,
      state: data.state!,
      zip: data.zip!,
      dob: data.dob!,
      ssn: data.ssn!,
      ownershipPercentage: data.ownershipPercentage!,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    };
    this.owners.push(record);
    return record;
  }

  async updateOwner(ownerId: string, updates: Partial<OwnerRecord>) {
    const existing = this.owners.find((o) => o.id === ownerId);
    if (!existing) return null;
    Object.assign(existing, updates);
    existing.updatedAt = new Date();
    return { ...existing };
  }

  async deleteOwner(ownerId: string) {
    this.owners = this.owners.filter((o) => o.id !== ownerId);
  }

  async addStatusHistory(entry: typeof applicationStatusHistory.$inferInsert) {
    this.statusHistory.push({
      id: entry.id ?? randomUUID(),
      applicationId: entry.applicationId!,
      fromStatus: (entry as any).fromStatus ?? null,
      toStatus: entry.toStatus!,
      timestamp: entry.timestamp ?? new Date(),
      changedBy: entry.changedBy ?? null,
    });
  }

  async listStatusHistory(applicationId: string) {
    return this.statusHistory.filter((s) => s.applicationId === applicationId);
  }

  async addTimelineEvent(event: typeof applicationTimelineEvents.$inferInsert) {
    this.timeline.push({
      id: event.id ?? randomUUID(),
      applicationId: event.applicationId!,
      eventType: event.eventType!,
      metadata: event.metadata ?? {},
      timestamp: event.timestamp ?? new Date(),
      actorUserId: event.actorUserId ?? null,
    });
  }

  async listTimeline(applicationId: string) {
    return this.timeline.filter((t) => t.applicationId === applicationId);
  }
}

function createTestApp(repo: InMemoryApplicationsRepository) {
  const service = new ApplicationsService(repo, new PipelineService());
  const controller = new ApplicationsController(service, repo);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = {
      id: "staff-user",
      email: "staff@example.com",
      role: "Admin" as any,
      status: "active" as any,
      sessionId: "test-session",
    };
    next();
  });
  app.use("/applications", createApplicationsRouter(controller));
  return app;
}

const samplePayload = {
  productCategory: "working_capital" as const,
  kycData: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "1234567890",
  },
  businessData: {
    legalName: "John LLC",
    ein: "12-3456789",
    industry: "Services",
    yearsInBusiness: 3,
    address: { address: "1 St", city: "Town", state: "CA", zip: "90001" },
  },
  applicantData: {
    firstName: "John",
    lastName: "Doe",
    title: "Owner",
    email: "john@example.com",
    phone: "1234567890",
    address: { address: "1 St", city: "Town", state: "CA", zip: "90001" },
  },
  productSelection: {
    requestedAmount: 50000,
    useOfFunds: "Expansion",
  },
  signatureData: { signedBy: "John Doe" },
};

describe("Applications engine", () => {
  let repo: InMemoryApplicationsRepository;
  let app: express.Express;

  beforeEach(() => {
    repo = new InMemoryApplicationsRepository();
    app = createTestApp(repo);
  });

  test("creates a new application with all steps and auto pipeline status", async () => {
    const response = await request(app).post("/applications").send(samplePayload);
    expect(response.status).toBe(201);
    expect(response.body.status).toBe("requires_docs");
    expect(response.body.kycData.firstName).toBe("John");

    const timeline = await request(app).get(`/applications/${response.body.id}/timeline`);
    expect(timeline.body.map((t: any) => t.eventType)).toContain("application_created");
    expect(repo.statusHistory).toHaveLength(1);
  });

  test("adds multiple owners and retrieves them", async () => {
    const created = await request(app).post("/applications").send(samplePayload);
    const appId = created.body.id;

    const ownerA = {
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      phone: "111-222-3333",
      address: "123 Main",
      city: "Town",
      state: "CA",
      zip: "90001",
      dob: "1990-01-01",
      ssn: "1234",
      ownershipPercentage: 60,
    };

    const ownerB = { ...ownerA, email: "bob@example.com", firstName: "Bob", ownershipPercentage: 40 };

    expect(await request(app).post(`/applications/${appId}/owners`).send(ownerA)).toHaveProperty("status", 201);
    expect(await request(app).post(`/applications/${appId}/owners`).send(ownerB)).toHaveProperty("status", 201);

    const fetched = await request(app).get(`/applications/${appId}`);
    expect(fetched.body.owners).toHaveLength(2);
  });

  test("supports dynamic pipeline transitions and finality rules", async () => {
    const created = await request(app).post("/applications").send(samplePayload);
    const appId = created.body.id;

    const toReview = await request(app).patch(`/applications/${appId}/status`).send({ status: "review" });
    expect(toReview.body.status).toBe("review");

    const accepted = await request(app).patch(`/applications/${appId}/status`).send({ status: "accepted" });
    expect(accepted.body.status).toBe("accepted");

    const invalid = await request(app).patch(`/applications/${appId}/status`).send({ status: "review" });
    expect(invalid.status).toBe(400);
  });

  test("records timeline events for updates and owner changes", async () => {
    const created = await request(app).post("/applications").send(samplePayload);
    const appId = created.body.id;

    await request(app).put(`/applications/${appId}`).send({ productSelection: { requestedAmount: 75000, useOfFunds: "Hiring" } });

    await request(app)
      .post(`/applications/${appId}/owners`)
      .send({
        firstName: "Owner",
        lastName: "One",
        email: "one@example.com",
        phone: "1234567",
        address: "123",
        city: "City",
        state: "CA",
        zip: "90001",
        dob: "1990-01-01",
        ssn: "1234",
        ownershipPercentage: 100,
      });

    const timeline = await request(app).get(`/applications/${appId}/timeline`);
    const events = timeline.body.map((t: any) => t.eventType);
    expect(events).toEqual(expect.arrayContaining(["application_updated", "owner_added"]));
  });

  test("returns full application payload including owners and history", async () => {
    const created = await request(app).post("/applications").send(samplePayload);
    const appId = created.body.id;

    await request(app)
      .post(`/applications/${appId}/owners`)
      .send({
        firstName: "Owner",
        lastName: "Two",
        email: "two@example.com",
        phone: "1234567",
        address: "123",
        city: "City",
        state: "CA",
        zip: "90001",
        dob: "1990-01-01",
        ssn: "1234",
        ownershipPercentage: 100,
      });

    const fetched = await request(app).get(`/applications/${appId}`);
    expect(fetched.body.statusHistory?.length).toBeGreaterThanOrEqual(1);
    expect(fetched.body.owners?.length).toBe(1);
  });

  test("rejects invalid owner payloads with validation errors", async () => {
    const created = await request(app).post("/applications").send(samplePayload);
    const response = await request(app)
      .post(`/applications/${created.body.id}/owners`)
      .send({ firstName: "Bad" });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
  });
});
