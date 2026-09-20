import { sql } from "kysely";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dbWrite } from "../../client";
import { runMigrations } from "../../migrator";
import { PORTAL_SLUG } from "../../test-helpers";
import {
  getActivePushSubscriptions,
  prunePushSubscriptions,
  recordPushNotificationFailure,
  recordPushNotificationSuccess,
  removePushSubscription,
  savePushSubscription,
} from "../push";

describe("push subscriptions queries", () => {
  beforeAll(async () => {
    // Executa as migrações Kysely no banco de teste local
    await runMigrations(dbWrite);
  });

  beforeEach(async () => {
    await sql`DELETE FROM public.push_subscriptions`.execute(dbWrite);
  });

  it("deve criar uma nova subscrição de push com sucesso (upsert inicial)", async () => {
    const input = {
      portalSlug: PORTAL_SLUG,
      endpoint: "https://fcm.googleapis.com/fcm/send/sub-1",
      p256dh: "key-p256dh-1",
      auth: "key-auth-1",
      userAgent: "Mozilla/5.0 TestBrowser",
      topics: ["extracoes", "versoes"],
    };

    const sub = await savePushSubscription(input);

    expect(sub).toBeDefined();
    expect(sub.id).toBeDefined();
    expect(sub.portalSlug).toBe(PORTAL_SLUG);
    expect(sub.endpoint).toBe(input.endpoint);
    expect(sub.p256dh).toBe(input.p256dh);
    expect(sub.auth).toBe(input.auth);
    expect(sub.userAgent).toBe("Mozilla/5.0 TestBrowser");
    expect(sub.topics).toEqual(["extracoes", "versoes"]);
    expect(sub.createdAt).toBeDefined();
    expect(sub.lastNotifiedAt).toBeNull();
    expect(sub.failedAttempts).toBe(0);
  });

  it("deve ser idempotente e atualizar chaves ao submeter mesmo endpoint", async () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/sub-idempotent";
    const sub1 = await savePushSubscription({
      portalSlug: PORTAL_SLUG,
      endpoint,
      p256dh: "key-v1",
      auth: "auth-v1",
      topics: ["extracoes"],
    });

    // Simula falhas acumuladas
    await recordPushNotificationFailure([endpoint]);
    await recordPushNotificationFailure([endpoint]);

    const sub2 = await savePushSubscription({
      portalSlug: PORTAL_SLUG,
      endpoint,
      p256dh: "key-v2",
      auth: "auth-v2",
      topics: ["extracoes", "versoes"],
    });

    expect(sub2.id).toBe(sub1.id);
    expect(sub2.endpoint).toBe(endpoint);
    expect(sub2.p256dh).toBe("key-v2");
    expect(sub2.auth).toBe("auth-v2");
    expect(sub2.topics).toEqual(["extracoes", "versoes"]);
    expect(sub2.failedAttempts).toBe(0); // Resetou tentativas de falha
  });

  it("deve consultar subscrições ativas filtradas por portalSlug ou gerais", async () => {
    await savePushSubscription({
      portalSlug: PORTAL_SLUG,
      endpoint: "https://fcm.googleapis.com/fcm/send/sub-portal-1",
      p256dh: "k1",
      auth: "a1",
    });
    await savePushSubscription({
      portalSlug: PORTAL_SLUG,
      endpoint: "https://fcm.googleapis.com/fcm/send/sub-portal-2",
      p256dh: "k2",
      auth: "a2",
    });
    await savePushSubscription({
      portalSlug: "outro_portal",
      endpoint: "https://fcm.googleapis.com/fcm/send/sub-outro-1",
      p256dh: "k3",
      auth: "a3",
    });

    const portalSubs = await getActivePushSubscriptions(PORTAL_SLUG);
    expect(portalSubs).toHaveLength(2);
    expect(portalSubs.every((s) => s.portalSlug === PORTAL_SLUG)).toBe(true);

    const allSubs = await getActivePushSubscriptions();
    expect(allSubs).toHaveLength(3);
  });

  it("deve excluir subscrições com 5 ou mais falhas consecutivas da lista ativa", async () => {
    const activeEp = "https://fcm.googleapis.com/fcm/send/active-ep";
    const deadEp = "https://fcm.googleapis.com/fcm/send/dead-ep";

    await savePushSubscription({
      portalSlug: PORTAL_SLUG,
      endpoint: activeEp,
      p256dh: "k1",
      auth: "a1",
    });
    await savePushSubscription({
      portalSlug: PORTAL_SLUG,
      endpoint: deadEp,
      p256dh: "k2",
      auth: "a2",
    });

    // Simula 5 falhas no deadEp
    for (let i = 0; i < 5; i++) {
      await recordPushNotificationFailure([deadEp]);
    }

    const activeSubs = await getActivePushSubscriptions(PORTAL_SLUG);
    expect(activeSubs).toHaveLength(1);
    expect(activeSubs[0].endpoint).toBe(activeEp);
  });

  it("deve remover uma subscrição com removePushSubscription", async () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/sub-to-remove";
    await savePushSubscription({
      portalSlug: PORTAL_SLUG,
      endpoint,
      p256dh: "k1",
      auth: "a1",
    });

    const removed = await removePushSubscription(endpoint, PORTAL_SLUG);
    expect(removed).toBe(true);

    const subs = await getActivePushSubscriptions(PORTAL_SLUG);
    expect(subs).toHaveLength(0);

    const removedAgain = await removePushSubscription(endpoint, PORTAL_SLUG);
    expect(removedAgain).toBe(false);
  });

  it("deve podar subscrições revogadas em lote (prunePushSubscriptions)", async () => {
    const ep1 = "https://fcm.googleapis.com/fcm/send/prune-1";
    const ep2 = "https://fcm.googleapis.com/fcm/send/prune-2";
    const ep3 = "https://fcm.googleapis.com/fcm/send/keep-3";

    await savePushSubscription({
      portalSlug: PORTAL_SLUG,
      endpoint: ep1,
      p256dh: "k",
      auth: "a",
    });
    await savePushSubscription({
      portalSlug: PORTAL_SLUG,
      endpoint: ep2,
      p256dh: "k",
      auth: "a",
    });
    await savePushSubscription({
      portalSlug: PORTAL_SLUG,
      endpoint: ep3,
      p256dh: "k",
      auth: "a",
    });

    // Poda vazia não deve falhar nem deletar
    const zeroPruned = await prunePushSubscriptions([]);
    expect(zeroPruned).toBe(0);

    // Poda em lote dos revogados
    const prunedCount = await prunePushSubscriptions([
      ep1,
      ep2,
      "https://fcm.googleapis.com/inexistente",
    ]);
    expect(prunedCount).toBe(2);

    const remaining = await getActivePushSubscriptions(PORTAL_SLUG);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].endpoint).toBe(ep3);
  });

  it("deve registrar sucesso e atualizar last_notified_at", async () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/sub-success";
    await savePushSubscription({
      portalSlug: PORTAL_SLUG,
      endpoint,
      p256dh: "k",
      auth: "a",
    });

    await recordPushNotificationFailure([endpoint]);
    let subs = await getActivePushSubscriptions(PORTAL_SLUG);
    expect(subs[0].failedAttempts).toBe(1);
    expect(subs[0].lastNotifiedAt).toBeNull();

    await recordPushNotificationSuccess([endpoint]);

    subs = await getActivePushSubscriptions(PORTAL_SLUG);
    expect(subs[0].failedAttempts).toBe(0);
    expect(subs[0].lastNotifiedAt).not.toBeNull();

    // Chamada sem endpoints não gera erro
    await recordPushNotificationSuccess([]);
  });

  it("deve registrar falhas incrementais", async () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/sub-failure";
    await savePushSubscription({
      portalSlug: PORTAL_SLUG,
      endpoint,
      p256dh: "k",
      auth: "a",
    });

    await recordPushNotificationFailure([endpoint]);
    await recordPushNotificationFailure([endpoint]);

    const subs = await getActivePushSubscriptions(PORTAL_SLUG);
    expect(subs[0].failedAttempts).toBe(2);

    // Chamada sem endpoints não gera erro
    await recordPushNotificationFailure([]);
  });
});
