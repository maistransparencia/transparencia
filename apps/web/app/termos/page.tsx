import { AlertBox } from "@transparencia/ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { env } from "@/env";
import { urlLegislacao } from "@/lib/constants/legislacao";

const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "https://maistransparencia.com";

const LEI_14133_URL = urlLegislacao("lei14133");

export const metadata: Metadata = {
  title: "Termos de Uso | MaisTransparencia",
  description:
    "Termos de Uso da plataforma cívica MaisTransparencia: natureza independente, bases legais para publicação de dados públicos (LAI, LC 131, Lei 14.133/2021, Tema 483 STF) e limitações de responsabilidade.",
  alternates: { canonical: `${baseUrl}/termos` },
};

export const dynamic = "force-static";

const sections = [
  { id: "natureza", title: "Natureza cívica e independência" },
  { id: "base-legal", title: "Base legal para publicação" },
  { id: "remuneracoes", title: "Remunerações de agentes públicos" },
  { id: "compras", title: "Transparência em compras e obras públicas" },
  { id: "responsabilidade", title: "Limitações de responsabilidade" },
] as const;

const commitments = [
  "Plataforma independente, sem vínculo com partidos, governos ou empresas.",
  "Dados obtidos apenas de fontes oficiais e públicas.",
  "Remunerações exibidas de forma agregada, sem nomes de servidores de carreira.",
  "Código aberto para auditoria pública dos algoritmos fiscais.",
];

const legalBases: {
  name: string;
  detail?: string;
  href?: string;
  description: string;
}[] = [
  {
    name: "Lei 12.527/2011",
    detail: "Lei de Acesso à Informação (LAI)",
    href: urlLegislacao("lai"),
    description:
      "Assegura o direito de qualquer pessoa a obter informações públicas detidas pelo Estado, promovendo a transparência ativa.",
  },
  {
    name: "Lei Complementar 131/2009",
    detail: "Lei da Transparência",
    href: urlLegislacao("lcp131"),
    description:
      "Determina a divulgação em tempo real de informações detalhadas sobre a execução orçamentária e financeira dos entes públicos.",
  },
  {
    name: "Lei 14.133/2021",
    detail: "Lei de Licitações e Contratos Administrativos",
    href: LEI_14133_URL,
    description:
      "Estabelece normas de transparência e publicidade obrigatória para contratações públicas.",
  },
  {
    name: "Tema 483 do STF",
    detail: "RE 1.143.261",
    description:
      "O Supremo Tribunal Federal firmou tese de repercussão geral reconhecendo que a divulgação de remunerações de agentes públicos é um imperativo de transparência constitucional e não viola a privacidade individual, por se tratar de informação de interesse coletivo sobre o uso de recursos públicos.",
  },
];

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

function Section({ index, children }: { index: number; children: ReactNode }) {
  const { id, title } = sections[index];
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="border-line scroll-mt-24 border-t pt-10 first:border-t-0 first:pt-0"
    >
      <h2 id={`${id}-title`} className="flex items-baseline gap-3">
        <span className="text-brand-text text-base font-medium tabular-nums">
          {index + 1}.
        </span>
        {title}
      </h2>
      <div className="space-y-4 pt-3">{children}</div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="text-brand-text mt-0.5 h-5 w-5 flex-none"
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.57a1 1 0 0 1-1.42.002l-3.5-3.5a1 1 0 1 1 1.414-1.414l2.79 2.79 6.796-6.856a1 1 0 0 1 1.414-.006Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
      {/* Cabeçalho */}
      <header className="max-w-3xl">
        <h1>Termos de Uso</h1>
        <p className="text-mute2 mt-4 text-sm">
          Última atualização: <time dateTime="2026-09">setembro de 2026</time>
        </p>
        <p className="text-mute mt-6 text-lg leading-8">
          Bem-vindo ao{" "}
          <strong className="text-ink font-semibold">MaisTransparencia</strong>.
          Ao utilizar esta plataforma, você concorda com os termos descritos
          abaixo. Leia-os com atenção.
        </p>
      </header>

      {/* Resumo */}
      <aside
        aria-labelledby="resumo-title"
        className="panel panel-brand mt-10 max-w-3xl"
      >
        <h2 id="resumo-title">Em resumo</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {commitments.map((item) => (
            <li key={item} className="text-ink flex gap-3 text-sm leading-6">
              <CheckIcon />
              {item}
            </li>
          ))}
        </ul>
      </aside>

      <div className="mt-14 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        {/* Sumário */}
        <nav aria-label="Seções destes termos" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-ink text-sm font-semibold">Nesta página</p>
            <ol className="border-line mt-4 space-y-1 border-l">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-mute hover:border-brand hover:text-ink focus-visible:ring-focus-ring -ml-px flex gap-2 border-l border-transparent py-1.5 pl-4 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="text-mute3 tabular-nums">{i + 1}.</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        {/* Conteúdo */}
        <article className="max-w-3xl space-y-10">
          <Section index={0}>
            <p>
              O MaisTransparencia é uma plataforma cívica independente de
              controle social e auditoria fiscal das contas públicas municipais.
              Não possui qualquer vínculo, patrocínio, financiamento ou
              afiliação com partidos políticos, governos municipais, estaduais
              ou federais, empresas privadas contratadas pelo poder público ou
              qualquer outra entidade com interesse direto nos dados publicados.
            </p>
            <p>
              A plataforma é mantida de forma voluntária e colaborativa, com
              código aberto publicado no{" "}
              <ExternalLink href="https://github.com/maistransparencia/transparencia">
                GitHub
              </ExternalLink>{" "}
              para auditoria pública dos algoritmos fiscais.
            </p>
          </Section>

          <Section index={1}>
            <p>
              Os dados exibidos nesta plataforma são obtidos exclusivamente de
              fontes oficiais e públicas, em conformidade com o direito
              fundamental de acesso à informação garantido pela Constituição
              Federal de 1988 (Art. 5.º, XXXIII) e pelas seguintes normas:
            </p>
            <dl className="divide-line border-line mt-6 divide-y border-y">
              {legalBases.map((law) => (
                <div
                  key={law.name}
                  className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6"
                >
                  <dt className="text-ink text-sm font-semibold">
                    {law.href ? (
                      <a
                        href={law.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-text decoration-brand/40 hover:decoration-brand underline underline-offset-4"
                      >
                        {law.name}
                        <span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    ) : (
                      law.name
                    )}
                    {law.detail && (
                      <span className="text-mute2 block font-normal">
                        {law.detail}
                      </span>
                    )}
                  </dt>
                  <dd className="text-mute text-sm leading-6">
                    {law.description}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section index={2}>
            <p>
              Em consonância com o{" "}
              <strong>Tema 483 do STF (RE 1.143.261)</strong>, esta plataforma
              apresenta dados agregados e estatísticos sobre remunerações de
              agentes públicos municipais: indicadores de massa salarial,
              distribuição por regime jurídico e conformidade com os limites da{" "}
              <ExternalLink href={urlLegislacao("lrf")}>
                Lei de Responsabilidade Fiscal (LC 101/2000)
              </ExternalLink>
              .
            </p>
            <AlertBox type="info" title="Não são exibidos">
              dados individualizados nominais de servidores públicos de
              carreira.
            </AlertBox>
          </Section>

          <Section index={3}>
            <p>
              Os processos licitatórios, dispensas, inexigibilidades, contratos
              administrativos e intervenções de infraestrutura urbana (obras
              públicas) são reproduzidos a partir de fontes oficiais:
            </p>
            <ul className="list-text">
              <li>Portal Nacional de Contratações Públicas (PNCP);</li>
              <li>
                Portal ObrasGov.br (obrasgov.br — painel de obras e Cadastro
                Integrado de Projetos de Investimento — CIPI do Governo
                Federal);
              </li>
              <li>Tribunal de Contas do Estado do Rio de Janeiro (TCE-RJ);</li>
              <li>sistemas municipais legados.</li>
            </ul>
            <p>
              A reprodução se dá nos termos dos{" "}
              <ExternalLink href={`${LEI_14133_URL}#art54`}>
                Arts. 54, 115 (§ 6º) e 174 da Lei 14.133/2021
              </ExternalLink>
              , que impõem publicidade obrigatória dos atos licitatórios e da
              execução de obras públicas.
            </p>
          </Section>

          <Section index={4}>
            <p>
              O MaisTransparencia realiza esforços contínuos para garantir a
              precisão, atualidade e completude dos dados exibidos. Contudo,
              como plataforma derivada de fontes públicas de terceiros, não pode
              ser responsabilizado por:
            </p>
            <ul className="list-text">
              <li>
                erros, inconsistências ou omissões originários das bases de
                dados oficiais dos órgãos públicos;
              </li>
              <li>
                atrasos na atualização decorrentes da indisponibilidade
                temporária de sistemas oficiais;
              </li>
              <li>
                interpretações jurídicas ou decisões tomadas com base nos dados
                exibidos sem a devida consulta a profissionais habilitados.
              </li>
            </ul>
            <AlertBox type="info" title="Uso dos dados">
              Os dados são fornecidos{" "}
              <em className="font-medium">“como estão”</em> para fins de
              controle social e auditoria cidadã. Para fins jurídicos ou de
              prestação de contas formal, confronte-os com as fontes primárias
              oficiais.
            </AlertBox>
          </Section>
        </article>
      </div>
    </main>
  );
}
