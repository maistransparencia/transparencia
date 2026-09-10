import {
  CATEGORIAS_GASTOS_SENSIVEIS,
  type CategoriaGastoSensivel,
  getPortalConfig,
  getRawDespesasExportRecords,
  getRawPessoalRegimeExportRecords,
  getRawSaldoCaixaSiconfiExportRecords,
  type RawDespesaRecordDTO,
  type RawPessoalRegimeRecordDTO,
  type RawSaldoCaixaSiconfiRecordDTO,
  type TipoExportacao,
} from "@transparencia/db";
import { NextResponse } from "next/server";
import {
  CATEGORIA_REGIME_LABELS,
  CATEGORIAS_REGIME,
} from "@/lib/constants/pessoal";
import { checkRateLimit } from "@/lib/rate-limit";

const VALID_TIPOS: readonly TipoExportacao[] = [
  "gasto_sensivel",
  "opacidade_99",
  "funcao",
  "saldo_caixa_siconfi",
  "pessoal_regime",
];

const CSV_HEADERS = [
  "numero_empenho",
  "data_empenho",
  "orgao_nome",
  "credor_nome",
  "credor_cpf_cnpj",
  "objeto_descricao",
  "natureza_codigo",
  "valor_empenhado",
  "valor_liquidado",
  "valor_pago",
  "categoria_sensivel",
  "categoria_sugerida",
  "natureza_codigo_sugerido",
] as const;

const SICONFI_CSV_HEADERS = [
  "ano",
  "mes_referencia",
  "data_referencia",
  "poder_orgao",
  "entidade_nome",
  "cnpj",
  "grupo_destinacao",
  "saldo_caixa_bancos",
  "saldo_recursos_livres",
  "saldo_recursos_vinculados",
] as const;

const PESSOAL_REGIME_CSV_HEADERS = [
  "ano",
  "empresa_id",
  "matricula",
  "cargo",
  "proventos",
  "categoria_regime",
  "categoria_regime_rotulo",
  "regime_previdenciario",
  "forma_provimento",
  "vinculo",
  "categoria_funcional",
] as const;

function escapeCsvCell(
  value: string | number | null | undefined,
  delimiter: string,
): string {
  if (value === null || value === undefined) return "";
  let stringValue = String(value);
  if (/^[=+\-@\t\r]/.test(stringValue)) {
    stringValue = `'${stringValue}`;
  }
  if (
    stringValue.includes(delimiter) ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function formatMoney(value: number, delimiter: string): string {
  const fixed = Number(value ?? 0).toFixed(2);
  if (delimiter === ";") {
    return fixed.replace(".", ",");
  }
  return fixed;
}

function formatCsvRow(record: RawDespesaRecordDTO, delimiter: string): string {
  const cells = [
    escapeCsvCell(record.numeroEmpenho, delimiter),
    escapeCsvCell(record.dataEmpenho, delimiter),
    escapeCsvCell(record.orgaoNome, delimiter),
    escapeCsvCell(record.credorNome, delimiter),
    escapeCsvCell(record.credorCpfCnpj, delimiter),
    escapeCsvCell(record.objetoDescricao, delimiter),
    escapeCsvCell(record.naturezaCodigo, delimiter),
    escapeCsvCell(formatMoney(record.valorEmpenhado, delimiter), delimiter),
    escapeCsvCell(formatMoney(record.valorLiquidado, delimiter), delimiter),
    escapeCsvCell(formatMoney(record.valorPago, delimiter), delimiter),
    escapeCsvCell(record.categoriaSensivel, delimiter),
    escapeCsvCell(record.categoriaSugerida, delimiter),
    escapeCsvCell(record.naturezaCodigoSugerido, delimiter),
  ];
  return cells.join(delimiter);
}

function formatSiconfiCsvRow(
  record: RawSaldoCaixaSiconfiRecordDTO,
  delimiter: string,
): string {
  const cells = [
    escapeCsvCell(record.ano, delimiter),
    escapeCsvCell(record.mesReferencia, delimiter),
    escapeCsvCell(record.dataReferencia, delimiter),
    escapeCsvCell(record.poderOrgao, delimiter),
    escapeCsvCell(record.entidadeNome, delimiter),
    escapeCsvCell(record.cnpj, delimiter),
    escapeCsvCell(record.grupoDestinacao, delimiter),
    escapeCsvCell(formatMoney(record.saldoCaixaBancos, delimiter), delimiter),
    escapeCsvCell(
      formatMoney(record.saldoRecursosLivres, delimiter),
      delimiter,
    ),
    escapeCsvCell(
      formatMoney(record.saldoRecursosVinculados, delimiter),
      delimiter,
    ),
  ];
  return cells.join(delimiter);
}

function formatPessoalRegimeCsvRow(
  record: RawPessoalRegimeRecordDTO,
  delimiter: string,
): string {
  const rotulo =
    (CATEGORIA_REGIME_LABELS as Record<string, string>)[
      record.categoriaRegime
    ] ?? "Outros";
  const cells = [
    escapeCsvCell(record.ano, delimiter),
    escapeCsvCell(record.empresaId, delimiter),
    escapeCsvCell(record.matricula, delimiter),
    escapeCsvCell(record.cargo, delimiter),
    escapeCsvCell(formatMoney(record.proventos, delimiter), delimiter),
    escapeCsvCell(record.categoriaRegime, delimiter),
    escapeCsvCell(rotulo, delimiter),
    escapeCsvCell(record.regimePrevidenciario, delimiter),
    escapeCsvCell(record.formaProvimento, delimiter),
    escapeCsvCell(record.vinculo, delimiter),
    escapeCsvCell(record.categoriaFuncional, delimiter),
  ];
  return cells.join(delimiter);
}

interface ResolveFilenameOptions {
  tipo: TipoExportacao;
  portalSlug: string;
  ano: number;
  categoria?: string;
  funcaoCodigo?: string;
  entidades?: string;
}

function resolveFilename(options: ResolveFilenameOptions): string {
  const { tipo, portalSlug, ano, categoria, funcaoCodigo, entidades } = options;
  if (tipo === "gasto_sensivel") {
    return `despesas_${portalSlug}_${categoria}_${ano}.csv`;
  }
  if (tipo === "opacidade_99") {
    return `despesas_opacidade_residual_99_${portalSlug}_${ano}.csv`;
  }
  if (tipo === "saldo_caixa_siconfi") {
    const sufixo = entidades
      ? `_${entidades.replace(/[^a-zA-Z0-9_-]/g, "")}`
      : "";
    return `saldo_caixa_siconfi_${portalSlug}_${ano}${sufixo}.csv`;
  }
  if (tipo === "pessoal_regime") {
    const sufixoCategoria = categoria
      ? `_${categoria.replace(/[^a-zA-Z0-9_-]/g, "")}`
      : "";
    const sufixoEntidades = entidades
      ? `_${entidades.replace(/[^a-zA-Z0-9_-]/g, "")}`
      : "";
    return `pessoal_regime_${portalSlug}_${ano}${sufixoCategoria}${sufixoEntidades}.csv`;
  }
  return `despesas_funcao_${funcaoCodigo}_${portalSlug}_${ano}.csv`;
}

interface ExportRouteContext {
  params: Promise<{ portalSlug: string }> | { portalSlug: string };
}

export async function GET(req: Request, context: ExportRouteContext) {
  const resolvedParams = await Promise.resolve(context.params);
  const portalSlug = resolvedParams?.portalSlug;

  if (!portalSlug) {
    return NextResponse.json(
      { error: "Portal não informado." },
      { status: 400 },
    );
  }

  // 1. Proteção contra sobrecarga / Rate Limit anônimo por IP (30 req / 5 min)
  const forwardedHeader = req.headers.get("x-forwarded-for");
  const rawIp = forwardedHeader
    ? forwardedHeader.split(",")[0].trim()
    : req.headers.get("x-real-ip");
  const ip = rawIp && rawIp.length > 0 ? rawIp : "unknown-ip";

  const rateLimitResult = checkRateLimit(`export-ip:${ip}`, 30, 5 * 60 * 1000);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error:
          "Muitos downloads requisitados. Por favor, aguarde alguns minutos antes de tentar novamente.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.resetInSeconds),
        },
      },
    );
  }

  // 2. Verificação de existência do portal
  const portalConfig = await getPortalConfig(portalSlug);
  if (!portalConfig) {
    return NextResponse.json(
      { error: `Portal '${portalSlug}' não encontrado.` },
      { status: 404 },
    );
  }

  // 3. Validação dos query parameters
  const url = new URL(req.url);
  const tipoParam = url.searchParams.get("tipo") as TipoExportacao | null;
  const anoParam = url.searchParams.get("ano");
  const categoriaParam = url.searchParams.get("categoria");
  const funcaoCodigoParam = url.searchParams.get("funcaoCodigo");
  const entidadesParam = url.searchParams.get("entidades");
  const delimitadorParam = url.searchParams.get("delimitador");

  if (!tipoParam || !VALID_TIPOS.includes(tipoParam)) {
    return NextResponse.json(
      {
        error: `Parâmetro 'tipo' inválido ou ausente. Valores aceitos: ${VALID_TIPOS.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const ano = Number(anoParam);
  if (!anoParam || !Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    return NextResponse.json(
      {
        error:
          "Parâmetro 'ano' inválido ou ausente. Deve ser um ano numérico inteiro válido.",
      },
      { status: 400 },
    );
  }

  if (
    delimitadorParam &&
    delimitadorParam !== ";" &&
    delimitadorParam !== ","
  ) {
    return NextResponse.json(
      {
        error: "Parâmetro 'delimitador' inválido. Valores aceitos: ';' ou ','.",
      },
      { status: 400 },
    );
  }
  const delimiter = delimitadorParam ?? ";";

  // Rota especializada para exportação de saldos contábeis SICONFI / MSC
  if (tipoParam === "saldo_caixa_siconfi") {
    let siconfiRecords: RawSaldoCaixaSiconfiRecordDTO[];
    try {
      siconfiRecords = await getRawSaldoCaixaSiconfiExportRecords({
        portalSlug,
        ano,
        entidades: entidadesParam ?? undefined,
      });
    } catch (error) {
      // biome-ignore lint/suspicious/noConsole: log de erro crítico para rastreabilidade
      console.error(
        "[Export API] Erro ao consultar registros de saldo de caixa:",
        error,
      );
      return NextResponse.json(
        { error: "Erro interno ao processar a exportação de dados." },
        { status: 500 },
      );
    }

    const filename = resolveFilename({
      tipo: tipoParam,
      portalSlug,
      ano,
      entidades: entidadesParam ?? undefined,
    });

    const csvHeader = SICONFI_CSV_HEADERS.join(delimiter);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`\uFEFF${csvHeader}\r\n`));
        for (const record of siconfiRecords) {
          controller.enqueue(
            encoder.encode(`${formatSiconfiCsvRow(record, delimiter)}\r\n`),
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // Rota especializada para exportação de dados de pessoal por regime jurídico e vínculo
  if (tipoParam === "pessoal_regime") {
    if (
      categoriaParam &&
      !CATEGORIAS_REGIME.includes(
        categoriaParam as (typeof CATEGORIAS_REGIME)[number],
      )
    ) {
      return NextResponse.json(
        { error: `Categoria de regime inválida: '${categoriaParam}'.` },
        { status: 400 },
      );
    }

    let pessoalRecords: RawPessoalRegimeRecordDTO[];
    try {
      pessoalRecords = await getRawPessoalRegimeExportRecords({
        portalSlug,
        ano,
        empresaIds: entidadesParam
          ? entidadesParam.split(",").filter(Boolean)
          : undefined,
        categoriaRegime: categoriaParam ?? undefined,
      });
    } catch (error) {
      // biome-ignore lint/suspicious/noConsole: log de erro crítico para rastreabilidade
      console.error(
        "[Export API] Erro ao consultar registros de pessoal por regime:",
        error,
      );
      return NextResponse.json(
        { error: "Erro interno ao processar a exportação de dados." },
        { status: 500 },
      );
    }

    const filename = resolveFilename({
      tipo: tipoParam,
      portalSlug,
      ano,
      categoria: categoriaParam ?? undefined,
      entidades: entidadesParam ?? undefined,
    });

    const csvHeader = PESSOAL_REGIME_CSV_HEADERS.join(delimiter);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`\uFEFF${csvHeader}\r\n`));
        for (const record of pessoalRecords) {
          controller.enqueue(
            encoder.encode(
              `${formatPessoalRegimeCsvRow(record, delimiter)}\r\n`,
            ),
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  if (tipoParam === "gasto_sensivel") {
    const isCategoriaValida =
      categoriaParam &&
      CATEGORIAS_GASTOS_SENSIVEIS.includes(
        categoriaParam as CategoriaGastoSensivel,
      );
    if (!isCategoriaValida) {
      return NextResponse.json(
        {
          error:
            "Parâmetro 'categoria' inválido ou ausente para o tipo 'gasto_sensivel'.",
        },
        { status: 400 },
      );
    }
  }

  if (tipoParam === "funcao") {
    const isFuncaoValida =
      funcaoCodigoParam && /^\d{2}$/.test(funcaoCodigoParam.trim());
    if (!isFuncaoValida) {
      return NextResponse.json(
        {
          error:
            "Parâmetro 'funcaoCodigo' é obrigatório e deve conter exatamente 2 dígitos numéricos para o tipo 'funcao'.",
        },
        { status: 400 },
      );
    }
  }

  const empresaIds = entidadesParam
    ? entidadesParam
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
    : undefined;

  // 4. Execução da query atômica em @transparencia/db
  let records: RawDespesaRecordDTO[];
  try {
    records = await getRawDespesasExportRecords({
      portalSlug,
      ano,
      empresaIds,
      tipo: tipoParam,
      categoria: categoriaParam ?? undefined,
      funcaoCodigo: funcaoCodigoParam?.trim() ?? undefined,
    });
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: log de erro crítico para rastreabilidade
    console.error("[Export API] Erro ao consultar registros brutos:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a exportação de dados." },
      { status: 500 },
    );
  }

  // 5. Montagem do streaming CSV compatível com RFC 4180 e Microsoft Excel
  const filename = resolveFilename({
    tipo: tipoParam,
    portalSlug,
    ano,
    categoria: categoriaParam ?? undefined,
    funcaoCodigo: funcaoCodigoParam ?? undefined,
  });

  const csvHeader = CSV_HEADERS.join(delimiter);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`\uFEFF${csvHeader}\r\n`));
      for (const record of records) {
        controller.enqueue(
          encoder.encode(`${formatCsvRow(record, delimiter)}\r\n`),
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
