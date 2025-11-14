import type { Application, ApplicationStage } from "@prisma/client";
import {
  prisma,
  requireUserSiloAccess,
  type Silo,
  type UserContext,
} from "./prisma.js";

type PipelineBoard = {
  silo: Silo;
  stages: Record<ApplicationStage, Application[]>;
};

type MovePayload = {
  stage?: ApplicationStage;
};

export const pipelineService = {
  async getBoard(user: UserContext, silo: Silo): Promise<PipelineBoard> {
    requireUserSiloAccess(user.silos, silo);

    const applications = await prisma.application.findMany({
      where: { silo },
      orderBy: { createdAt: "desc" },
    });

    const stages: Record<ApplicationStage, Application[]> = {
      NEW: [],
      IN_REVIEW: [],
      REQUIRES_DOCS: [],
      READY_FOR_LENDERS: [],
      SENT_TO_LENDER: [],
      ACCEPTED: [],
      DECLINED: [],
    };

    for (const app of applications) {
      stages[app.stage].push(app);
    }

    return { silo, stages };
  },

  async move(
    user: UserContext,
    silo: Silo,
    appId: string,
    payload: MovePayload
  ): Promise<Application | null> {
    requireUserSiloAccess(user.silos, silo);

    if (!payload.stage) {
      throw new Error("Missing target stage for pipeline move");
    }

    const existing = await prisma.application.findFirst({ where: { id: appId, silo } });
    if (!existing) return null;

    return prisma.application.update({
      where: { id: appId },
      data: { stage: payload.stage },
    });
  },
};
