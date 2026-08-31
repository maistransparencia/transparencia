import { sql } from "kysely";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dbWrite } from "../../client";
import { runMigrations } from "../../migrator";
import { PORTAL_SLUG } from "../../test-helpers";
import {
  confirmNewsletterSubscription,
  getNewsletterSubscriber,
  subscribeNewsletter,
  unsubscribeNewsletterByToken,
} from "../newsletter";

describe("newsletter queries", () => {
  beforeAll(async () => {
    // Executa as migrações Kysely no banco de teste
    await runMigrations(dbWrite);
  });

  beforeEach(async () => {
    await sql`DELETE FROM public.newsletter_subscribers WHERE portal_slug = ${PORTAL_SLUG}`.execute(
      dbWrite,
    );
  });

  it("deve criar uma nova inscrição pendente com tokens criptográficos", async () => {
    const email = "cidadao@exemplo.com";
    const sub = await subscribeNewsletter(PORTAL_SLUG, email);

    expect(sub).toBeDefined();
    expect(sub.portalSlug).toBe(PORTAL_SLUG);
    expect(sub.email).toBe(email);
    expect(sub.status).toBe("pendente");
    expect(typeof sub.tokenConfirmacao).toBe("string");
    expect(sub.tokenConfirmacao.length).toBeGreaterThan(10);
    expect(typeof sub.tokenCancelamento).toBe("string");
    expect(sub.tokenCancelamento.length).toBeGreaterThan(10);
    expect(sub.confirmedAt).toBeNull();
    expect(sub.unsubscribedAt).toBeNull();

    // Consulta no leitor
    const found = await getNewsletterSubscriber(PORTAL_SLUG, email);
    expect(found).not.toBeNull();
    expect(found?.email).toBe(email);
    expect(found?.status).toBe("pendente");
  });

  it("deve atualizar tokens e reativar se mesmo e-mail for submetido novamente", async () => {
    const email = "cidadao2@exemplo.com";
    const sub1 = await subscribeNewsletter(PORTAL_SLUG, email);
    const sub2 = await subscribeNewsletter(PORTAL_SLUG, email);

    expect(sub2.id).toBe(sub1.id);
    expect(sub2.status).toBe("pendente");
    expect(sub2.tokenConfirmacao).not.toBe(sub1.tokenConfirmacao);
    expect(sub2.tokenCancelamento).toBe(sub1.tokenCancelamento);
  });

  it("não deve desativar assinante já confirmado se o e-mail for re-submetido", async () => {
    const email = "cidadao_ativo@exemplo.com";
    const sub1 = await subscribeNewsletter(PORTAL_SLUG, email);
    await confirmNewsletterSubscription(sub1.tokenConfirmacao);

    const sub2 = await subscribeNewsletter(PORTAL_SLUG, email);
    expect(sub2.id).toBe(sub1.id);
    expect(sub2.status).toBe("confirmado");
    expect(sub2.confirmedAt).not.toBeNull();
    expect(sub2.tokenCancelamento).toBe(sub1.tokenCancelamento);
  });

  it("deve confirmar inscrição via token de confirmação", async () => {
    const email = "cidadao_confirm@exemplo.com";
    const sub = await subscribeNewsletter(PORTAL_SLUG, email);

    const confirmed = await confirmNewsletterSubscription(sub.tokenConfirmacao);
    expect(confirmed).not.toBeNull();
    expect(confirmed?.status).toBe("confirmado");
    expect(confirmed?.confirmedAt).not.toBeNull();

    const notFound = await confirmNewsletterSubscription("token-invalido");
    expect(notFound).toBeNull();
  });

  it("deve cancelar inscrição via token de cancelamento", async () => {
    const email = "cidadao_unsub@exemplo.com";
    const sub = await subscribeNewsletter(PORTAL_SLUG, email);
    await confirmNewsletterSubscription(sub.tokenConfirmacao);

    const unsubscribed = await unsubscribeNewsletterByToken(
      sub.tokenCancelamento,
    );
    expect(unsubscribed).not.toBeNull();
    expect(unsubscribed?.status).toBe("cancelado");
    expect(unsubscribed?.unsubscribedAt).not.toBeNull();

    const notFound = await unsubscribeNewsletterByToken("token-invalido");
    expect(notFound).toBeNull();
  });
});
