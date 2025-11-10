// Auto-generated stub by Codex
// Stub backup service exposing a simple trigger

class BackupService {
  listBackups(): string[] {
    return ["nightly-backup"];
  }
}

export const backupService = new BackupService();
