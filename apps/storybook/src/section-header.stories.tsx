import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Componentes/SectionHeader" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const ComEyebrowEDescricao: Story = {
  render: () => (
    <header className="border-ink border-t-2 pt-4 pb-5">
      <p className="eyebrow mb-1.5">18 emendas · exercício 2026</p>
      <div className="flex items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="min-w-0 font-semibold font-serif text-ink text-xl sm:text-2xl">
          Emendas parlamentares destinadas à Saúde
        </h2>
      </div>
      <p className="mt-1.5 text-mute text-sm leading-relaxed">
        Recursos que deputados e senadores destinaram à saúde do município. O
        que importa não é só quanto foi autorizado, mas se esse dinheiro chegou
        e foi usado.
      </p>
    </header>
  ),
};

export const ComAcao: Story = {
  render: () => (
    <header className="border-ink border-t-2 pt-4 pb-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="min-w-0 font-semibold font-serif text-ink text-xl sm:text-2xl">
          Como o Fundo contrata
        </h2>
        <div className="shrink-0 text-sm">
          <a href="/licitacoes">Ver todas as licitações →</a>
        </div>
      </div>
      <p className="mt-1.5 text-mute text-sm leading-relaxed">
        Por qual caminho o Fundo comprou.
      </p>
    </header>
  ),
};
