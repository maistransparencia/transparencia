import posthog, { type CaptureResult } from "posthog-js";
import { env } from "@/env";

const token = env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const _host = env.NEXT_PUBLIC_POSTHOG_HOST;
const isProduction = env.NODE_ENV === "production";

// Android in-app browsers (for example the one Facebook and Instagram open
// paid-ad links in) inject their own script into the page. When that script
// calls a Java bridge object after the WebView tears it down, the WebView
// raises "Java object is gone". The stack frames belong to the injected code,
// not to this application, so the exception is noise that only adds triage
// cost. Drop the whole family before it reaches Error Tracking.
const ANDROID_WEBVIEW_BRIDGE_MESSAGE = "Java object is gone";

function dropAndroidWebViewBridgeErrors(
  event: CaptureResult | null,
): CaptureResult | null {
  if (event?.event !== "$exception") {
    return event;
  }
  const exceptions = event.properties?.$exception_list;
  if (!Array.isArray(exceptions)) {
    return event;
  }
  const isBridgeError = exceptions.some(
    (exception) =>
      typeof exception?.value === "string" &&
      exception.value.includes(ANDROID_WEBVIEW_BRIDGE_MESSAGE),
  );
  return isBridgeError ? null : event;
}

if (token) {
  posthog.init(token, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    // Include the defaults option as required by PostHog
    defaults: "2026-01-30",
    // Enable Error Tracking only in production, so dev-time compile
    // errors and hot-reload crashes don't pollute production issues.
    capture_exceptions: isProduction,
    // Turn on debug in development mode
    debug: env.NODE_ENV === "development",
    before_send: dropAndroidWebViewBridgeErrors,
  });
}

// IMPORTANT: Never combine this approach with other client-side PostHog initialization
// approaches, especially components like a PostHogProvider.
// instrumentation-client.ts is the correct solution for initializing client-side
// PostHog in Next.js 15.3+ apps.
