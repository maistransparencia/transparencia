import { dispatchRadarDigest } from "../lib/radar-digest";

function parseArgs() {
  const args = process.argv.slice(2);
  let portalSlug = "porciuncula_prefeitura";
  let ano: number | undefined;
  let dryRun = false;
  let baseUrl: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--portal" && args[i + 1]) {
      portalSlug = args[i + 1];
      i++;
    } else if (arg.startsWith("--portal=")) {
      portalSlug = arg.split("=")[1];
    } else if (arg === "--ano" && args[i + 1]) {
      ano = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (arg.startsWith("--ano=")) {
      ano = Number.parseInt(arg.split("=")[1], 10);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--base-url" && args[i + 1]) {
      baseUrl = args[i + 1];
      i++;
    } else if (arg.startsWith("--base-url=")) {
      baseUrl = arg.split("=")[1];
    }
  }

  return { portalSlug, ano, dryRun, baseUrl };
}

async function main() {
  const { portalSlug, ano, dryRun, baseUrl } = parseArgs();
  if (baseUrl) {
  }

  const result = await dispatchRadarDigest({
    portalSlug,
    ano,
    dryRun,
    baseUrl,
  });

  if (result.errors.length > 0) {
    for (const _err of result.errors) {
    }
  }

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((_error) => {
  process.exit(1);
});
