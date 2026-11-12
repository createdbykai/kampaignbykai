import Dexie, { type Table } from "dexie";
import type { Brand, Campaign, CampaignAsset, Workspace } from "@/lib/types";

class CampaignDatabase extends Dexie {
  workspaces!: Table<Workspace, string>;
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
    this.version(2)
      .stores({
        workspaces: "id, name, createdAt, updatedAt, isCurrent",
        brands: "id, workspaceId, name, updatedAt",
        campaigns: "id, workspaceId, brandId, createdAt, updatedAt",
        assets: "id, workspaceId, campaignId, brandId, createdAt",
      })
      .upgrade(async (transaction) => {
        const workspaceId = "default-workspace";
        const now = Date.now();
        await transaction.table("workspaces").add({
          id: workspaceId,
          name: "Kai's workspace",
          isCurrent: true,
          createdAt: now,
          updatedAt: now,
        });
        await Promise.all(
          ["brands", "campaigns", "assets"].map((tableName) =>
            transaction.table(tableName).toCollection().modify((record) => {
              record.workspaceId = workspaceId;
            }),
          ),
        );
      });
  }
}

export const database = new CampaignDatabase();
