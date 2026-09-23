import type { Metadata } from "next";
import type { ReactNode } from "react";
import { env } from "@/env";

const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "https://maistransparencia.com";

const PLANALTO = "https://www.planalto.gov.br/ccivil_03";
const LEI_14133_URL = `${PLANALTO}/_ato2019-2022/2021/lei/l14133.htm`;

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
  { id: "compras", title: "Transparência em compras públicas" },
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
    href: `${PLANALTO}/_ato2011-2014/2011/lei/l12527.htm`,
    description:
      "Assegura o direito de qualquer pessoa a obter informações públicas detidas pelo Estado, promovendo a transparência ativa.",
  },
  {
    name: "Lei Complementar 131/2009",
    detail: "Lei da Transparência",
    href: `${PLANALTO}/leis/lcp/lcp131.htm`,
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
      className="scroll-mt-24 border-slate-200 border-t pt-10 first:border-t-0 first:pt-0"
    >
      <h2
        id={`${id}-title`}
        className="!mt-0 flex items-baseline gap-3 font-semibold text-2xl text-slate-900 tracking-tight"
      >
        <span className="font-medium text-base text-emerald-700 tabular-nums">
          {index + 1}.
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="mt-0.5 h-5 w-5 flex-none text-emerald-700"
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
        <h1 className="font-bold text-4xl text-slate-900 tracking-tight sm:text-5xl">
          Termos de Uso
        </h1>
        <p className="mt-4 text-slate-500 text-sm">
          Última atualização: <time dateTime="2026-09">setembro de 2026</time>
        </p>
        <p className="mt-6 text-lg text-slate-600 leading-8">
          Bem-vindo ao{" "}
          <strong className="font-semibold text-slate-900">
            MaisTransparencia
          </strong>
          . Ao utilizar esta plataforma, você concorda com os termos descritos
          abaixo. Leia-os com atenção.
        </p>
      </header>

      {/* Resumo */}
      <aside
        aria-labelledby="resumo-title"
        className="mt-10 max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8"
      >
        <h2
          id="resumo-title"
          className="font-semibold text-emerald-950 text-lg"
        >
          Em resumo
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {commitments.map((item) => (
            <li
              key={item}
              className="flex gap-3 text-emerald-950 text-sm leading-6"
            >
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
            <p className="font-semibold text-slate-900 text-sm">Nesta página</p>
            <ol className="mt-4 space-y-1 border-slate-200 border-l">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="-ml-px flex gap-2 border-transparent border-l py-1.5 pl-4 text-slate-600 text-sm transition-colors hover:border-emerald-700 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  >
                    <span className="text-slate-400 tabular-nums">
                      {i + 1}.
                    </span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        {/* Conteúdo */}
        <article className="prose prose-slate prose-li:my-1.5 max-w-3xl space-y-10 prose-a:font-medium prose-a:text-emerald-800 prose-strong:text-slate-900 prose-p:leading-7 prose-a:decoration-emerald-300 prose-a:underline-offset-4 prose-li:marker:text-emerald-700 hover:prose-a:decoration-emerald-700">
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
            <dl className="not-prose mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
              {legalBases.map((law) => (
                <div
                  key={law.name}
                  className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6"
                >
                  <dt className="font-semibold text-slate-900 text-sm">
                    {law.href ? (
                      <a
                        href={law.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:decoration-emerald-700"
                      >
                        {law.name}
                        <span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    ) : (
                      law.name
                    )}
                    {law.detail && (
                      <span className="block font-normal text-slate-500">
                        {law.detail}
                      </span>
                    )}
                  </dt>
                  <dd className="text-slate-700 text-sm leading-6">
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
              <ExternalLink href={`${PLANALTO}/leis/lcp/lcp101.htm`}>
                Lei de Responsabilidade Fiscal (LC 101/2000)
              </ExternalLink>
              .
            </p>
            <div className="not-prose mt-6 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-700 text-sm leading-6">
              <strong className="font-semibold text-slate-900">
                Não são exibidos:
              </strong>{" "}
              dados individualizados nominais de servidores públicos de
              carreira.
            </div>
          </Section>

          <Section index={3}>
            <p>
              Os processos licitatórios, dispensas, inexigibilidades e contratos
              administrativos são reproduzidos a partir de fontes oficiais:
            </p>
            <ul>
              <li>Portal Nacional de Contratações Públicas (PNCP);</li>
              <li>Tribunal de Contas do Estado do Rio de Janeiro (TCE-RJ);</li>
              <li>sistemas municipais legados.</li>
            </ul>
            <p>
              A reprodução se dá nos termos dos{" "}
              <ExternalLink href={`${LEI_14133_URL}#art54`}>
                Arts. 54 e 174 da Lei 14.133/2021
              </ExternalLink>
              , que impõem publicidade obrigatória dos atos licitatórios.
            </p>
          </Section>

          <Section index={4}>
            <p>
              O MaisTransparencia realiza esforços contínuos para garantir a
              precisão, atualidade e completude dos dados exibidos. Contudo,
              como plataforma derivada de fontes públicas de terceiros, não pode
              ser responsabilizado por:
            </p>
            <ul>
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
            <div className="not-prose mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 text-sm leading-6">
              Os dados são fornecidos{" "}
              <em className="font-medium">“como estão”</em> para fins de
              controle social e auditoria cidadã. Para fins jurídicos ou de
              prestação de contas formal, confronte-os com as fontes primárias
              oficiais.
            </div>
          </Section>
        </article>
      </div>
    </main>
  );
}
