import type { Metadata } from "next";
import type { ReactNode } from "react";
import { env } from "@/env";

const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "https://maistransparencia.com";

const LGPD_URL =
  "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm";
const CONTACT_EMAIL = "privacidade@maistransparencia.com";

export const metadata: Metadata = {
  title: "Política de Privacidade | MaisTransparencia",
  description:
    "Política de Privacidade do MaisTransparencia: coleta mínima de dados (apenas e-mail com double opt-in), telemetria anônima, não-comercialização e direitos do titular conforme a LGPD (Lei 13.709/2018).",
  alternates: { canonical: `${baseUrl}/privacidade` },
};

export const dynamic = "force-static";

const sections = [
  { id: "dados-coletados", title: "Dados coletados" },
  { id: "finalidade", title: "Finalidade e base legal" },
  { id: "telemetria", title: "Telemetria anônima" },
  { id: "nao-comercializacao", title: "Não-comercialização" },
  { id: "direitos", title: "Direitos do titular" },
  { id: "contato", title: "Contato" },
] as const;

const commitments = [
  "Coletamos apenas seu e-mail, e só se você se inscrever no boletim.",
  "Inscrição confirmada por link enviado a você (double opt-in).",
  "Telemetria anônima, sem rastreamento entre sites.",
  "Seus dados nunca são vendidos, alugados ou compartilhados.",
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

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
      {/* Cabeçalho */}
      <header className="max-w-3xl">
        <h1 className="font-bold text-4xl text-slate-900 tracking-tight sm:text-5xl">
          Política de Privacidade
        </h1>
        <p className="mt-4 text-slate-500 text-sm">
          Última atualização: <time dateTime="2026-09">setembro de 2026</time>
        </p>
        <p className="mt-6 text-lg text-slate-600 leading-8">
          O{" "}
          <strong className="font-semibold text-slate-900">
            MaisTransparencia
          </strong>{" "}
          tem compromisso firme com a privacidade dos cidadãos que utilizam a
          plataforma. Esta política descreve quais dados são coletados, com qual
          finalidade e como são protegidos, em conformidade com a{" "}
          <a
            href={LGPD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:decoration-emerald-700"
          >
            Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018)
          </a>
          .
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
        <nav aria-label="Seções desta política" className="hidden lg:block">
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
              O MaisTransparencia adota o princípio da{" "}
              <strong>coleta mínima</strong>: apenas os dados estritamente
              necessários para as funcionalidades oferecidas são solicitados.
            </p>
            <ul>
              <li>
                <strong>Endereço de e-mail (voluntário):</strong> coletado
                exclusivamente quando o cidadão opta por se inscrever no boletim
                cívico informativo. O cadastro exige confirmação individual por
                meio de link exclusivo enviado à caixa postal do solicitante (
                <strong>double opt-in</strong>), impedindo inscrições indevidas
                por terceiros.
              </li>
              <li>
                <strong>Dados de navegação anônimos:</strong> métricas agregadas
                de uso para melhoria contínua da plataforma (detalhadas em{" "}
                <a href="#telemetria">Telemetria anônima</a>). Nenhum dado
                pessoal identificável é retido neste processo.
              </li>
            </ul>
            <div className="not-prose mt-6 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-700 text-sm leading-6">
              <strong className="font-semibold text-slate-900">
                Não são coletados:
              </strong>{" "}
              nome completo, CPF, endereço físico, telefone, dados bancários ou
              qualquer outra informação pessoal sensível.
            </div>
          </Section>

          <Section index={1}>
            <p>
              O tratamento dos dados pessoais coletados (endereço de e-mail) tem
              finalidade exclusiva e declarada:
            </p>
            <dl className="not-prose mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
              <div className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="font-semibold text-slate-900 text-sm">
                  Finalidade
                </dt>
                <dd className="text-slate-700 text-sm leading-6">
                  Envio de boletins informativos cívicos sobre a execução
                  orçamentária, alertas fiscais e atualizações do portal
                  MaisTransparencia.
                </dd>
              </div>
              <div className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="font-semibold text-slate-900 text-sm">
                  Base legal
                  <span className="block font-normal text-slate-500">
                    LGPD, Art. 7.º, I
                  </span>
                </dt>
                <dd className="text-slate-700 text-sm leading-6">
                  Consentimento expresso e inequívoco do titular dos dados,
                  obtido por meio do processo de double opt-in.
                </dd>
              </div>
            </dl>
          </Section>

          <Section index={2}>
            <p>
              Para medir o impacto cívico e aprimorar a experiência do portal,
              utilizamos telemetria anônima por meio do{" "}
              <ExternalLink href="https://posthog.com">PostHog</ExternalLink>,
              configurado com as seguintes salvaguardas de privacidade:
            </p>
            <ul>
              <li>
                <strong>Sem identificação pessoal:</strong> nenhum dado
                nominativo é coletado.
              </li>
              <li>
                <strong>Sem rastreamento entre sites:</strong> a telemetria é
                restrita ao domínio do portal.
              </li>
              <li>
                <strong>Dados agregados:</strong> apenas métricas de fluxo de
                navegação entre seções (por exemplo, visitas à página de
                licitações e compartilhamentos cívicos).
              </li>
              <li>
                <strong>Sem comercialização</strong> ou repasse a anunciantes.
              </li>
            </ul>
          </Section>

          <Section index={3}>
            <p>
              O MaisTransparencia <strong>jamais</strong>:
            </p>
            <ul>
              <li>vende, aluga ou cede endereços de e-mail a terceiros;</li>
              <li>
                utiliza dados de contato para fins político-partidários,
                comerciais ou de marketing não relacionado à transparência
                pública;
              </li>
              <li>
                compartilha informações dos titulares com parceiros,
                patrocinadores ou quaisquer outras entidades.
              </li>
            </ul>
          </Section>

          <Section index={4}>
            <p>
              Em conformidade com o{" "}
              <ExternalLink href={`${LGPD_URL}#art18`}>
                Art. 18 da LGPD
              </ExternalLink>
              , o titular dos dados tem garantidos os seguintes direitos:
            </p>
            <ul>
              <li>
                <strong>Cancelamento com 1 clique:</strong> o descadastramento
                do boletim pode ser feito a qualquer momento, pelo link presente
                em cada mensagem enviada (RFC 8058, List-Unsubscribe).
              </li>
              <li>
                <strong>Acesso:</strong> confirmação da existência de tratamento
                e acesso aos dados pessoais armazenados.
              </li>
              <li>
                <strong>Correção:</strong> atualização de dados incompletos ou
                desatualizados.
              </li>
              <li>
                <strong>Eliminação:</strong> exclusão dos dados pessoais
                tratados com base no consentimento, mediante solicitação.
              </li>
              <li>
                <strong>Revogação do consentimento:</strong> a qualquer momento,
                por procedimento simplificado e gratuito.
              </li>
            </ul>
          </Section>

          <Section index={5}>
            <p>
              Para exercer seus direitos como titular, esclarecer dúvidas ou
              solicitar a exclusão de dados pessoais, escreva para o e-mail
              oficial de privacidade.
            </p>
            <div className="not-prose mt-6">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Enviar email para ${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-sm text-white shadow-sm transition-colors hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 focus-visible:outline-offset-2"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M3 4a2 2 0 0 0-2 2v.217l9 5.4 9-5.4V6a2 2 0 0 0-2-2H3Z" />
                  <path d="m19 8.549-8.486 5.092a1 1 0 0 1-1.028 0L1 8.549V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.549Z" />
                </svg>
                {CONTACT_EMAIL}
              </a>
            </div>
          </Section>
        </article>
      </div>
    </main>
  );
}
