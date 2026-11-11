import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Componentes/Indicator" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const valueSizes = [
  { nome: "stat-value-sm", classe: "stat-value-sm" },
  { nome: "stat-value", classe: "stat-value" },
  { nome: "stat-value-lg", classe: "stat-value-lg" },
];

export const TresTamanhos: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {valueSizes.map((tamanho) => (
        <div key={tamanho.nome} className="panel panel-brand">
          <dl>
            <div>
              <dt className="eyebrow">{tamanho.nome}</dt>
              <dd className={tamanho.classe}>R$ 1.234.567,89</dd>
              <dd className="caption">Nota do indicador</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  ),
};
