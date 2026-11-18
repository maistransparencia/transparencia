import { SectionHeader } from "@transparencia/ui";
import { LinhaLeiEFonte } from "@/components/lei-e-fonte";

const LEI_ORGANICA_SAUDE = {
  label: "Lei 8.080/1990, arts. 6º e 7º",
  url: "https://www.planalto.gov.br/ccivil_03/leis/l8080.htm",
  ariaLabel: "Texto oficial da Lei 8.080/1990 no Planalto",
};

const DECRETO_ACESSO = {
  label: "Decreto 7.508/2011, arts. 8º, 20 e 28",
  url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/decreto/d7508.htm",
  ariaLabel: "Texto oficial do Decreto 7.508/2011 no Planalto",
};

/** Regra geral federal de quem retira remédio na Farmácia SUS; vale para qualquer município. */
export function FarmaciaDireitoRemedios() {
  return (
    <section id="direito-remedios" className="scroll-mt-20">
      <SectionHeader title="Quem pode retirar remédio na Farmácia SUS?" />
      <div className="space-y-6">
        <section className="space-y-2">
          <p className="text-mute text-sm leading-relaxed">
            Quem é atendido pelo SUS e tem receita de um profissional do SUS,
            para um remédio que esteja na lista oficial do SUS. O remédio é
            entregue nas unidades que a gestão do SUS indica. Ter o remédio na
            lista não garante que ele esteja em estoque hoje.
          </p>
        </section>
        <section className="space-y-2">
          <h3>Posso retirar remédio em outra cidade?</h3>
          <p className="text-mute text-sm leading-relaxed">
            Depende do remédio e das regras da região. A lei federal não diz que
            é preciso morar no município, mas também não garante a retirada em
            outra cidade. Remédios de maior custo ou para doenças específicas
            são entregues pela Secretaria de Saúde do estado, em farmácias de
            referência, e costumam pedir documentos como Cartão SUS e
            comprovante de residência. Para os demais, cada município decide
            onde entrega e o que pede. Antes de ir, ligue ou passe na farmácia
            da cidade onde quer retirar.
          </p>
        </section>
        <LinhaLeiEFonte laws={[LEI_ORGANICA_SAUDE, DECRETO_ACESSO]} />
      </div>
    </section>
  );
}
