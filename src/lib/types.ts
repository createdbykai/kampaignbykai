import type { CampaignImageCategory, CampaignImageFormat } from "@/lib/image-options";

export type Workspace = {
  id: string;
  name: string;
  isCurrent: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Brand = {
  id: string;
  workspaceId: string;
  name: string;
  secondaryName: string;
  slogan: string;
  description: string;
  logo?: Blob;
  logoFormat?: CampaignImageFormat;
  website: string;
  socialMedia: string;
  category: string;
  targetAudience: string;
  personality: string;
  positioning: string;
  inspirations: string;
  createLogo: boolean;
  logoPrompt: string;
  logoStyle: string;
  updatedAt: number;
};

export type BrandContext = Pick<
  Brand,
  | "name"
  | "secondaryName"
  | "slogan"
  | "description"
  | "category"
  | "targetAudience"
  | "personality"
  | "positioning"
  | "inspirations"
>;

export type CampaignBrief = {
  name: string;
  type: string;
  objective: string;
  targetAudience: string;
  aesthetic: string;
  photographyStyle: string;
  modelCasting: string;
  location: string;
  lighting: string;
  season: string;
  mood: string;
  colourPalette: string;
  formats: string[];
  creativeInstructions: string;
};

export type CampaignStrategy = {
  overview: string;
  creativeDirection: string;
  visualIdentity: string;
  photographyDirection: string;
  campaignImages: string;
  marketingCopy: string;
  campaignExecution: string;
};

export type CampaignAsset = {
  id: string;
  workspaceId: string;
  campaignId?: string;
  brandId: string;
  blob: Blob;
  prompt: string;
  createdAt: number;
  kind?: "campaign" | "logo";
  category?: CampaignImageCategory;
  format?: CampaignImageFormat;
};

export type Campaign = {
  id: string;
  workspaceId: string;
  brandId: string;
  brief: CampaignBrief;
  strategy: CampaignStrategy;
  imageCount: number;
  createdAt: number;
  updatedAt: number;
};
