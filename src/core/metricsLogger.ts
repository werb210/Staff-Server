import { logInfo } from "../observability/logger";

export async function recordMetric(
  metric: string,
  value: number,
  tags: Record<string, string>
): Promise<void> {
  logInfo("metric_recorded", {
    metric,
    value,
    tags,
  });
}
