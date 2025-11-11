import { request } from "./http";
import { Application, PipelineBoardData } from "../types/api";

export const getPipelineBoard = () =>
  request<PipelineBoardData>({
    url: "/api/pipeline",
    method: "GET",
  });

export const transitionPipeline = (payload: {
  applicationId: string;
  toStage: string;
  fromStage?: string;
  assignedTo?: string;
  note?: string;
}) =>
  request<{ application: Application; board: PipelineBoardData }>({
    url: "/api/pipeline/transition",
    method: "POST",
    data: payload,
  });

export const assignPipelineStage = (payload: {
  id: string;
  assignedTo: string;
  stage?: string;
  note?: string;
}) =>
  request<{
    application: Application;
    assignment: {
      id: string;
      assignedTo: string;
      stage?: string;
      assignedAt: string;
      note?: string;
    };
    board: PipelineBoardData;
  }>({
    url: "/api/pipeline/assign",
    method: "POST",
    data: payload,
  });

export const listPipelineAssignments = () =>
  request<PipelineBoardData["assignments"]>({
    url: "/api/pipeline/assignments",
    method: "GET",
  });
