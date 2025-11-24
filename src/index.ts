import { serve } from "@hono/node-server";
import dns from "node:dns";

// Fix DNS resolution issue - use Google DNS as fallback
// This ensures oauth2.googleapis.com can be resolved
// Set DNS servers before any other imports that might trigger network requests
const defaultServers = dns.getServers();
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", ...defaultServers]);

// Verify DNS resolution works synchronously using promises
(async () => {
  try {
    const addresses = await new Promise<string[]>((resolve, reject) => {
      dns.resolve4("oauth2.googleapis.com", (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
    console.log("✅ DNS resolution working - oauth2.googleapis.com resolves to:", addresses?.[0] || "unknown");
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    console.warn("⚠️  DNS resolution warning for oauth2.googleapis.com:", error.message);
    console.warn("   This may cause Google OAuth to fail. Check your network connection.");
    console.warn("   The server will continue, but OAuth may not work until DNS is resolved.");
  }
})();

import app from "./app";
import env from "./env";

const port = env.PORT;
// eslint-disable-next-line no-console
console.log(`Server is running on port http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
