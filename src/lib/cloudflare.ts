import Cloudflare from "cloudflare";

import env from "../env";

// Only initialize Cloudflare client if credentials are available
export const client = env.CLOUDFLARE_TOKEN
  ? new Cloudflare({
      apiToken: env.CLOUDFLARE_TOKEN,
    })
  : null;

// Helper to check if Cloudflare is configured
export const isCloudflareConfigured = (): boolean => {
  return !!(
    env.CLOUDFLARE_TOKEN &&
    env.CLOUDFLARE_KV_NAMESPACE &&
    env.CLOUDFLARE_ACCOUNT_ID
  );
};
