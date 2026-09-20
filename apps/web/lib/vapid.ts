/**
 * Utilitários para conversão de chaves VAPID e detecção de suporte a Web Push no navegador.
 */

/**
 * Converte uma chave pública VAPID codificada em Base64 URL-safe
 * para um Uint8Array exigido pelo método PushManager.subscribe().
 *
 * Suporta execução resiliente em navegadores (atob) e Node/SSR (Buffer fallback).
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const cleanString = base64String.trim();
  const padding = "=".repeat((4 - (cleanString.length % 4)) % 4);
  const base64 = (cleanString + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData =
    typeof window !== "undefined" && typeof window.atob === "function"
      ? window.atob(base64)
      : Buffer.from(base64, "base64").toString("binary");

  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verifica se o ambiente de execução atual possui suporte completo às APIs
 * de Web Push e Service Worker.
 *
 * Retorna false defensivamente em SSR ou navegadores sem suporte.
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
