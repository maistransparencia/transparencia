import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Componentes/Table" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  { descricao: "Item A", valor: "1.234,50" },
  { descricao: "Item B", valor: "98.765,43" },
  { descricao: "Item C", valor: "2.000,00" },
];

export const ComNumericosETotais: Story = {
  render: () => (
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th className="text-right">Valor (R$)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.descricao}>
            <td>{row.descricao}</td>
            <td className="numeric text-right">{row.valor}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td className="numeric text-right">102.000,00</td>
        </tr>
      </tfoot>
    </table>
  ),
};
