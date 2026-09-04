import {
  CATEGORIAS_GASTOS_SENSIVEIS,
  type CategoriaGastoSensivel,
  getPortalConfig,
  getRawDespesasExportRecords,
  type RawDespesaRecordDTO,
  type TipoExportacao,
} from "@transparencia/db";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const VALID_TIPOS: readonly TipoExportacao[] = [
  "gasto_sensivel",
  "opacidade_99",
  "funcao",
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
] as const;

function escapeCsvCell(
  value: string | number | null | undefined,
  delimiter: string,
): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
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
  const fixed = value.toFixed(2);
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
  ];
  return cells.join(delimiter);
}

interface ResolveFilenameOptions {
  tipo: TipoExportacao;
  portalSlug: string;
  ano: number;
  categoria?: string;
  funcaoCodigo?: string;
}

function resolveFilename(options: ResolveFilenameOptions): string {
  const { tipo, portalSlug, ano, categoria, funcaoCodigo } = options;
  if (tipo === "gasto_sensivel") {
    return `despesas_${portalSlug}_${categoria}_${ano}.csv`;
  }
  if (tipo === "opacidade_99") {
    return `despesas_opacidade_residual_99_${portalSlug}_${ano}.csv`;
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

  // 1. Verificação de existência do portal
  const portalConfig = await getPortalConfig(portalSlug);
  if (!portalConfig) {
    return NextResponse.json(
      { error: `Portal '${portalSlug}' não encontrado.` },
      { status: 404 },
    );
  }

  // 2. Proteção contra sobrecarga / Rate Limit anônimo por IP (30 req / 5 min)
  const forwardedHeader = req.headers.get("x-forwarded-for");
  const ip = forwardedHeader
    ? forwardedHeader.split(",")[0].trim()
    : req.headers.get("x-real-ip") || "unknown-ip";

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
        error:
          "Parâmetro 'tipo' inválido ou ausente. Valores aceitos: gasto_sensivel, opacidade_99, funcao.",
      },
      { status: 400 },
    );
  }

  const ano = Number(anoParam);
  if (!anoParam || Number.isNaN(ano) || ano < 2000 || ano > 2100) {
    return NextResponse.json(
      {
        error:
          "Parâmetro 'ano' inválido ou ausente. Deve ser um ano numérico válido.",
      },
      { status: 400 },
    );
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

  if (
    tipoParam === "funcao" &&
    (!funcaoCodigoParam || funcaoCodigoParam.trim() === "")
  ) {
    return NextResponse.json(
      {
        error: "Parâmetro 'funcaoCodigo' é obrigatório para o tipo 'funcao'.",
      },
      { status: 400 },
    );
  }

  const delimiter = delimitadorParam === "," ? "," : ";";
  const empresaIds = entidadesParam
    ? entidadesParam
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
    : undefined;

  // 4. Execução da query atômica em @transparencia/db
  const records = await getRawDespesasExportRecords({
    portalSlug,
    ano,
    empresaIds,
    tipo: tipoParam,
    categoria: categoriaParam ?? undefined,
    funcaoCodigo: funcaoCodigoParam ?? undefined,
  });

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
