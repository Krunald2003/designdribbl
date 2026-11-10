// AI vision extraction: Claude locates each reference element in the submission and
// reads its text as written. The numbers that drive the score are then measured from
// pixels by the client-side engine, so the model only has to find things, not judge them.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { AiExtraction, Screen } from "../src/shared/types.ts";
import { isScorable } from "../src/shared/screens.ts";

export const MODEL = "claude-opus-5-5";

const ExtractionSchema = z.object({
  elements: z.array(
    z.object({
      id: z.string(),
      present: z.boolean(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      text_as_written: z.string().nullable(),
    }),
  ),
});

let client: Anthropic | null = null;
export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ timeout: 30_000, maxRetries: 1 });
  return client;
}

const SYSTEM = `You are a meticulous UI inspector. You are shown a designer's recreation of a mobile app screen and a list of elements from the reference design. Your job is to find each element in the image and report where it is, so a separate program can measure it precisely.

Rules:
- Coordinates are in image pixels, origin top-left. The image size is given; boxes must lie inside it.
- For text elements, box the visible glyphs tightly and copy the text exactly as it appears in the image, preserving capitalization and punctuation. If it reads differently from the reference text, report what the image shows.
- For shapes (buttons, cards, inputs, chips, dividers), box the shape itself, including its border.
- The "reference position" is where the element sits in the original design. The recreation may place it differently; always report where it actually is in this image.
- If an element is not in the image at all, set present=false, all numbers to 0 and text_as_written to null.
- Return every listed element exactly once, using its id.`;

export async function extractElements(screen: Screen, pngBase64: string): Promise<AiExtraction> {
  const lines = screen.elements.filter(isScorable).map((el) => {
    if (el.type === "text") {
      // Text boxes are resolved from font metrics on the client; give the anchor instead.
      const anchor = el.align === "center" ? `horizontally centered on x=${Math.round(el.x + el.w / 2)}`
        : el.align === "right" ? `right edge at x=${Math.round(el.x + el.w)}` : `left edge at x=${Math.round(el.x)}`;
      return `- id=${el.id} | text | "${el.name}" | reference text: ${JSON.stringify(el.text)} | reference position: ${anchor}, top y=${Math.round(el.y)}, height ${Math.round(el.h)}`;
    }
    return `- id=${el.id} | shape | "${el.name}" | reference position x=${Math.round(el.x)} y=${Math.round(el.y)} w=${Math.round(el.w)} h=${Math.round(el.h)}`;
  });

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(ExtractionSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/png", data: pngBase64 } },
          {
            type: "text",
            text: `Image size: ${screen.width}×${screen.height} px. This is a recreation of the "${screen.app} — ${screen.screen}" screen.\n\nElements to locate:\n${lines.join("\n")}`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("The model declined to analyse this image.");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("The model returned an unreadable extraction.");
  const known = new Set(screen.elements.map((e) => e.id));
  return {
    model: response.model,
    elements: parsed.elements.filter((e) => known.has(e.id)),
  };
}
