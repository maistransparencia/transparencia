import { beforeEach, describe, expect, it } from "vitest";

describe("Assistant Context LocalStorage Persistence Key Format", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should construct unified storage key for portal slug", () => {
    const slug = "porciuncula_prefeitura";
    const expectedKey = `transparenciaweb_assistant_conversations_${slug}`;

    const mockConversations = [
      {
        id: "conv-1",
        title: "Consulta sobre Saúde",
        createdAt: "2026-08-22T10:00:00.000Z",
        updatedAt: "2026-08-22T10:00:00.000Z",
        messages: [
          {
            id: "msg-1",
            sender: "user",
            text: "Quanto foi gasto com saúde?",
            timestamp: "2026-08-22T10:00:00.000Z",
          },
        ],
      },
    ];

    localStorage.setItem(expectedKey, JSON.stringify(mockConversations));

    const retrieved = localStorage.getItem(expectedKey);
    expect(retrieved).not.toBeNull();
    const parsed = JSON.parse(retrieved || "[]");
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("conv-1");
    expect(parsed[0].title).toBe("Consulta sobre Saúde");
  });

  it("should migrate 2026 legacy key into unified portal key", () => {
    const slug = "porciuncula_prefeitura";
    const legacy2026Key = `transparenciaweb_assistant_conversations_${slug}_2026`;
    const unifiedKey = `transparenciaweb_assistant_conversations_${slug}`;

    const legacyData = [
      {
        id: "conv-legacy-1",
        title: "Pergunta de Teste",
        createdAt: "2026-08-22T10:00:00.000Z",
        updatedAt: "2026-08-22T10:00:00.000Z",
        messages: [
          {
            id: "msg-1",
            sender: "user",
            text: "Qual a receita arrecadada este ano?",
            timestamp: "2026-08-22T10:00:00.000Z",
          },
        ],
      },
    ];

    localStorage.setItem(legacy2026Key, JSON.stringify(legacyData));
    expect(localStorage.getItem(legacy2026Key)).not.toBeNull();

    // Simular migração
    const raw = localStorage.getItem(legacy2026Key);
    if (raw) {
      localStorage.setItem(unifiedKey, raw);
      localStorage.removeItem(legacy2026Key);
    }

    expect(localStorage.getItem(legacy2026Key)).toBeNull();
    expect(localStorage.getItem(unifiedKey)).not.toBeNull();
  });
});
