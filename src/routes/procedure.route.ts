import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";

import type { AppBindings } from "@/types/types";

import { sendErrorResponse } from "@/helpers/send-error-response";
import { auth } from "@/lib/auth";
import { createRouter } from "@/lib/create-app";

export type AuthLevel = "public" | "private" | "admin";

// Middleware: Require user to be authenticated
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return sendErrorResponse(c, "unauthorized", "Authentication required");
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
};

// Middleware: Require user to be admin
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const user = c.get("user");

  if (!user || user.role !== "ADMIN") {
    return sendErrorResponse(c, "forbidden", "Admin access required");
  }

  return next();
};

class RouteBuilder {
  private router: ReturnType<typeof createRouter>;

  constructor(router?: ReturnType<typeof createRouter>) {
    this.router = router ?? createRouter();
  }

  openapi<R extends RouteConfig>(
    route: R,
    handler: RouteHandler<R, AppBindings>,
    authOrOptions?: AuthLevel | { auth?: AuthLevel; middlewares?: MiddlewareHandler[] },
  ) {
    let auth: AuthLevel = "public";
    let middlewares: MiddlewareHandler[] = [];

    if (typeof authOrOptions === "string") {
      auth = authOrOptions;
    } else if (typeof authOrOptions === "object" && authOrOptions !== null) {
      auth = authOrOptions.auth ?? "public";
      middlewares = authOrOptions.middlewares ?? [];
    }

    const path = (route as any).getRoutingPath();

    const authMiddlewareMap: Record<AuthLevel, MiddlewareHandler[]> = {
      public: [],
      private: [requireAuth],
      admin: [requireAuth, requireAdmin],
    };

    const appliedMiddlewares = [...authMiddlewareMap[auth], ...middlewares];

    if (appliedMiddlewares.length > 0) {
      this.router.use(path, ...appliedMiddlewares);
    }

    // ❗ disable TS inference here
    (this.router as any).openapi(route, handler);

    return this;
  }

  getRouter() {
    return this.router;
  }
}

export function createRouteBuilder(router?: ReturnType<typeof createRouter>) {
  return new RouteBuilder(router);
}
