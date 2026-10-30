import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Componentes/Expandable row" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

type ExpandableTableProps = { initiallyOpen: boolean };

const ExpandableTable = ({ initiallyOpen }: ExpandableTableProps) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  return (
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th className="text-right">Valor (R$)</th>
        </tr>
      </thead>
      <tbody>
        <tr className={isOpen ? "bg-line2" : undefined}>
          <td>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls="detalhe-exemplo"
              className="inline-flex min-h-11 items-center gap-2"
              onClick={() => setIsOpen(!isOpen)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
                style={{ transform: isOpen ? "rotate(90deg)" : undefined }}
              >
                <path
                  d="M6 3l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              Item A
            </button>
          </td>
          <td className="numeric text-right">1.234,50</td>
        </tr>
        <tr id="detalhe-exemplo" hidden={!isOpen}>
          <td colSpan={2}>
            <div className="panel">
              <dl>
                <div>
                  <dt className="eyebrow">Detalhe</dt>
                  <dd className="stat-value-sm">R$ 1.234,50</dd>
                  <dd className="caption">Nota do indicador</dd>
                </div>
              </dl>
            </div>
            <a href="#detalhes">Ver detalhes</a>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export const Fechada: Story = {
  render: () => <ExpandableTable initiallyOpen={false} />,
};

export const Aberta: Story = {
  render: () => <ExpandableTable initiallyOpen />,
};
