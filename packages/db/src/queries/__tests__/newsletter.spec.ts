import { sql } from "kysely";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dbWrite } from "../../client";
import { runMigrations } from "../../migrator";
import { PORTAL_SLUG } from "../../test-helpers";
import {
  confirmNewsletterSubscription,
  getConfirmedNewsletterSubscribers,
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
    await sql`DELETE FROM public.newsletter_subscribers WHERE portal_slug = ${PORTAL_SLUG} OR portal_slug = 'outro_portal'`.execute(
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

  it("deve listar apenas assinantes com status confirmado para o portal especificado", async () => {
    // 1. Assinante confirmado no portal
    const sub1 = await subscribeNewsletter(
      PORTAL_SLUG,
      "confirmado1@exemplo.com",
    );
    await confirmNewsletterSubscription(sub1.tokenConfirmacao);

    // 2. Assinante confirmado 2 no portal
    const sub2 = await subscribeNewsletter(
      PORTAL_SLUG,
      "confirmado2@exemplo.com",
    );
    await confirmNewsletterSubscription(sub2.tokenConfirmacao);

    // 3. Assinante pendente no portal
    await subscribeNewsletter(PORTAL_SLUG, "pendente@exemplo.com");

    // 4. Assinante cancelado no portal
    const sub4 = await subscribeNewsletter(
      PORTAL_SLUG,
      "cancelado@exemplo.com",
    );
    await confirmNewsletterSubscription(sub4.tokenConfirmacao);
    await unsubscribeNewsletterByToken(sub4.tokenCancelamento);

    // 5. Assinante confirmado em outro portal
    const sub5 = await subscribeNewsletter("outro_portal", "outro@exemplo.com");
    await confirmNewsletterSubscription(sub5.tokenConfirmacao);

    const activeList = await getConfirmedNewsletterSubscribers(PORTAL_SLUG);
    expect(activeList).toHaveLength(2);
    expect(activeList.map((s) => s.email)).toEqual([
      "confirmado1@exemplo.com",
      "confirmado2@exemplo.com",
    ]);
    expect(activeList[0].portalSlug).toBe(PORTAL_SLUG);
    expect(activeList[0].status).toBe("confirmado");
    expect(activeList[0].tokenCancelamento).toBeDefined();
  });
});
