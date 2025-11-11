import { backupService } from "../services/backupService.js";

describe("backupService", () => {
  it("records new backups", () => {
    const backup = backupService.createBackup("manual-test");
    expect(backup.status).toBe("pending");
    expect(backupService.listBackups()).toContainEqual(backup);
  });
});
