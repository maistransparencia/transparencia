import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const parsedEnv = createEnv({
  isServer: typeof window === "undefined" || process.env.NODE_ENV === "test",
  shared: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  server: {
    DATABASE_URL: z
      .string()
      .min(1)
      .default("postgresql://postgres:postgres@localhost:5544/postgres"),
    DATABASE_WRITE_URL: z.string().min(1).optional(),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(5),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z
      .string()
      .min(1)
      .default("MaisTransparencia <info@maistransparencia.com>"),
    CRON_SECRET: z.string().min(1).optional(),
    INTERNAL_API_SECRET: z.string().min(1).optional(),
    DIGEST_SECRET: z.string().min(1).optional(),
    SOCIAL_SECRET: z.string().min(1).optional(),
    X_API_KEY: z.string().min(1).optional(),
    X_API_SECRET: z.string().min(1).optional(),
    X_ACCESS_TOKEN: z.string().min(1).optional(),
    X_ACCESS_TOKEN_SECRET: z.string().min(1).optional(),
    X_BEARER_TOKEN: z.string().min(1).optional(),
    FACEBOOK_PAGE_ID: z.string().min(1).optional(),
    FACEBOOK_PAGE_ACCESS_TOKEN: z.string().min(1).optional(),
    VERCEL_URL: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z
      .string()
      .min(1)
      .transform((val) => val.replace(/\/+$/, ""))
      .optional(),
    NEXT_PUBLIC_SITE_DOMAIN: z.string().min(1).default("maistransparencia.com"),
    NEXT_PUBLIC_SITE_NAME: z.string().min(1).default("MaisTransparencia"),
    NEXT_PUBLIC_PROJECT_NAME: z.string().min(1).default("MaisTransparencia"),
    NEXT_PUBLIC_X_URL: z
      .string()
      .min(1)
      .default("https://x.com/mtransparenciax"),
    NEXT_PUBLIC_X_HANDLE: z.string().min(1).default("@mtransparenciax"),
    NEXT_PUBLIC_GITHUB_URL: z
      .string()
      .min(1)
      .default("https://github.com/maistransparencia/transparencia"),
    NEXT_PUBLIC_FACEBOOK_URL: z
      .string()
      .min(1)
      .default("https://facebook.com/maistransparencia"),
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z
      .string()
      .min(1)
      .default("https://us.i.posthog.com"),
  },
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_DOMAIN: process.env.NEXT_PUBLIC_SITE_DOMAIN,
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
    NEXT_PUBLIC_PROJECT_NAME: process.env.NEXT_PUBLIC_PROJECT_NAME,
    NEXT_PUBLIC_X_URL: process.env.NEXT_PUBLIC_X_URL,
    NEXT_PUBLIC_X_HANDLE: process.env.NEXT_PUBLIC_X_HANDLE,
    NEXT_PUBLIC_GITHUB_URL: process.env.NEXT_PUBLIC_GITHUB_URL,
    NEXT_PUBLIC_FACEBOOK_URL: process.env.NEXT_PUBLIC_FACEBOOK_URL,
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN:
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  emptyStringAsUndefined: true,
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.SKIP_ENV_VALIDATION === "1",
});

export const env: typeof parsedEnv = new Proxy(parsedEnv, {
  get(target, prop) {
    if (
      typeof prop === "string" &&
      process.env.NODE_ENV === "test" &&
      process.env[prop] !== undefined
    ) {
      const val = process.env[prop];
      if (val === "") {
        return Reflect.get(target, prop);
      }
      if (prop === "DATABASE_POOL_MAX") {
        const parsedNum = Number(val);
        return Number.isNaN(parsedNum)
          ? Reflect.get(target, prop)
          : Math.floor(parsedNum);
      }
      if (prop === "NEXT_PUBLIC_APP_URL") {
        return typeof val === "string" ? val.replace(/\/+$/, "") : val;
      }
      return val;
    }
    return Reflect.get(target, prop);
  },
});
