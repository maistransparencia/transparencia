import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Componentes/CollapsibleSection" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Chevron = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="mt-1.5 size-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const Secao = ({
  id,
  titulo,
  resumo,
  aberta,
}: {
  id: string;
  titulo: string;
  resumo: string;
  aberta?: boolean;
}) => (
  <section id={id} className="scroll-mt-20">
    <details open={aberta} className="group border-ink border-t-2">
      <summary className="focus-visible:outline-focus-ring flex min-h-11 cursor-pointer list-none items-start gap-3 py-4 focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
        <Chevron />
        <span className="min-w-0">
          <h2>{titulo}</h2>
          <span className="text-mute mt-1.5 block text-sm leading-relaxed">
            {resumo}
          </span>
        </span>
      </summary>
      <div className="space-y-6 pb-6">
        <p>Conteúdo da seção, idêntico ao da versão sempre aberta.</p>
      </div>
    </details>
  </section>
);

export const Recolhida: Story = {
  render: () => (
    <Secao
      id="contratos"
      titulo="Ver todos os contratos"
      resumo="38 contratos · R$ 4,2 mi pagos"
    />
  ),
};

export const Aberta: Story = {
  render: () => (
    <Secao
      id="contratos"
      titulo="Ver todos os contratos"
      resumo="38 contratos · R$ 4,2 mi pagos"
      aberta
    />
  ),
};

export const BlocoParaFiscalizar: Story = {
  render: () => (
    <div className="space-y-2">
      <header className="border-ink border-t-2 pt-4 pb-5">
        <h2>Para fiscalizar</h2>
        <p className="text-mute mt-1.5 text-sm leading-relaxed">
          Para quem quer conferir emenda por emenda e contrato por contrato.
        </p>
      </header>
      <Secao
        id="emendas"
        titulo="Emendas"
        resumo="18 emendas · R$ 2,1 mi autorizados"
      />
      <Secao
        id="como-contrata"
        titulo="Como o Fundo contrata"
        resumo="3 caminhos de compra"
      />
      <Secao
        id="contratos"
        titulo="Ver todos os contratos"
        resumo="38 contratos"
      />
      <Secao
        id="fornecedores"
        titulo="Quem recebe o dinheiro da educação"
        resumo="10 maiores fornecedores"
      />
    </div>
  ),
};
