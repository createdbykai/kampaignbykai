import type {
  BrandContext,
  CampaignBrief,
  CampaignStrategy,
} from "@/lib/types";

const briefTextFields: (keyof CampaignBrief)[] = [
  "name",
  "type",
  "objective",
  "targetAudience",
  "aesthetic",
  "photographyStyle",
  "modelCasting",
  "location",
  "lighting",
  "season",
  "mood",
  "colourPalette",
  "creativeInstructions",
];

const brandTextFields: (keyof BrandContext)[] = [
  "name",
  "secondaryName",
  "slogan",
  "description",
  "category",
  "targetAudience",
  "personality",
  "positioning",
  "inspirations",
];

const strategyTextFields: (keyof CampaignStrategy)[] = [
  "overview",
  "creativeDirection",
  "visualIdentity",
  "photographyDirection",
  "campaignImages",
  "marketingCopy",
  "campaignExecution",
];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord<T extends string>(
  value: unknown,
  fields: readonly T[],
): value is Record<T, string> {
  return (
    isRecord(value) &&
    fields.every(
      (field) =>
        typeof value[field] === "string" && value[field].length <= 2000,
    )
  );
}

export function isCampaignBrief(value: unknown): value is CampaignBrief {
  return (
    isStringRecord(value, briefTextFields) &&
    Array.isArray(value.formats) &&
    value.formats.length <= 8 &&
    value.formats.every((format) => typeof format === "string" && format.length <= 80)
  );
}

export function isCampaignStrategy(value: unknown): value is CampaignStrategy {
  return (
    isStringRecord(value, strategyTextFields) &&
    strategyTextFields.every((field) => value[field].trim().length > 0)
  );
}

export function isBrandContext(value: unknown): value is BrandContext {
  return isStringRecord(value, brandTextFields) && value.name.trim().length > 0;
}
