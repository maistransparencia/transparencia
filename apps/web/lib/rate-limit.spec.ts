import { beforeEach, describe, expect, it } from "vitest";
import {
  checkEmailRateLimit,
  checkIpRateLimit,
  checkRateLimit,
  clearRateLimits,
} from "./rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it("deve permitir requisições dentro do limite", () => {
    const key = "test-key-1";
    const result1 = checkRateLimit(key, 2, 60000);
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(1);

    const result2 = checkRateLimit(key, 2, 60000);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(0);

    const result3 = checkRateLimit(key, 2, 60000);
    expect(result3.success).toBe(false);
    expect(result3.remaining).toBe(0);
    expect(result3.resetInSeconds).toBeGreaterThan(0);
  });

  it("deve aplicar regra de IP (5 reqs a cada 10 min)", () => {
    const ip = "192.168.1.100";
    for (let i = 0; i < 5; i++) {
      const res = checkIpRateLimit(ip);
      expect(res.success).toBe(true);
    }
    const blocked = checkIpRateLimit(ip);
    expect(blocked.success).toBe(false);
    expect(blocked.resetInSeconds).toBeGreaterThan(0);
  });

  it("deve aplicar regra de e-mail (3 reqs a cada 24 horas)", () => {
    const email = "teste@exemplo.com";
    for (let i = 0; i < 3; i++) {
      const res = checkEmailRateLimit(email);
      expect(res.success).toBe(true);
    }
    const blocked = checkEmailRateLimit(email);
    expect(blocked.success).toBe(false);
    expect(blocked.resetInSeconds).toBeGreaterThan(0);
  });
});
