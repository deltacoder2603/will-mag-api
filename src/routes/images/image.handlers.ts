import type { CloudflareError } from "cloudflare";

import { Buffer } from "node:buffer";
import sharp from "sharp";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import env from "@/env";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { client, isCloudflareConfigured } from "@/lib/cloudflare";

import type { HealthCheckRoute, TransformImageRoute } from "./image.routes";

// --- KV Cache Configuration ---
const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const CACHE_PREFIX = "img_cache:";

// --- Allowed Hosts (optional for SSRF protection) ---
// const ALLOWED_HOSTS = ["app.swingboudoirmag.com", "images.unsplash.com"];

// --- Transform Image Route ---
export const transformImage: AppRouteHandler<TransformImageRoute> = async (c) => {
  try {
    const query = c.req.valid("query");
    const {
      url,
      w,
      h,
      q,
      f,
      fit,
      position,
      bg,
      blur,
      sharpen,
      grayscale,
      negate,
      normalize,
      threshold,
      gamma,
      brightness,
      saturation,
      hue,
      rotate,
      flip,
      flop,
    } = query;

    if (!url)
      return sendErrorResponse(c, "badRequest", "Image URL is required");

    // Optional: SSRF protection
    // try {
    //   // const parsed = new URL(url);
    //   if (env.NODE_ENV === "production") {
    //     // ✅ Restrict only in production
    //     // if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    //     //   return sendErrorResponse(c, "forbidden", "Host not allowed");
    //     // }
    //   }
    // }
    // catch {
    //   return sendErrorResponse(c, "badRequest", "Invalid URL");
    // }

    // Generate cache key for KV storage
    const cacheKey = `${CACHE_PREFIX}${Buffer.from(JSON.stringify(query)).toString("base64")}`;

    // ✅ Check KV cache first (only if Cloudflare is configured)
    if (isCloudflareConfigured() && client) {
      try {
        const cachedValue = await client.kv.namespaces.values.get(
          env.CLOUDFLARE_KV_NAMESPACE!,
          cacheKey,
          { account_id: env.CLOUDFLARE_ACCOUNT_ID! },
        );

        if (cachedValue) {
          const cachedText = await cachedValue.text();
          const cachedBuffer = Buffer.from(cachedText, "base64");

          const mimeType = getMimeType(f);
          c.header("Content-Type", mimeType);
          c.header("Cache-Control", `public, max-age=${CACHE_TTL}, immutable`);
          c.header("X-Cached", "true");
          return c.body(new Uint8Array(cachedBuffer));
        }
      } catch (error: unknown) {
        const err = error as CloudflareError;
        console.warn("KV cache retrieval failed:", err?.message || error);
        // Continue if cache fails
      }
    }

    // --- Fetch original image ---
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "WillMag-ImageService/1.0",
        "Accept": "image/*",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok || !response.body) {
      return sendErrorResponse(c, "notFound", "Failed to fetch image");
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      return sendErrorResponse(c, "badRequest", "URL does not point to an image");
    }

    // --- Create Sharp instance from response ---
    const responseBuffer = Buffer.from(await response.arrayBuffer());
    let sharpInstance = sharp(responseBuffer, {
      sequentialRead: true,
      failOnError: false,
      limitInputPixels: 8192 * 8192,
    });

    // Apply transformations
    if (w || h) {
      sharpInstance = sharpInstance.resize({
        width: w ? Number(w) : undefined,
        height: h ? Number(h) : undefined,
        fit: fit || "cover",
        position,
        background: bg,
      });
    }
    if (blur)
      sharpInstance = sharpInstance.blur(Number(blur));
    if (sharpen)
      sharpInstance = sharpInstance.sharpen(Number(sharpen));
    if (grayscale)
      sharpInstance = sharpInstance.grayscale();
    if (negate)
      sharpInstance = sharpInstance.negate();
    if (normalize)
      sharpInstance = sharpInstance.normalize();
    if (threshold)
      sharpInstance = sharpInstance.threshold(Number(threshold));
    if (gamma)
      sharpInstance = sharpInstance.gamma(Number(gamma));
    if (brightness || saturation || hue) {
      sharpInstance = sharpInstance.modulate({
        brightness: brightness ? Number(brightness) : 1,
        saturation: saturation ? Number(saturation) : 1,
        hue: hue ? Number(hue) : 0,
      });
    }
    if (rotate)
      sharpInstance = sharpInstance.rotate(Number(rotate));
    if (flip)
      sharpInstance = sharpInstance.flip();
    if (flop)
      sharpInstance = sharpInstance.flop();

    const format = f || "jpeg";
    const quality = q ? Number(q) : 80;

    sharpInstance = sharpInstance.toFormat(format as keyof sharp.FormatEnum, { quality });

    const finalBuffer = await sharpInstance.toBuffer();

    // Store in KV if <5MB and Cloudflare is configured
    if (finalBuffer.length < 5 * 1024 * 1024 && isCloudflareConfigured() && client) {
      try {
        await client.kv.namespaces.values.update(env.CLOUDFLARE_KV_NAMESPACE!, cacheKey, {
          account_id: env.CLOUDFLARE_ACCOUNT_ID!,
          value: finalBuffer.toString("base64"),
          expiration_ttl: CACHE_TTL,
        });
      } catch (error) {
        console.warn("KV cache storage failed:", error);
      }
    }

    // Return transformed image
    const mimeType = getMimeType(format);
    c.header("Content-Type", mimeType);
    c.header("Cache-Control", `public, max-age=${CACHE_TTL}, immutable`);
    c.header("X-Cached", "false");

    return c.body(new Uint8Array(finalBuffer));
  } catch (err) {
    console.error("Image transform error:", err);
    return sendErrorResponse(c, "internalServerError", "Failed to transform image");
  }
};

// --- Health Check Route ---
export const healthCheck: AppRouteHandler<HealthCheckRoute> = async (c) => {
  try {
    const testBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    );
    await sharp(testBuffer).jpeg().toBuffer();

    return c.json(
      {
        status: "healthy",
        service: "image-transformation",
        cache: {
          size: 0, // KV doesn't provide size info easily
          ttl: CACHE_TTL,
        },
        performance: {
          totalRequests: 0,
          cacheHits: 0,
          cacheMisses: 0,
          cacheHitRate: "0.00%",
          averageProcessingTime: "0.00ms",
          testProcessingTime: "0.00ms",
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    return c.json(
      {
        status: "unhealthy",
        service: "image-transformation",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

// --- Helper ---
function getMimeType(format?: string): string {
  switch (format) {
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "avif": return "image/avif";
    default: return "image/jpeg";
  }
}
