import { auth } from "@/lib/auth";
import { createRouter } from "@/lib/create-app";

const router = createRouter()
  .get("/auth/doc", async (c) => {
    const openAPISchema = await auth.api.generateOpenAPISchema();
    const postRequest = openAPISchema.paths["/sign-up/email"]?.post;
    const reqBody = postRequest?.requestBody?.content["application/json"]?.schema;
    const postSocialRequest = openAPISchema.paths["/sign-in/social"]?.post;
    const reqBodySocial = postSocialRequest?.requestBody?.content["application/json"]?.schema;

    if (reqBody && reqBody.properties) {
      // Add username property if it doesn't exist
      if (!reqBody.properties.username) {
        reqBody.properties.username = {
          type: "string",
          minLength: 3,
          maxLength: 100,
          description: "Username is required",
        };
      }

      if (!reqBody.properties.type) {
        reqBody.properties.type = {
          type: "string",
          enum: ["MODEL", "VOTER"],
          description: "User type is required",
        };
      }

      // Ensure username is required
      if (!Array.isArray(reqBody.required)) {
        reqBody.required = [];
      }
      if (!reqBody.required.includes("username")) {
        reqBody.required.push("username");
      }
    }

    if (reqBodySocial && reqBodySocial.properties) {
      if (!reqBodySocial.properties.type) {
        reqBodySocial.properties.type = {
          type: "string",
          enum: ["MODEL", "VOTER"],
          description: "User type is required",
        };
      }
    }

    return c.json(openAPISchema);
  })
  .on(["POST", "GET", "PUT", "PATCH", "OPTIONS"], "/auth/*", async (c) => {
    try {
      // Let Better Auth handle all auth routes, including its own error pages
      const response = await auth.handler(c.req.raw);
      return response;
    } catch (error) {
      // Enhanced error logging for network/DNS issues
      if (error instanceof Error) {
        // Check for DNS/network errors
        if (error.message.includes("ENOTFOUND") || error.message.includes("getaddrinfo")) {
          console.error("🌐 Network/DNS Error in Better Auth:");
          console.error("   This usually means the server cannot reach Google OAuth servers.");
          console.error("   Check your internet connection and DNS settings.");
          console.error("   Error:", error.message);
          
          // Check if it's specifically oauth2.googleapis.com
          if (error.message.includes("oauth2.googleapis.com")) {
            console.error("   💡 Tip: Verify DNS resolution with: nslookup oauth2.googleapis.com");
            console.error("   💡 Tip: Check if firewall is blocking outbound HTTPS connections");
          }
        } else {
          console.error("Better Auth Handler Error:", error.message);
          if (error.stack) {
            console.error("Error stack:", error.stack);
          }
        }
      } else {
        console.error("Better Auth Handler Error:", error);
      }
      // Re-throw to let Better Auth's internal error handling work
      throw error;
    }
  });

export default router;
