import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Componentes/Panel" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const tones = ["", "panel-brand", "panel-ok", "panel-warn", "panel-danger"];
const formats = [
  { nome: "Borda lateral (padrão)", classe: "" },
  { nome: "Borda total com leve arredondado", classe: "rounded-md border" },
  { nome: "Borda no topo", classe: "border-0 border-t-[3px]" },
];

export const FormatosETons: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {formats.map((formato) => (
        <section key={formato.nome} className="flex flex-col gap-3">
          <h3>{formato.nome}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {tones.map((tom) => (
              <div
                key={tom || "padrao"}
                className={`panel ${tom} ${formato.classe}`.trim()}
              >
                <p className="eyebrow">{tom || "panel"}</p>
                <p>Conteúdo do painel de exemplo.</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};
