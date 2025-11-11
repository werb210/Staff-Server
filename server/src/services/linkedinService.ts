import { randomUUID } from "crypto";
import { CreateLinkedInSequenceSchema, LinkedInSequenceSchema } from "../schemas/linkedinSchemas.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

type LinkedInSequence = {
  id: string;
  name: string;
  steps: {
    order: number;
    action: "connect" | "message" | "follow-up";
    content: string;
  }[];
};

class LinkedInService {
  private sequences: LinkedInSequence[] = [];

  constructor() {
    this.sequences.push({
      id: randomUUID(),
      name: "Founders outreach",
      steps: [
        { order: 0, action: "connect", content: "Hi {{name}}, let's connect!" },
        { order: 1, action: "message", content: "Thanks for connecting" },
      ],
    });
  }

  listSequences(): LinkedInSequence[] {
    logInfo("Listing LinkedIn sequences");
    return this.sequences;
  }

  createSequence(payload: unknown): LinkedInSequence {
    const data = parseWithSchema(CreateLinkedInSequenceSchema, payload);
    logInfo("Creating LinkedIn sequence", data);
    const sequence: LinkedInSequence = {
      id: randomUUID(),
      ...data,
    };
    this.sequences.push(sequence);
    return sequence;
  }

  updateSequence(id: string, payload: unknown): LinkedInSequence {
    const data = parseWithSchema(LinkedInSequenceSchema.partial({ id: true }), payload);
    logInfo("Updating LinkedIn sequence", { id, data });
    const sequence = this.sequences.find((item) => item.id === id);
    if (!sequence) {
      throw new Error(`Sequence ${id} not found`);
    }
    Object.assign(sequence, data);
    return sequence;
  }

  deleteSequence(id: string): boolean {
    logInfo("Deleting LinkedIn sequence", { id });
    const before = this.sequences.length;
    this.sequences = this.sequences.filter((sequence) => sequence.id !== id);
    return before !== this.sequences.length;
  }
}

export const linkedinService = new LinkedInService();
