interface BackupRecord {
  id: string;
  createdAt: string;
}

/**
 * Stub backup service returning a single record.
 */
class BackupService {
  private readonly backups: BackupRecord[] = [
    {
      id: "backup-1",
      createdAt: new Date().toISOString()
    }
  ];

  listBackups(): BackupRecord[] {
    return [...this.backups];
  }
}

export const backupService = new BackupService();
