import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Componentes/AlertBox" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const tipos = [
  { nome: "info", borda: "border-brand-fill bg-brand-fill/15" },
  { nome: "warning", borda: "border-warn-fill bg-warn-fill/15" },
  { nome: "danger", borda: "border-danger-fill bg-danger-fill/15" },
  { nome: "success", borda: "border-ok-fill bg-ok-fill/15" },
];

export const Tipos: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {tipos.map((tipo) => (
        <div
          key={tipo.nome}
          className={`text-ink flex gap-3 border-l-[3px] px-4 py-3 text-sm leading-relaxed ${tipo.borda}`}
        >
          <span aria-hidden="true" className="text-ink shrink-0">
            ●
          </span>
          <div>
            <p className="mb-1 font-semibold">
              Título curto do aviso ({tipo.nome})
            </p>
            <div>
              Texto de até duas frases, em 14px. Diz o que se sabe e o que o
              dado não mostra.
            </div>
          </div>
        </div>
      ))}
    </div>
  ),
};
