// Step 3.7 Flash Video Understanding Provider for OpenClaw
// Adds describeVideo capability for step-3.7-flash
//
// Installation:
//   1. Ensure stepfun provider is configured (STEP_API_KEY env var or onboard)
//   2. Run: openclaw plugins install ./openclaw-stepfun-video
//   3. Configure video models in tools.media.video
//
// API Reference: https://platform.stepfun.ai/docs/en/guides/models/step-3.7-flash-quickstart
// Video Best Practices: https://platform.stepfun.ai/docs/en/guides/developer/video-chat

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const STEPFUN_DEFAULT_BASE_URL = "https://api.stepfun.ai/v1";
const STEPFUN_DEFAULT_MODEL = "step-3.7-flash";
const STEPFUN_DEFAULT_PROMPT = "Describe the video content concisely.";
const STEPFUN_MAX_BASE64_BYTES = 128 * 1024 * 1024; // 128MB
const STEPFUN_MAX_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/** Supported video MIME types for Step 3.7 Flash */
const SUPPORTED_MIMES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
]);
const DEFAULT_MIME = "video/mp4";

/**
 * Resolve the StepFun API key.
 *
 * Priority:
 *  1. params.apiKey (resolved by core)
 *  2. STEP_API_KEY env var
 *  3. STEPFUN_API_KEY env var
 *  4. models.providers.stepfun.apiKey config
 */
function resolveApiKey(params) {
  if (params.apiKey) return params.apiKey;
  if (process.env.STEP_API_KEY) return process.env.STEP_API_KEY;
  if (process.env.STEPFUN_API_KEY) return process.env.STEPFUN_API_KEY;

  const cfg = params.cfg ?? {};
  const stepCfg = cfg?.models?.providers?.stepfun;
  if (stepCfg?.apiKey) return stepCfg.apiKey;

  return null;
}

/**
 * Describe a video using Step 3.7 Flash.
 */
async function describeStepfunVideo(params) {
  const fetchFn = params.fetchFn ?? fetch;

  const model = params.model?.trim() || STEPFUN_DEFAULT_MODEL;
  const rawMime = (params.mime || DEFAULT_MIME).trim().toLowerCase();
  const mime = SUPPORTED_MIMES.has(rawMime) ? rawMime : DEFAULT_MIME;
  const prompt = params.prompt?.trim() || STEPFUN_DEFAULT_PROMPT;
  const baseUrl = params.baseUrl?.trim() || STEPFUN_DEFAULT_BASE_URL;
  const timeoutMs = params.timeoutMs ?? 120_000;

  const apiKey = resolveApiKey(params);
  if (!apiKey) {
    throw new Error(
      "Step 3.7 Flash API key not found. Ensure one of: " +
        "STEP_API_KEY env var, STEPFUN_API_KEY env var, " +
        "or stepfun provider config with apiKey."
    );
  }

  // Enforce size limit (128MB per StepFun docs)
  if (params.buffer && params.buffer.length > STEPFUN_MAX_BASE64_BYTES) {
    throw new Error(
      `Video file too large (${(params.buffer.length / (1024 * 1024)).toFixed(1)}MB). ` +
        `Step 3.7 Flash limit is ${STEPFUN_MAX_BASE64_BYTES / (1024 * 1024)}MB.`
    );
  }

  // Build request body per StepFun video understanding API spec
  // video_url only has { url } — no extra fps/resolution fields
  const body = {
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "video_url",
            video_url: {
              url: `data:${mime};base64,${params.buffer.toString("base64")}`,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
    max_tokens: params.maxChars
      ? Math.min(Math.max(params.maxChars, 100), 4096)
      : 1024,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchFn(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "(empty)");
      throw new Error(
        `Step 3.7 Flash video description failed (HTTP ${res.status}): ${errorText.slice(0, 500)}`
      );
    }

    const payload = await res.json();
    const message = payload.choices?.[0]?.message;
    if (!message) {
      throw new Error("Step 3.7 Flash video description response missing choices/message");
    }

    // Extract text from content (string or content-parts array)
    let text = "";
    if (typeof message.content === "string") {
      text = message.content.trim();
    } else if (Array.isArray(message.content)) {
      text = message.content
        .map((p) => (p.text ?? "").trim())
        .filter(Boolean)
        .join("\n");
    }

    if (!text) {
      throw new Error("Step 3.7 Flash video description returned empty content");
    }

    return { text, model };
  } finally {
    clearTimeout(timer);
  }
}

const stepfunMediaUnderstandingProvider = {
  id: "stepfun",  // MUST match the chat provider ID to share auth
  capabilities: ["video"],
  defaultModels: {
    video: STEPFUN_DEFAULT_MODEL,
  },
  autoPriority: { video: 20 },
  describeVideo: describeStepfunVideo,
};

export default definePluginEntry({
  id: "stepfun-video",
  name: "Step 3.7 Flash Video Understanding",
  description: "Step 3.7 Flash video understanding (describeVideo) for OpenClaw",
  register(api) {
    api.registerMediaUnderstandingProvider(stepfunMediaUnderstandingProvider);
  },
});
