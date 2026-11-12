export const campaignImageCategories = [
  "Hero Campaign Image",
  "Campaign Poster / Typography",
  "Landscape Campaign",
  "Social Media Creative",
  "Product Spotlight",
  "Editorial / Lookbook",
  "Graphic Design Creative",
  "Lifestyle / Environmental",
] as const;

export type CampaignImageCategory = (typeof campaignImageCategories)[number];

export const campaignImageCategoryDescriptions: Record<CampaignImageCategory, string> = {
  "Hero Campaign Image": "The main campaign photograph. High-quality editorial image featuring the model, clothing, lighting and campaign aesthetic. No text overlay by default.",
  "Campaign Poster / Typography": "Fashion photography with designed text overlays, such as brand name, campaign title, slogan, collection name and release date.",
  "Landscape Campaign": "Wide horizontal campaign visuals for website headers, desktop banners, website landing pages and advertising.",
  "Social Media Creative": "Instagram posts, stories, reels covers and TikTok promotional visuals. Optimized for mobile viewing.",
  "Product Spotlight": "Focused product photography highlighting garment details, materials, stitching, textures, fit, logos and unique features.",
  "Editorial / Lookbook": "Professional fashion editorial photographs showcasing outfits, model poses, styling and the overall collection.",
  "Graphic Design Creative": "More design-focused assets: typography, graphic compositions, abstract backgrounds, brand colours and campaign layouts.",
  "Lifestyle / Environmental": "Models wearing the collection in real-world environments: streets, architecture, interiors, landscapes and locations.",
};

export const campaignImageFormats = [
  { label: "Portrait", value: "portrait", width: 1024, height: 1280, detail: "4:5 · Editorials" },
  { label: "Landscape", value: "landscape", width: 1536, height: 864, detail: "16:9 · Website banners" },
  { label: "Square", value: "square", width: 1024, height: 1024, detail: "1:1 · Social posts" },
  { label: "Story / Full Screen", value: "story", width: 900, height: 1600, detail: "9:16 · Stories & TikTok" },
] as const;

export type CampaignImageFormat = (typeof campaignImageFormats)[number]["value"];

export function isCampaignImageCategory(value: string): value is CampaignImageCategory {
  return campaignImageCategories.some((category) => category === value);
}

export function isCampaignImageFormat(value: string): value is CampaignImageFormat {
  return campaignImageFormats.some((format) => format.value === value);
}
