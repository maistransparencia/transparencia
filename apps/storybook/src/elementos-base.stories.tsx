import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Fundamentos/Elementos base" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const EscalaDeTitulos: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <h1>Título de nível 1</h1>
      <h2>Título de nível 2</h2>
      <h3>Título de nível 3</h3>
      <h4>Título de nível 4</h4>
      <p>Parágrafo nu, herdando o corpo do contêiner.</p>
    </div>
  ),
};

export const TextoLinksEListas: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p>
        Texto corrido com <a href="#exemplo">link no texto</a> e continuação.
      </p>
      <ul>
        <li>Item de lista sem marcador</li>
        <li>Outro item</li>
      </ul>
      <ul className="list-text">
        <li>Item com marcador em texto corrido</li>
        <li>Outro item com marcador</li>
      </ul>
      <dl>
        <dt className="eyebrow">Rótulo</dt>
        <dd>Valor descritivo</dd>
      </dl>
    </div>
  ),
};

export const Papeis: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="eyebrow">eyebrow</p>
      <p className="caption">caption</p>
      <p className="lead">lead: parágrafo de abertura de seção.</p>
      <p className="display">display</p>
      <p className="stat-value-sm">stat-value-sm 1.234</p>
      <p className="stat-value">stat-value 1.234</p>
      <p className="stat-value-lg">stat-value-lg 1.234</p>
      <p className="numeric">numeric 1.234.567,89</p>
      <section className="section">
        <p>section: ritmo vertical sem moldura.</p>
        <p>Segundo parágrafo da seção.</p>
      </section>
    </div>
  ),
};
