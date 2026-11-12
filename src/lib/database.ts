import Dexie, { type Table } from "dexie";
import type { Brand, Campaign, CampaignAsset } from "@/lib/types";

class CampaignDatabase extends Dexie {
  brands!: Table<Brand, string>;
  campaigns!: Table<Campaign, string>;
  assets!: Table<CampaignAsset, string>;

  constructor() {
    super("kampaign-by-kai");
    this.version(1).stores({
      brands: "id, name, updatedAt",
      campaigns: "id, brandId, createdAt, updatedAt",
      assets: "id, campaignId, brandId, createdAt",
    });
  }
}

export const database = new CampaignDatabase();
