import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Componentes/Badge" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const base =
  "inline-flex items-center rounded-sm border px-2 py-0.5 font-medium text-[11px]";

const variantes = [
  {
    nome: "default",
    classe: "border-line bg-line2/40 text-mute2",
    exemplo: "Encerrada",
    uso: "Situação neutra, sem juízo: encerrada, classificada, não informada.",
  },
  {
    nome: "accent",
    classe: "border-brand/40 bg-brand/10 font-semibold text-brand",
    exemplo: "Novo",
    uso: "Destaque informativo da marca, sem alerta.",
  },
  {
    nome: "warning",
    classe: "border-warn-text/40 bg-warn-fill/10 font-semibold text-warn-text",
    exemplo: "Merece atenção",
    uso: "Pede o olhar do cidadão: em andamento, merece atenção (sempre com o motivo escrito ao lado).",
  },
  {
    nome: "danger",
    classe:
      "border-danger-text/40 bg-danger-fill/10 font-semibold text-danger-text",
    exemplo: "Paralisada",
    uso: "Problema comprovado: limite legal descumprido, obra paralisada.",
  },
  {
    nome: "success",
    classe: "border-ok-text/40 bg-ok-fill/10 font-semibold text-ok-text",
    exemplo: "Homologada",
    uso: "Desfecho positivo ou exigência cumprida.",
  },
];

export const Variantes: Story = {
  render: () => (
    <table>
      <thead>
        <tr>
          <th>Variante</th>
          <th>Exemplo</th>
          <th>Quando usar</th>
        </tr>
      </thead>
      <tbody>
        {variantes.map((variante) => (
          <tr key={variante.nome}>
            <td>{variante.nome}</td>
            <td>
              <span className={`${base} ${variante.classe}`}>
                {variante.exemplo}
              </span>
            </td>
            <td>{variante.uso}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};
