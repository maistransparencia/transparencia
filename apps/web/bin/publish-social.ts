import { publishSocial, type SocialChannel } from "../lib/social-publisher";

function parseArgs() {
  const args = process.argv.slice(2);
  let portalSlug = "porciuncula_prefeitura";
  let type: "fiscal_digest" | "extraction" | "release" | "custom" =
    "fiscal_digest";
  let channels: SocialChannel[] | "all" = "all";
  let ano: number | undefined;
  let text: string | undefined;
  let version: string | undefined;
  let summary: string | undefined;
  let dryRun = false;
  let baseUrl: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--portal" && args[i + 1]) {
      portalSlug = args[i + 1];
      i++;
    } else if (arg.startsWith("--portal=")) {
      portalSlug = arg.slice(arg.indexOf("=") + 1);
    } else if (arg === "--type" && args[i + 1]) {
      type = args[i + 1] as typeof type;
      i++;
    } else if (arg.startsWith("--type=")) {
      type = arg.slice(arg.indexOf("=") + 1) as typeof type;
    } else if (arg === "--channels" && args[i + 1]) {
      const val = args[i + 1];
      channels = val === "all" ? "all" : (val.split(",") as SocialChannel[]);
      i++;
    } else if (arg.startsWith("--channels=")) {
      const val = arg.slice(arg.indexOf("=") + 1);
      channels = val === "all" ? "all" : (val.split(",") as SocialChannel[]);
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
    } else if (arg === "--text" && args[i + 1]) {
      text = args[i + 1];
      i++;
    } else if (arg.startsWith("--text=")) {
      text = arg.slice(arg.indexOf("=") + 1);
    } else if (arg === "--version" && args[i + 1]) {
      version = args[i + 1];
      i++;
    } else if (arg.startsWith("--version=")) {
      version = arg.slice(arg.indexOf("=") + 1);
    } else if (arg === "--summary" && args[i + 1]) {
      summary = args[i + 1];
      i++;
    } else if (arg.startsWith("--summary=")) {
      summary = arg.slice(arg.indexOf("=") + 1);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--base-url" && args[i + 1]) {
      baseUrl = args[i + 1];
      i++;
    } else if (arg.startsWith("--base-url=")) {
      baseUrl = arg.slice(arg.indexOf("=") + 1);
    }
  }

  return {
    portalSlug,
    type,
    channels,
    ano,
    text,
    version,
    summary,
    dryRun,
    baseUrl,
  };
}

async function main() {
  const options = parseArgs();
  console.log(
    `[SOCIAL] Disparando publicação: portal='${options.portalSlug}', tipo='${options.type}', canais='${JSON.stringify(options.channels)}', dryRun=${options.dryRun}`,
  );

  const result = await publishSocial(options);

  console.log(
    `[SOCIAL] Resultado: status=${result.success ? "SUCESSO" : "FALHA"}, dryRun=${result.dryRun}`,
  );

  if (result.results.x) {
    if (result.results.x.success) {
      console.log(
        `[SOCIAL X] ✓ Publicado: tweetId=${result.results.x.tweetId}`,
      );
    } else {
      console.error(`[SOCIAL X] ✗ Falha: ${result.results.x.error}`);
    }
  }

  if (result.results.facebook) {
    if (result.results.facebook.success) {
      console.log(
        `[SOCIAL FACEBOOK] ✓ Publicado: postId=${result.results.facebook.postId}`,
      );
    } else {
      console.error(
        `[SOCIAL FACEBOOK] ✗ Falha: ${result.results.facebook.error}`,
      );
    }
  }

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("[SOCIAL FATAL]", error);
  process.exit(1);
});
