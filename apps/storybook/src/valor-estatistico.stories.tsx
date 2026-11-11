import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Fundamentos/Valor estatístico" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const amount = "R$ 1.234.567,89";
const amountWithNonBreakingSpace = "R$\u00a01.234.567,89";

/** Caso da decisão da Story 20.14: tabular-nums e espaço de "R$". */
export const StatValueLgWithReais: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="caption">Espaço comum (U+0020)</p>
      <p className="stat-value-lg">{amount}</p>
      <p className="caption">Espaço não separável (U+00A0)</p>
      <p className="stat-value-lg">{amountWithNonBreakingSpace}</p>
      <p className="caption">Algarismos iguais (largura tabular)</p>
      <p className="stat-value-lg">R$ 1.111.111,11</p>
      <p className="stat-value-lg">R$ 8.888.888,88</p>
    </div>
  ),
};

export const StatValueSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="stat-value-sm">{amount}</p>
      <p className="stat-value">{amount}</p>
      <p className="stat-value-lg">{amount}</p>
    </div>
  ),
};
