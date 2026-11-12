"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Download,
  FolderOpen,
  Image as ImageIcon,
  Layers3,
  LockKeyhole,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AssetPreview } from "@/components/asset-preview";
import { database } from "@/lib/database";
import { campaignImageFormats } from "@/lib/image-options";
import { campaignTemplates, type CampaignTemplate } from "@/lib/templates";
import type { Brand, Campaign, CampaignAsset } from "@/lib/types";

type LibraryPage = "My Campaigns" | "Asset library" | "Campaign templates" | "Settings";
type LibraryAsset = CampaignAsset & {
  kind: "campaign" | "logo";
  campaignName?: string;
  brandName: string;
};

const templateImages = [
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=900&q=85",
];

export function StudioLibrary({
  page,
  onOpenCampaign,
  onOpenBrand,
  onUseTemplate,
}: {
  page: LibraryPage;
  onOpenCampaign: (campaign: Campaign) => void;
  onOpenBrand: () => void;
  onUseTemplate: (template: CampaignTemplate) => void;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [imageCounts, setImageCounts] = useState<Record<string, number>>({});
  const [campaignCovers, setCampaignCovers] = useState<Record<string, CampaignAsset | undefined>>({});
  const [error, setError] = useState("");
  const [loadedPage, setLoadedPage] = useState<LibraryPage | null>(null);
  const isLoading =
    (page === "My Campaigns" || page === "Asset library") && loadedPage !== page;

  async function deleteAsset(asset: LibraryAsset) {
    const label = asset.kind === "logo"
      ? `${asset.brandName} logo`
      : `${asset.campaignName ?? "Campaign"} image`;
    if (!window.confirm(`Remove ${label} from your asset library? This cannot be undone.`)) {
      return;
    }

    try {
      if (asset.kind === "logo") {
        const brand = await database.brands.get(asset.brandId);
        if (!brand) throw new Error("The brand linked to this logo could not be found.");
        await database.brands.put({ ...brand, logo: undefined, logoFormat: undefined, updatedAt: Date.now() });
        setBrands((current) => current.map((item) =>
          item.id === brand.id ? { ...item, logo: undefined, logoFormat: undefined, updatedAt: Date.now() } : item,
        ));
      } else {
        await database.assets.delete(asset.id);
      }
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setError("");
    } catch {
      setError("This image could not be removed. Please try again.");
    }
  }

  function downloadAsset(asset: LibraryAsset) {
    const imageName = asset.kind === "logo"
      ? `${asset.brandName}-logo`
      : `${asset.campaignName ?? "campaign-image"}-${asset.category ?? "image"}`;
    const safeName = imageName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const extension = asset.blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const url = URL.createObjectURL(asset.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}.${extension}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  useEffect(() => {
    let active = true;
    if (page === "Settings" || page === "Campaign templates") return;

    async function loadLibrary() {
      if (page === "My Campaigns") {
        const [savedCampaigns, savedBrands] = await Promise.all([
          database.campaigns.orderBy("createdAt").reverse().toArray(),
          database.brands.toArray(),
        ]);
        const campaignAssets = await Promise.all(
          savedCampaigns.map(async (campaign) => [
            campaign.id,
            await database.assets.where("campaignId").equals(campaign.id).toArray(),
          ] as const),
        );
        if (!active) return;
        setCampaigns(savedCampaigns);
        setBrands(savedBrands);
        setImageCounts(Object.fromEntries(campaignAssets.map(([id, items]) => [id, items.length])));
        setCampaignCovers(
          Object.fromEntries(
            campaignAssets.map(([id, items]) => [
              id,
              items.reduce<CampaignAsset | undefined>(
                (latest, asset) => (!latest || asset.createdAt > latest.createdAt ? asset : latest),
                undefined,
              ),
            ]),
          ),
        );
        setAssets([]);
        setLoadedPage(page);
        setError("");
        return;
      }

      const [savedAssets, savedCampaigns, savedBrands] = await Promise.all([
        database.assets.orderBy("createdAt").reverse().toArray(),
        database.campaigns.toArray(),
        database.brands.toArray(),
      ]);
      const campaignNames = new Map(savedCampaigns.map((campaign) => [campaign.id, campaign.brief.name]));
      const brandNames = new Map(savedBrands.map((brand) => [brand.id, brand.name]));
      if (!active) return;
      setCampaigns(savedCampaigns);
      setBrands(savedBrands);
      const campaignAssetsForLibrary: LibraryAsset[] = savedAssets
        .filter((asset) => asset.kind !== "logo")
        .map((asset) => ({
          ...asset,
          kind: "campaign",
          campaignName: asset.campaignId
            ? campaignNames.get(asset.campaignId) ?? "Campaign image"
            : "Image generation",
          brandName: brandNames.get(asset.brandId) ?? "Your brand",
        }));
      const logoAssets: LibraryAsset[] = savedBrands
        .filter((brand): brand is Brand & { logo: Blob } => Boolean(brand.logo))
        .map((brand) => ({
          id: `logo-${brand.id}`,
          brandId: brand.id,
          blob: brand.logo,
          prompt: brand.logoPrompt,
          createdAt: brand.updatedAt,
          kind: "logo",
          format: brand.logoFormat,
          campaignName: "Brand logo",
          brandName: brand.name,
        }));
      setAssets([...campaignAssetsForLibrary, ...logoAssets].sort((a, b) => b.createdAt - a.createdAt));
      setLoadedPage(page);
      setError("");
    }

    void loadLibrary().catch(() => {
      if (active) {
        setError("Your saved studio data could not be loaded. Please try again.");
        setLoadedPage(page);
      }
    });
    return () => {
      active = false;
    };
  }, [page]);

  async function deleteCampaign(campaign: Campaign) {
    if (!window.confirm(`Delete “${campaign.brief.name}” and its saved images? This cannot be undone.`)) {
      return;
    }
    try {
      await database.transaction("rw", database.campaigns, database.assets, async () => {
        await database.assets.where("campaignId").equals(campaign.id).delete();
        await database.campaigns.delete(campaign.id);
      });
      setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
      setAssets((current) => current.filter((asset) => asset.campaignId !== campaign.id));
      setImageCounts((current) => {
        const updated = { ...current };
        delete updated[campaign.id];
        return updated;
      });
    } catch {
      setError("The campaign could not be deleted. Please try again.");
    }
  }

  return (
    <div className="feature-content library-content">
      {page === "My Campaigns" && (
        <>
          <div className="eyebrow with-dot">YOUR WORK, ALL IN ONE PLACE</div>
          <div className="library-heading">
            <div>
              <h1>My <span>campaigns.</span></h1>
              <p>Every campaign strategy and its images, ready when you are.</p>
            </div>
            <span className="local-note">Saved on this device</span>
          </div>
          {error && <p className="form-message form-error" role="alert">{error}</p>}
          {isLoading ? <div className="empty-panel">Loading your projects…</div> : campaigns.length ? (
            <div className="saved-project-list">
              {campaigns.map((campaign) => {
                const brand = brands.find((item) => item.id === campaign.brandId);
                const imageCount = imageCounts[campaign.id] ?? 0;
                return (
                  <article className="saved-project-row" key={campaign.id}>
                      <div className="saved-project-mark">
                        {campaignCovers[campaign.id] ? (
                          <AssetPreview
                            asset={campaignCovers[campaign.id]!}
                            className="saved-project-cover"
                            label={`${campaign.brief.name} campaign image`}
                          />
                        ) : (
                          <FolderOpen aria-hidden="true" size={20} />
                        )}
                      </div>
                    <div className="saved-project-details">
                      <strong>{campaign.brief.name}</strong>
                      <span>{brand?.name ?? "Brand"} · {campaign.brief.type} · {new Date(campaign.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <span className="saved-project-assets">{imageCount} {imageCount === 1 ? "image" : "images"}</span>
                    <button className="subtle-button" onClick={() => onOpenCampaign(campaign)} type="button">
                      Open <ArrowRight aria-hidden="true" size={14} />
                    </button>
                    <button
                      aria-label={`Delete ${campaign.brief.name}`}
                      className="subtle-icon-button"
                      onClick={() => void deleteCampaign(campaign)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={14} />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyLibrary
              icon={<FolderOpen aria-hidden="true" size={22} />}
              title="Your next idea goes here."
              description="Create a campaign strategy and it will be saved here automatically."
            />
          )}
        </>
      )}

      {page === "Asset library" && (
        <>
          <div className="eyebrow with-dot">YOUR VISUALS, CLOSE AT HAND</div>
          <div className="library-heading">
            <div>
              <h1>Your asset <span>library.</span></h1>
              <p>Campaign images and saved brand logos are kept in this browser. Download or remove any asset.</p>
            </div>
            <span className="local-note">{assets.length} saved {assets.length === 1 ? "asset" : "assets"}</span>
          </div>
          {error && <p className="form-message form-error" role="alert">{error}</p>}
          {isLoading ? <div className="empty-panel">Loading your assets…</div> : assets.length ? (
            <div className="library-assets-grid">
              {assets.map((asset) => (
                <article className="library-asset-card" key={asset.id}>
                  <AssetPreview
                    asset={asset}
                    className={asset.format ? `asset-preview-${asset.format}` : ""}
                    label={asset.kind === "logo" ? `${asset.brandName} logo` : `${asset.campaignName ?? "Campaign"} image`}
                  />
                  <div className="library-asset-info">
                    <span className={`asset-kind-badge ${asset.kind === "logo" ? "brand-logo-badge" : ""}`}>
                      {asset.kind === "logo" ? "BRAND LOGO" : "CAMPAIGN IMAGE"}
                    </span>
                    <strong>{asset.kind === "logo" ? asset.brandName : asset.campaignName}</strong>
                    <span>{asset.brandName}</span>
                    {asset.category && (
                      <span className="library-image-category">
                        {asset.category}
                        {asset.format && ` · ${campaignImageFormats.find((format) => format.value === asset.format)?.label ?? asset.format}`}
                      </span>
                    )}
                    <div className="library-asset-actions">
                      {asset.kind === "logo" ? (
                        <button className="copy-action" onClick={onOpenBrand} type="button">
                          View brand <ArrowRight aria-hidden="true" size={13} />
                        </button>
                      ) : (
                        <button
                          className="copy-action"
                          onClick={() => {
                            const campaign = campaigns.find((item) => item.id === asset.campaignId);
                            if (campaign) onOpenCampaign(campaign);
                            else onOpenBrand();
                          }}
                          type="button"
                        >
                          {asset.campaignId ? "View campaign" : "View brand"} <ArrowRight aria-hidden="true" size={13} />
                        </button>
                      )}
                      <button
                        aria-label={`Save ${asset.kind === "logo" ? `${asset.brandName} logo` : `${asset.campaignName ?? "campaign"} image`} to device`}
                        className="subtle-icon-button"
                        onClick={() => downloadAsset(asset)}
                        title="Save image"
                        type="button"
                      >
                        <Download aria-hidden="true" size={14} />
                      </button>
                      <button
                        aria-label={`Remove ${asset.kind === "logo" ? `${asset.brandName} logo` : `${asset.campaignName ?? "campaign"} image`}`}
                        className="subtle-icon-button remove-asset-button"
                        onClick={() => void deleteAsset(asset)}
                        title="Remove image"
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyLibrary
              icon={<ImageIcon aria-hidden="true" size={22} />}
              title="Your visual library is waiting."
              description="Generate a campaign image or save a logo to a brand profile and it will show up here."
            />
          )}
        </>
      )}

      {page === "Campaign templates" && (
        <>
          <div className="eyebrow with-dot">A LITTLE HEAD START</div>
          <div className="library-heading">
            <div>
              <h1>Start with a <span>template.</span></h1>
              <p>Simple creative starting points. Make them yours as you go.</p>
            </div>
          </div>
          <div className="template-grid">
            {campaignTemplates.map((template, index) => (
              <TemplateCard index={index} key={template.title} onUse={onUseTemplate} template={template} />
            ))}
          </div>
        </>
      )}

      {page === "Settings" && (
        <>
          <div className="eyebrow with-dot">A FEW STUDIO DETAILS</div>
          <div className="library-heading">
            <div>
              <h1>Simple things, <span>sorted.</span></h1>
              <p>Your studio is private to this browser and easy to set up.</p>
            </div>
          </div>
          <div className="settings-card">
            <div className="settings-icon"><LockKeyhole aria-hidden="true" size={18} /></div>
            <div>
              <span className="eyebrow">AI CONNECTION</span>
              <h2>Pollinations API key</h2>
              <p>To use AI, add your key to a <code>.env.local</code> file in the project folder. It stays on the server and is never sent to your browser.</p>
              <pre><code>POLLINATIONS_API_KEY=your_key_here</code></pre>
              <span className="settings-footnote">Restart the development server after adding your key.</span>
              <a
                className="settings-key-link"
                href="https://enter.pollinations.ai/keys"
                rel="noreferrer"
                target="_blank"
              >
                Get or manage a Pollinations key <ArrowRight aria-hidden="true" size={13} />
              </a>
            </div>
          </div>
          <div className="settings-card">
            <div className="settings-icon mint"><Layers3 aria-hidden="true" size={18} /></div>
            <div>
              <span className="eyebrow">YOUR PROJECTS</span>
              <h2>Saved on this device</h2>
              <p>Brand profiles, campaign strategies, and generated images stay in this browser using IndexedDB. They aren&apos;t synced to an account or another device.</p>
              <span className="settings-footnote">Use the same browser and device to return to your studio.</span>
            </div>
          </div>
          <div className="settings-card">
            <div className="settings-icon lavender"><Sparkles aria-hidden="true" size={18} /></div>
            <div>
              <span className="eyebrow">IMAGE GENERATION</span>
              <h2>You&apos;re in control</h2>
              <p>Images are never generated automatically. Choose from eight image categories and four separate output formats, then select up to four images to generate.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyLibrary({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="empty-panel library-empty">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function TemplateCard({
  template,
  index,
  onUse,
}: {
  template: CampaignTemplate;
  index: number;
  onUse: (template: CampaignTemplate) => void;
}) {
  return (
    <article className={`template-card template-${index % templateImages.length}`}>
      <div
        className="template-art"
        style={{
          backgroundImage: `linear-gradient(180deg, rgb(36 28 20 / 4%), rgb(36 28 20 / 58%)), url("${templateImages[index % templateImages.length]}")`,
        }}
      >
        <span>0{index + 1} / STARTING POINT</span>
        <div>{template.brief.name ?? template.title}</div>
      </div>
      <div className="template-details">
        <h2>{template.title}</h2>
        <p>{template.description}</p>
        <button className="subtle-button" onClick={() => onUse(template)} type="button">
          Use this template <ArrowRight aria-hidden="true" size={14} />
        </button>
      </div>
    </article>
  );
}
