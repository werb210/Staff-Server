import { randomUUID } from "node:crypto";
import { documentRequirementSchema, parseDocumentRequirement, type DocumentRequirement } from "../schemas/document.schema.js";

/**
 * Service managing document requirements for applications.
 */
class DocumentRequirementService {
  private readonly requirements = new Map<string, DocumentRequirement>();

  constructor() {
    const seed: DocumentRequirement[] = [
      {
        id: randomUUID(),
        name: "Government Issued ID",
        description: "Upload a clear scan of a government issued identification document.",
        required: true,
        status: "pending"
      },
      {
        id: randomUUID(),
        name: "Financial Statements",
        description: "Provide the latest 3 months of business bank statements.",
        required: true,
        status: "pending"
      }
    ];

    seed.forEach((requirement) => {
      const parsed = parseDocumentRequirement(requirement);
      this.requirements.set(parsed.id, parsed);
    });
  }

  listRequirements(): DocumentRequirement[] {
    return Array.from(this.requirements.values()).map((requirement) => ({ ...requirement }));
  }

  addRequirement(input: Omit<DocumentRequirement, "id">): DocumentRequirement {
    const requirement = documentRequirementSchema.omit({ id: true }).parse(input);
    const created: DocumentRequirement = { ...requirement, id: randomUUID() };
    this.requirements.set(created.id, created);
    return { ...created };
  }
}

export const documentRequirementService = new DocumentRequirementService();
export type { DocumentRequirement } from "../schemas/document.schema.js";
