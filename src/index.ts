import { serve } from "@hono/node-server";
import dns from "node:dns";

// Fix DNS resolution issue - use Google DNS as fallback
// This ensures oauth2.googleapis.com can be resolved
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import app from "./app";
import env from "./env";

const port = env.PORT;
// eslint-disable-next-line no-console
console.log(`Server is running on port http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
