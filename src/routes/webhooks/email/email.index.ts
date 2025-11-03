import { Hono } from "hono";
import { handleWebhook } from "../../../../email/emailWebhooks";

const emailWebhookRouter = new Hono();

/**
 * Email Webhook Endpoint
 * POST /api/webhooks/email
 * 
 * Accepts email trigger events and sends appropriate emails
 */
emailWebhookRouter.post("/api/webhooks/email", async (c) => {
  try {
    const body = await c.req.json();
    const { event, data } = body;

    if (!event || !data) {
      return c.json(
        {
          success: false,
          error: "Missing event or data",
        },
        400,
      );
    }

    const result = await handleWebhook(event, data);

    return c.json(result);
  }
  catch (error: any) {
    console.error("Webhook error:", error);
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500,
    );
  }
});

export default emailWebhookRouter;

