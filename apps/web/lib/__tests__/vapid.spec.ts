import { beforeEach, describe, expect, it } from "vitest";
import { isPushNotificationSupported, urlBase64ToUint8Array } from "../vapid";

describe("vapid utils", () => {
  describe("urlBase64ToUint8Array", () => {
    it("converte string base64url para Uint8Array corretamente", () => {
      // "hello world" em base64: "aGVsbG8gd29ybGQ=" -> url-safe sem padding: "aGVsbG8gd29ybGQ"
      const input = "aGVsbG8gd29ybGQ";
      const result = urlBase64ToUint8Array(input);
      const decoded = new TextDecoder().decode(result);
      expect(decoded).toBe("hello world");
    });

    it("lida com substituições de '-' por '+' e '_' por '/'", () => {
      // bytes [251, 239] -> base64 "+-8=" -> base64url "-_8"
      const input = "-_8";
      const result = urlBase64ToUint8Array(input);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it("lida com padding já presente ou ausente", () => {
      // 4 caracteres base64 múltiplos de 4: "AAAA" -> 3 bytes de 0
      const res1 = urlBase64ToUint8Array("AAAA");
      expect(res1.length).toBe(3);
      expect(res1[0]).toBe(0);

      // "AA" -> necessita de "==" padding
      const res2 = urlBase64ToUint8Array("AA");
      expect(res2.length).toBe(1);
      expect(res2[0]).toBe(0);
    });
  });

  describe("isPushNotificationSupported", () => {
    beforeEach(() => {
      Object.defineProperty(window, "PushManager", {
        value: () => {},
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, "Notification", {
        value: () => {},
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, "serviceWorker", {
        value: {},
        configurable: true,
        writable: true,
      });
    });

    it("retorna true quando serviceWorker, PushManager e Notification estão presentes", () => {
      expect(isPushNotificationSupported()).toBe(true);
    });

    it("retorna false quando PushManager não existe", () => {
      // @ts-expect-error test delete
      delete window.PushManager;
      expect(isPushNotificationSupported()).toBe(false);
    });

    it("retorna false quando Notification não existe", () => {
      // @ts-expect-error test delete
      delete window.Notification;
      expect(isPushNotificationSupported()).toBe(false);
    });

    it("retorna false quando serviceWorker não está em navigator", () => {
      // @ts-expect-error test delete
      delete navigator.serviceWorker;
      expect(isPushNotificationSupported()).toBe(false);
    });
  });
});
