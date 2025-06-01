import { URL } from "url"; // Import Node.js URL module

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Helper function to parse the DATABASE_URL and URL-encode its password component.
 * @param {string | undefined} urlString The raw DATABASE_URL string.
 * @returns {string | undefined} The DATABASE_URL with its password encoded, or original/undefined if issues occur.
 */
function getEncodedDatabaseUrl(urlString) {
  if (!urlString) {
    return undefined;
  }
  try {
    const parsedUrl = new URL(urlString);
    if (parsedUrl.password) {
      parsedUrl.password = encodeURIComponent(parsedUrl.password);
    }
    // Optionally, you could also encode the username if it might contain special characters:
    if (parsedUrl.username) {
      parsedUrl.username = encodeURIComponent(parsedUrl.username);
    }
    return parsedUrl.href;
  } catch (e) {
    console.error(
      "Error parsing or encoding DATABASE_URL in src/env.js helper. " +
        "Ensure it's a valid URL format in your .env file. " +
        "Returning original value for Zod to handle validation.",
      e,
    );
    // If parsing/encoding fails, return the original string for Zod to validate (and likely fail).
    return urlString;
  }
}

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(), // This will validate the transformed URL
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: getEncodedDatabaseUrl(process.env.DATABASE_URL),
    NODE_ENV: process.env.NODE_ENV,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
