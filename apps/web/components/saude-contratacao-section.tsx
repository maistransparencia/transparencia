import type {
  CaminhoContratacaoSaudeDTO,
  LicitacaoEmAndamentoDTO,
  LicitacaoItemDTO,
} from "@transparencia/db";
import { fmtCompact, fmtPercent, SectionHeader } from "@transparencia/ui";
import Link from "next/link";
import { LicitacoesEmAndamentoSection } from "@/components/licitacoes-em-andamento-section";

export interface SaudeContratacaoModalidadeItem {
  nome: string;
  valor: number;
  pct: number;
}

export interface SaudeContratacaoLicitacoesProps {
  adesaoCaronaCount: number;
  adesaoCaronaValor: number;
  empenhosAtaExternaCount: number;
  pagoAtaExternaValor: number;
  modalidades: SaudeContratacaoModalidadeItem[];
  caminhos: CaminhoContratacaoSaudeDTO[];
}

export interface SaudeContratacaoOrcamentoProps {
  empenhado: number;
  contratosVinculadosCount: number;
  fornecedoresAtivosCount: number;
}

export interface SaudeContratacaoSectionProps {
  portalSlug: string;
  ano?: number;
  orcamento: SaudeContratacaoOrcamentoProps;
  licitacoesSaude: SaudeContratacaoLicitacoesProps;
  licitacoesEmAndamento?: LicitacaoEmAndamentoDTO[];
  itensByLicitacao?: Record<string, LicitacaoItemDTO[]>;
}

const CAMINHOS_CONTRATACAO = [
  {
    tipoContratacao: "licitacao_propria",
    nome: "Licitação própria",
    unidade: "licitações",
    semEmpenho:
      "O portal não liga essas licitações às notas de empenho, por isso não há valor empenhado para mostrar.",
  },
  {
    tipoContratacao: "adesao_ata_interna",
    nome: "Adesão a ata (carona)",
    unidade: "contratos",
    nota: "Contratos cadastrados como adesão a uma ata de registro de preços.",
  },
  {
    tipoContratacao: "adesao_ata_externa",
    nome: "Empenhos que citam ata de registro de preços",
    unidade: "empenhos",
    nota: "Identificados pelo texto da descrição do empenho.",
  },
  {
    tipoContratacao: "gap_licitacao",
    nome: "Contratos sem licitação identificada",
    unidade: "contratos",
    nota: "O cadastro não mostra a licitação desses contratos; vale consultar o processo.",
  },
] as const;

const percentualEntre0e100 = (valor: number, total: number) =>
  total > 0 ? Math.min(100, Math.max(0, (valor / total) * 100)) : 0;

export function SaudeContratacaoSection({
  portalSlug,
  ano,
  orcamento,
  licitacoesSaude,
  licitacoesEmAndamento = [],
  itensByLicitacao,
}: SaudeContratacaoSectionProps) {
  const caminhos = CAMINHOS_CONTRATACAO.map((definicao) => {
    const encontrado = licitacoesSaude.caminhos.find(
      (caminho) => caminho.tipoContratacao === definicao.tipoContratacao,
    );
    return {
      ...definicao,
      quantidade: encontrado?.quantidade ?? 0,
      valorEmpenhado: encontrado?.valorEmpenhado ?? 0,
    };
  });

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Como o Fundo contrata"
        description="Por qual caminho o Fundo comprou: licitou, aderiu a uma ata de registro de preços ou contratou sem licitação identificada. Os caminhos podem se sobrepor e não se somam."
        action={
          <Link
            href={`/${portalSlug}/licitacoes`}
            className="font-semibold text-brand-text hover:underline"
          >
            Ver todas as licitações &rarr;
          </Link>
        }
      />

      <ul className="space-y-6">
        {caminhos.map((caminho) => {
          const temEmpenho = caminho.valorEmpenhado > 0;
          return (
            <li key={caminho.tipoContratacao} className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold text-ink">{caminho.nome}</span>
                <span className="caption shrink-0">
                  {caminho.quantidade} {caminho.unidade}
                </span>
              </div>
              {temEmpenho ? (
                <>
                  <div className="h-3 w-full bg-track">
                    <div
                      className="h-full bg-brand-fill"
                      style={{
                        width: `${percentualEntre0e100(caminho.valorEmpenhado, orcamento.empenhado)}%`,
                      }}
                    />
                  </div>
                  <p className="caption">
                    <strong className="text-ink">
                      {fmtCompact(caminho.valorEmpenhado)}
                    </strong>{" "}
                    empenhados (
                    {fmtPercent(
                      percentualEntre0e100(
                        caminho.valorEmpenhado,
                        orcamento.empenhado,
                      ),
                    )}{" "}
                    do total reservado pelo Fundo).{" "}
                    {"nota" in caminho ? caminho.nota : ""}
                  </p>
                </>
              ) : (
                <p className="caption">
                  {"semEmpenho" in caminho
                    ? caminho.semEmpenho
                    : "Nenhum valor empenhado ligado a este caminho."}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Bloco Dedicado: Compras e Licitações da Saúde em Andamento */}
      <div className="space-y-4 border-line border-t pt-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow mb-1.5 text-brand-text!">Em aberto</p>
            <h3>Compras e Licitações da Saúde em Andamento</h3>
            <p className="mt-0.5 text-mute text-xs leading-relaxed">
              Processos licitatórios abertos da pasta de saúde (medicamentos,
              insumos hospitalares e equipamentos).
            </p>
          </div>
          <Link
            href={
              ano
                ? `/${portalSlug}/licitacoes?ano=${ano}#licitacoes-em-andamento`
                : `/${portalSlug}/licitacoes#licitacoes-em-andamento`
            }
            className="inline-flex items-center gap-1 font-semibold text-brand-text text-xs hover:underline"
          >
            Ver radar geral &rarr;
          </Link>
        </div>

        {licitacoesEmAndamento.length > 0 ? (
          <LicitacoesEmAndamentoSection
            licitacoes={licitacoesEmAndamento}
            itensByLicitacao={itensByLicitacao}
            portalSlug={portalSlug}
            ano={ano}
            hideHeader
          />
        ) : (
          <div className="border-line border-y bg-line2 p-4 text-center text-mute text-xs">
            Nenhuma licitação da Saúde em andamento ou aberta no momento para
            este exercício.
          </div>
        )}
      </div>
    </section>
  );
}
