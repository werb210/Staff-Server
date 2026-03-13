import { exportServerRoutesArtifact, DEFAULT_ROUTE_ARTIFACT_PATH } from "../src/system/routeArtifacts";

async function main(): Promise<void> {
  const outputPath = process.argv[2] ?? DEFAULT_ROUTE_ARTIFACT_PATH;
  const absolutePath = await exportServerRoutesArtifact(outputPath);
  console.log(`[routes:export] wrote ${absolutePath}`);
}

main().catch((error) => {
  console.error("[routes:export] failed", error);
  process.exit(1);
});
