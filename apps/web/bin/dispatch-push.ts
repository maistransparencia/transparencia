import { closeDb } from "@transparencia/db";
import { dispatchPushNotification } from "../lib/push-dispatcher";

function parseArgs() {
  const args = process.argv.slice(2);
  let portalSlug = "porciuncula_prefeitura";
  let title = "MaisTransparencia - Atualização Fiscal";
  let body = "Novos dados fiscais foram disponibilizados no portal.";
  let url: string | undefined;
  let topic: string | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--portal" && args[i + 1]) {
      portalSlug = args[i + 1];
      i++;
    } else if (arg.startsWith("--portal=")) {
      portalSlug = arg.slice(arg.indexOf("=") + 1);
    } else if (arg === "--title" && args[i + 1]) {
      title = args[i + 1];
      i++;
    } else if (arg.startsWith("--title=")) {
      title = arg.slice(arg.indexOf("=") + 1);
    } else if (arg === "--body" && args[i + 1]) {
      body = args[i + 1];
      i++;
    } else if (arg.startsWith("--body=")) {
      body = arg.slice(arg.indexOf("=") + 1);
    } else if (arg === "--url" && args[i + 1]) {
      url = args[i + 1];
      i++;
    } else if (arg.startsWith("--url=")) {
      url = arg.slice(arg.indexOf("=") + 1);
    } else if (arg === "--topic" && args[i + 1]) {
      topic = args[i + 1];
      i++;
    } else if (arg.startsWith("--topic=")) {
      topic = arg.slice(arg.indexOf("=") + 1);
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { portalSlug, title, body, url, topic, dryRun };
}

async function main() {
  const { portalSlug, title, body, url, topic, dryRun } = parseArgs();
  console.log(
    `[PUSH] Iniciando despacho: portal='${portalSlug}', title='${title}', dryRun=${dryRun}${url ? `, url='${url}'` : ""}${topic ? `, topic='${topic}'` : ""}`,
  );

  const result = await dispatchPushNotification({
    portalSlug,
    title,
    body,
    url,
    topic,
    dryRun,
  });

  console.log(
    `[PUSH] Resumo: totalAssinantes=${result.totalSubscribers}, enviados=${result.sentCount}, falhas=${result.failedCount}, podados=${result.prunedCount}, dryRun=${result.dryRun}, status=${result.success ? "SUCESSO" : "FALHA"}`,
  );

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      console.error(`[PUSH ERROR] [${err.endpoint}] ${err.error}`);
    }
  }

  await closeDb();
  process.exit(result.success || result.dryRun ? 0 : 1);
}

main().catch(async (error: unknown) => {
  console.error("[PUSH FATAL]", error);
  await closeDb().catch(() => {});
  process.exit(1);
});
