import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createMessageObjectSchema } from "stoker/openapi/schemas";

import env from "@/env";
import { createRouteBuilder } from "@/routes/procedure.route";

const router = createRouteBuilder()
  .openapi(
    createRoute({
      tags: ["Index"],
      method: "get",
      path: "/",
      hide: true,
      responses: {
        [HttpStatusCodes.OK]: jsonContent(
          createMessageObjectSchema("Swing Mag API").extend({
            "API Doc": z.string(),
            "API Reference": z.string(),
          }),
          "Swing Magazine API Index",
        ),
      },
    }),
    (c) => {
      return c.json({
        "message": "Swing Magazine API",
        "API Doc": `${env.PUBLIC_APP_URL}/api/v1/doc`,
        "API Reference": `${env.PUBLIC_APP_URL}/reference`,
      }, HttpStatusCodes.OK);
    },
  );

export default router.getRouter();
