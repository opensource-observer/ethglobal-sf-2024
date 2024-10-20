/**
 * Mark an environment as required for the build.
 * This is mostly used for convenience of debugging, so that things break early
 * Note: this should only be used for environment variables prefixed with "NEXT_PUBLIC_".
 *  Client-side bundles will be missing other env variables by definition
 */
export const requireEnv = (value: string | undefined, identifier: string) => {
  if (!value) {
    throw new Error(`Required env var ${identifier} does not exist`);
  }
  return value;
};

export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const STATIC_EXPORT = !!process.env.STATIC_EXPORT;
export const SEGMENT_KEY = process.env.NEXT_PUBLIC_SEGMENT_KEY ?? "MISSING";
export const PLASMIC_PROJECT_ID = process.env.PLASMIC_PROJECT_ID ?? "MISSING";
export const PLASMIC_PROJECT_API_TOKEN =
  process.env.PLASMIC_PROJECT_API_TOKEN ?? "MISSING";
export const DOMAIN = requireEnv(
  process.env.NEXT_PUBLIC_DOMAIN,
  "NEXT_PUBLIC_DOMAIN",
);
export const SUPABASE_URL = requireEnv(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);
export const SUPABASE_ANON_KEY = requireEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);
export const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ?? "MISSING";
export const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "MISSING";
