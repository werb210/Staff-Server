export async function pushLeadToCRM(data: Record<string, unknown>): Promise<void> {
  if (!process.env.CRM_WEBHOOK_URL) {
    return;
  }

  await fetch(process.env.CRM_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
