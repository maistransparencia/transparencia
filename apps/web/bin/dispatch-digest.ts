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
      portalSlug = arg.slice(arg.indexOf("=") + 1);
    } else if (arg === "--ano" && args[i + 1]) {
      const parsed = Number.parseInt(args[i + 1], 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        ano = parsed;
      }
      i++;
    } else if (arg.startsWith("--ano=")) {
      const parsed = Number.parseInt(arg.slice(arg.indexOf("=") + 1), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        ano = parsed;
      }
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--base-url" && args[i + 1]) {
      baseUrl = args[i + 1];
      i++;
    } else if (arg.startsWith("--base-url=")) {
      baseUrl = arg.slice(arg.indexOf("=") + 1);
    }
  }

  return { portalSlug, ano, dryRun, baseUrl };
}

async function main() {
  const { portalSlug, ano, dryRun, baseUrl } = parseArgs();
  console.log(
    `[DIGEST] Iniciando despacho: portal='${portalSlug}', ano=${ano ?? "atual"}, dryRun=${dryRun}${baseUrl ? `, baseUrl='${baseUrl}'` : ""}`,
  );

  const result = await dispatchRadarDigest({
    portalSlug,
    ano,
    dryRun,
    baseUrl,
  });

  console.log(
    `[DIGEST] Resumo: totalAssinantes=${result.totalSubscribers}, enviados=${result.sentCount}, falhas=${result.failedCount}, dryRun=${result.dryRun}, status=${result.success ? "SUCESSO" : "FALHA"}`,
  );

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      console.error(`[DIGEST ERROR] [${err.email}] ${err.error}`);
    }
  }

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("[DIGEST FATAL]", error);
  process.exit(1);
});
