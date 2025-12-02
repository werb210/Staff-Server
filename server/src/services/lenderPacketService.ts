import auditService from "./auditService.js";

export const lenderPacketService = {
  async recordSend(applicationId: string, lenderId: string, payload: any) {
    return auditService.logEvent({
      eventType: "LENDER_PACKET_SENT",
      applicationId,
      details: { lenderId, ...payload },
      createdAt: new Date(),
    });
  },
};

export default lenderPacketService;
