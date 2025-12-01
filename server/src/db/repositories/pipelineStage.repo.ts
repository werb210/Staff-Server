const stages = [
  { id: "not-submitted", name: "Not Submitted" },
  { id: "received", name: "Received" },
  { id: "in-review", name: "In Review" },
  { id: "docs-required", name: "Documents Required" },
  { id: "ready-signing", name: "Ready for Signing" },
  { id: "off-to-lender", name: "Off to Lender" },
  { id: "offer", name: "Offer" }
];

export const pipelineStageRepo = {
  async list() {
    return stages;
  }
};

export default pipelineStageRepo;
