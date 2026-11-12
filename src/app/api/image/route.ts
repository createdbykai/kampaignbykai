import { randomInt } from "node:crypto";
import {
  isBrandContext,
  isCampaignBrief,
  isCampaignStrategy,
  isRecord,
} from "@/lib/campaign-validation";
import {
  campaignImageCategoryDescriptions,
  campaignImageFormats,
  type CampaignImageCategory,
  isCampaignImageCategory,
  isCampaignImageFormat,
} from "@/lib/image-options";
import { pollinationsImageModels } from "@/lib/pollinations-image-models";

export const maxDuration = 60;

const shotDirections = [
  "full-length portrait, subject small in frame, wide architectural composition",
  "tight waist-up portrait, direct eye contact, intimate editorial crop",
  "three-quarter candid portrait, subject glancing off camera",
  "dynamic walking frame with visible movement in the clothes",
  "low-angle portrait with strong graphic negative space",
  "overhead fashion portrait with an unexpected perspective",
  "side-profile portrait in a layered environmental composition",
  "asymmetrical close fashion portrait with tactile garment detail",
];

const sceneTreatments = [
  "use a soft foreground layer that belongs naturally in the selected location",
  "let the selected location read as subtle texture rather than a busy backdrop",
  "use strong lines in the selected location to lead the eye toward the subject",
  "leave generous negative space on one side of the composition",
  "frame the subject asymmetrically with environmental details from the chosen location",
  "keep the chosen location softly out of focus behind the garment",
  "use a tight composition with the selected location present at the frame edges",
  "capture a quiet, spontaneous moment within the selected location",
];

const poses = [
  "a relaxed, grounded stance with hands in pockets",
  "a candid mid-stride moment with fabric caught in motion",
  "a casual seated pose, shoulders turned toward the camera",
  "a quiet profile pose, looking thoughtfully away",
  "a playful, off-balance movement",
  "a close portrait with an expressive glance over one shoulder",
  "a natural pose interacting with the selected location",
  "a confident pose that brings the garment silhouette into view",
];

const groupPoses = [
  "an unposed group portrait with the people spaced at different depths",
  "friends sharing a candid moment, some looking away from the camera",
  "a loose, asymmetrical group arrangement with varied body language",
  "a group mid-stride, captured naturally in motion",
  "a close crop of the group with overlapping silhouettes",
  "the group arranged at different heights in a relaxed editorial pose",
];

const productCompositions = [
  "a sculptural folded arrangement that reveals the garment's shape",
  "a clean product still life with tactile fabric details in sharp focus",
  "a dramatic close-up of the garment draped across a simple form",
  "a graphic overhead flat lay with deliberate negative space",
  "a single hero garment suspended naturally in the selected location",
  "a detail-focused composition that highlights seams, texture, and silhouette",
];

const lensTreatments = [
  "shot on 35mm film with delicate grain and soft halation",
  "shot on medium-format film with restrained natural grain",
  "shot on a 50mm lens with shallow, soft-focus depth",
  "shot on a 28mm lens with dynamic perspective and crisp detail",
  "shot on an 85mm portrait lens with compressed, cinematic depth",
  "shot on instant film with slightly faded, tactile colors",
];

const accentDetails = [
  "small silver jewelry catching a sharp highlight",
  "natural fabric texture and precise garment construction in focus",
  "a refined contrast detail that stays within the selected color palette",
  "a striking patch of directional light crossing the scene",
  "a restrained, candid, unretouched editorial finish",
  "a bold shadow creating a graphic shape across the frame",
  "a subtle reflection adding depth without changing the setting",
  "a natural breeze adding slight movement to the fabric",
];

function isLogoStyle(value: unknown): value is string {
  return ["Graffiti", "Vintage", "Minimal", "Hand-drawn"].includes(String(value));
}

function clip(value: string, limit = 220) {
  return value.trim().slice(0, limit);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Please submit valid image settings." }, { status: 400 });
  }

  if (!isRecord(body) || !isBrandContext(body.brand)) {
    return Response.json({ error: "A saved brand profile is required." }, { status: 400 });
  }

  const selectedModel = body.model;
  if (
    typeof selectedModel !== "string" ||
    !selectedModel.trim() ||
    selectedModel.length > 200
  ) {
    return Response.json({ error: "Choose an image model before generating." }, { status: 400 });
  }

  let prompt: string;
  let imageDimensions: { width: number; height: number } | undefined;
  if (body.purpose === "logo") {
    if (
      typeof body.logoPrompt !== "string" ||
      body.logoPrompt.length > 1200 ||
      (body.logoStyle !== undefined && !isLogoStyle(body.logoStyle))
    ) {
      return Response.json({ error: "Add a logo prompt." }, { status: 400 });
    }
    if (body.format !== undefined) {
      if (typeof body.format !== "string" || !isCampaignImageFormat(body.format)) {
        return Response.json({ error: "Choose a supported image format." }, { status: 400 });
      }
      const format = campaignImageFormats.find((item) => item.value === body.format);
      if (!format) {
        return Response.json({ error: "Choose a supported image format." }, { status: 400 });
      }
      imageDimensions = { width: format.width, height: format.height };
    }
    prompt = [
      `Create a${isLogoStyle(body.logoStyle) ? ` ${body.logoStyle.toLowerCase()}` : ""} logo for the clothing brand ${clip(body.brand.name, 100)}.`,
      `Brand description: ${clip(body.brand.description, 250)}`,
      `Logo direction: ${clip(body.logoPrompt, 800)}`,
      "Create a single clean, legible brand mark on a plain light background. Do not show clothing, packaging, signs, or mockups.",
    ].join(" ");
  } else if (body.purpose === "standalone") {
    if (
      typeof body.prompt !== "string" ||
      !body.prompt.trim() ||
      body.prompt.length > 1200 ||
      typeof body.category !== "string" ||
      !isCampaignImageCategory(body.category) ||
      typeof body.format !== "string" ||
      !isCampaignImageFormat(body.format)
    ) {
      return Response.json({ error: "Add an image prompt and choose a category and format." }, { status: 400 });
    }
    const category: CampaignImageCategory = body.category;
    const format = campaignImageFormats.find((item) => item.value === body.format);
    if (!format) {
      return Response.json({ error: "Choose a supported image format." }, { status: 400 });
    }
    imageDimensions = { width: format.width, height: format.height };
    prompt = [
      `Premium fashion campaign image for ${clip(body.brand.name, 100)}.`,
      `Brand: ${clip(body.brand.description, 220)}. ${clip(body.brand.personality, 80)}.`,
      `Image category: ${category}. ${campaignImageCategoryDescriptions[category]}`,
      `Image format: ${format.label}, ${format.width} by ${format.height} pixels (${format.detail}). Compose natively for this aspect ratio; do not crop a different format.`,
      `Creative direction: ${clip(body.prompt, 1200)}.`,
      "Respect the selected image category and brand direction. Do not add text or watermarks unless typography is part of the selected category.",
    ].join(" ");
  } else if (body.purpose === "campaign") {
    if (
      !isCampaignBrief(body.brief) ||
      !isCampaignStrategy(body.strategy) ||
      typeof body.category !== "string" ||
      !isCampaignImageCategory(body.category) ||
      typeof body.format !== "string" ||
      !isCampaignImageFormat(body.format)
    ) {
      return Response.json({ error: "Campaign image settings are incomplete." }, { status: 400 });
    }
    const category: CampaignImageCategory = body.category;
    const format = campaignImageFormats.find((item) => item.value === body.format);
    if (!format) {
      return Response.json({ error: "Choose a supported image format." }, { status: 400 });
    }
    imageDimensions = { width: format.width, height: format.height };
    const casting = body.brief.modelCasting.toLowerCase();
    const isProductLed = casting.includes("no models") || casting.includes("product-led");
    const isGroupCasting =
      casting.includes("group") ||
      casting.includes("friends") ||
      casting.includes("community");
    const composition = category === "Landscape Campaign"
      ? "a wide horizontal panoramic scene with clear negative space for a website banner"
      : category === "Campaign Poster / Typography"
        ? "a campaign-poster layout with the fashion photograph as its focal point and a clear, uncluttered area for designed typography"
        : category === "Social Media Creative"
          ? "a bold, tightly framed mobile-first composition that remains readable at social-feed size"
          : category === "Product Spotlight"
            ? productCompositions[randomInt(productCompositions.length)]
            : category === "Graphic Design Creative"
              ? "an art-directed graphic layout combining fashion imagery, confident typography, brand colors, abstract shapes, and deliberate negative space"
              : isProductLed
      ? [
          "overhead flat lay with deliberate negative space",
          "tight macro framing on fabric and garment construction",
          "dramatic three-quarter product view with a sculptural shadow",
          "full garment arranged asymmetrically in frame",
          "graphic close-up showing the silhouette and material",
          "layered still life with the garment as the clear hero",
        ][randomInt(productCompositions.length)]
      : shotDirections[randomInt(shotDirections.length)];
    const poseDirection = isProductLed
      ? `Product styling: ${productCompositions[randomInt(productCompositions.length)]}. No models or people.`
      : `Pose: ${(isGroupCasting ? groupPoses : poses)[
          randomInt((isGroupCasting ? groupPoses : poses).length)
        ]}.`;
    const textDirection = category === "Hero Campaign Image"
      ? "No text or watermarks."
      : category === "Campaign Poster / Typography"
        ? `Use legible designed text overlays with the brand name "${clip(body.brand.name, 80)}", campaign title "${clip(body.brief.name, 80)}"${body.brand.slogan.trim() ? `, slogan "${clip(body.brand.slogan, 100)}"` : ""}. Do not invent a collection name or release date; only include either when explicitly provided. No other text or watermarks.`
        : category === "Graphic Design Creative"
          ? `Typography may use only the brand name "${clip(body.brand.name, 80)}" and campaign title "${clip(body.brief.name, 80)}". Keep text legible, correctly spelled, and uncluttered; no invented words or watermarks.`
          : "Do not add text or watermarks.";
    prompt = [
      `Premium fashion editorial campaign for ${clip(body.brand.name, 100)}.`,
      `Brand: ${clip(body.brand.description, 220)}. ${clip(body.brand.personality, 80)}.`,
      `Campaign idea: ${clip(body.strategy.overview, 220)}.`,
      `Creative direction: ${clip(body.strategy.visualIdentity, 180)}.`,
      `Photography: ${clip(body.brief.photographyStyle, 80)}, ${clip(body.brief.location, 60)}, ${clip(body.brief.lighting, 60)} lighting.`,
      `Aesthetic: ${clip(body.brief.aesthetic, 60)}. Mood: ${clip(body.brief.mood, 60)}.`,
      `Palette: ${clip(body.brief.colourPalette, 60)}. Season: ${clip(body.brief.season, 60)}.`,
      `Casting: ${clip(body.brief.modelCasting, 80)}.`,
      `Image category: ${category}. ${campaignImageCategoryDescriptions[category]}`,
      `Image format: ${format.label}, ${format.width} by ${format.height} pixels (${format.detail}). Compose natively for this aspect ratio; do not crop a different format.`,
      `Additional direction: ${clip(body.brief.creativeInstructions, 180)}.`,
      `Composition: ${composition}.`,
      `Scene treatment: ${sceneTreatments[randomInt(sceneTreatments.length)]}.`,
      poseDirection,
      `${lensTreatments[randomInt(lensTreatments.length)]}.`,
      `Detail: ${accentDetails[randomInt(accentDetails.length)]}.`,
      `Photorealistic, refined fashion photography, natural anatomy, tactile fabrics. Make this frame visually distinct in crop, composition, and camera angle while keeping the same brand campaign and respecting the requested casting. ${textDirection}`,
    ].join(" ");
  } else {
    return Response.json({ error: "Choose a supported image type." }, { status: 400 });
  }

  if (!pollinationsImageModels.some((model) => model.name === selectedModel)) {
    return Response.json(
      { error: "Choose an official image model from the model list and try again." },
      { status: 400 },
    );
  }

  const apiKey = process.env.POLLINATIONS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Add POLLINATIONS_API_KEY to your local .env.local file to generate images." },
      { status: 503 },
    );
  }

  const imageUrl = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`);
  imageUrl.searchParams.set("model", selectedModel);
  imageUrl.searchParams.set("seed", String(randomInt(1, 2_147_483_647)));
  if (imageDimensions) {
    imageUrl.searchParams.set("width", String(imageDimensions.width));
    imageUrl.searchParams.set("height", String(imageDimensions.height));
  }

  let response: Response;
  try {
    response = await fetch(imageUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    return Response.json(
      { error: "Image generation timed out or Pollinations could not be reached. Please try again." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return Response.json(
      { error: "Pollinations could not generate this image. Check your API key and try again." },
      { status: 502 },
    );
  }

  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(contentType)) {
    return Response.json({ error: "Pollinations returned an unsupported image format." }, { status: 502 });
  }

  let image: ArrayBuffer;
  try {
    image = await response.arrayBuffer();
  } catch {
    return Response.json({ error: "The generated image could not be downloaded. Please try again." }, { status: 502 });
  }

  if (image.byteLength === 0 || image.byteLength > 15 * 1024 * 1024) {
    return Response.json({ error: "The generated image was empty or too large to save." }, { status: 502 });
  }

  return new Response(image, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
