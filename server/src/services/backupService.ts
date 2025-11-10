class BackupService {
  private readonly backups: string[] = ["nightly-backup"];

  listBackups(): string[] {
    return [...this.backups];
  }

  triggerBackup(label: string): { message: string; backupId: string } {
    const id = `${label}-${Date.now()}`;
    this.backups.push(id);
    return { message: `Backup ${id} started`, backupId: id };
  }
}

export const backupService = new BackupService();
