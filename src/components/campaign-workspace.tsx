"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Download,
  ImagePlus,
  Pencil,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { AssetPreview } from "@/components/asset-preview";
import { ImageModelSelector } from "@/components/image-model-selector";
import { database } from "@/lib/database";
import {
  campaignImageCategories,
  campaignImageCategoryDescriptions,
  campaignImageFormats,
  isCampaignImageCategory,
  isCampaignImageFormat,
  type CampaignImageCategory,
  type CampaignImageFormat,
} from "@/lib/image-options";
import type { BrandContext, Campaign, CampaignAsset, CampaignStrategy } from "@/lib/types";

export function CampaignWorkspace({
  campaign,
  onBack,
  onCampaignChange,
}: {
  campaign: Campaign;
  onBack: () => void;
  onCampaignChange: (campaign: Campaign) => void;
}) {
  const [brandName, setBrandName] = useState("Your brand");
  const [brandContext, setBrandContext] = useState<BrandContext | null>(null);
  const [assets, setAssets] = useState<CampaignAsset[]>([]);
  const [imageCount, setImageCount] = useState(1);
  const [imageCategory, setImageCategory] = useState<CampaignImageCategory>("Hero Campaign Image");
  const [imageFormat, setImageFormat] = useState<CampaignImageFormat>("portrait");
  const [imageModel, setImageModel] = useState("google/gemini-3-pro-image");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    void Promise.all([
      database.brands.where("workspaceId").equals(campaign.workspaceId)
        .filter((brand) => brand.id === campaign.brandId).first(),
      database.assets.where("workspaceId").equals(campaign.workspaceId)
        .filter((asset) => asset.campaignId === campaign.id).toArray(),
    ])
      .then(([brand, savedAssets]) => {
        if (brand?.workspaceId === campaign.workspaceId) {
          setBrandName(brand.name);
          setBrandContext({
            name: brand.name,
            secondaryName: brand.secondaryName,
            slogan: brand.slogan,
            description: brand.description,
            category: brand.category,
            targetAudience: brand.targetAudience,
            personality: brand.personality,
            positioning: brand.positioning,
            inspirations: brand.inspirations,
          });
        } else {
          setError("The brand linked to this campaign could not be found.");
        }
        setAssets(savedAssets.sort((a, b) => b.createdAt - a.createdAt));
      })
      .catch(() => setError("Campaign details could not be loaded."));
  }, [campaign.brandId, campaign.id, campaign.workspaceId]);

  async function generateImages() {
    if (!brandContext) {
      setError("Brand details are still loading. Please try again in a moment.");
      return;
    }

    setError("");
    setIsGenerating(true);
    let completed = 0;
    try {
      for (let index = 0; index < imageCount; index += 1) {
        setGenerationProgress(`Creating image ${index + 1} of ${imageCount}…`);
        const response = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purpose: "campaign",
            brand: brandContext,
            brief: campaign.brief,
            strategy: campaign.strategy,
            category: imageCategory,
            format: imageFormat,
            model: imageModel,
          }),
        });

        if (!response.ok) {
          let message = "An image could not be generated. Please try again.";
          try {
            const result: unknown = await response.json();
            if (typeof result === "object" && result !== null && "error" in result && typeof result.error === "string") {
              message = result.error;
            }
          } catch {
            message = "An image could not be generated. Please try again.";
          }
          throw new Error(message);
        }

        const blob = await response.blob();
        const asset: CampaignAsset = {
          id: crypto.randomUUID(),
          workspaceId: campaign.workspaceId,
          campaignId: campaign.id,
          brandId: campaign.brandId,
          blob,
          prompt: `${campaign.brief.aesthetic} fashion campaign`,
          createdAt: Date.now(),
          kind: "campaign",
          category: imageCategory,
          format: imageFormat,
        };
        await database.assets.add(asset);
        setAssets((current) => [asset, ...current]);
        completed += 1;
      }
    } catch (generationError) {
      setError(
        `${completed ? `${completed} image${completed === 1 ? "" : "s"} saved. ` : ""}${
          generationError instanceof Error
            ? generationError.message
            : "An image could not be generated. Please try again."
        }`,
      );
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
    }
  }

  async function deleteImage(asset: CampaignAsset) {
    if (!window.confirm("Delete this campaign image? This will also delete it from your asset library. This cannot be undone.")) {
      return;
    }
    try {
      await database.assets.delete(asset.id);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setError("");
    } catch {
      setError("This campaign image could not be deleted. Please try again.");
    }
  }

  function saveImage(asset: CampaignAsset, index: number) {
    const imageName = `${campaign.brief.name}-${asset.category ?? "campaign-image"}-${index}`;
    const safeName = imageName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const extension = asset.blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const url = URL.createObjectURL(asset.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}.${extension}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyCampaignCopy(copy: string) {
    try {
      await navigator.clipboard.writeText(copy);
      setCopyMessage("Copied");
      window.setTimeout(() => setCopyMessage(""), 1800);
    } catch {
      setCopyMessage("Clipboard unavailable");
    }
  }

  const sections: Array<{
    number: string;
    title: string;
    sectionKey: keyof CampaignStrategy;
    className: string;
  }> = [
    { number: "02", title: "Creative direction", sectionKey: "creativeDirection", className: "" },
    { number: "03", title: "Visual identity", sectionKey: "visualIdentity", className: "" },
    { number: "04", title: "Photography direction", sectionKey: "photographyDirection", className: "" },
    { number: "05", title: "Campaign images", sectionKey: "campaignImages", className: "" },
    { number: "06", title: "Marketing copy", sectionKey: "marketingCopy", className: "copy-card" },
    { number: "07", title: "Campaign execution", sectionKey: "campaignExecution", className: "" },
  ];

  return (
    <div className="feature-content campaign-workspace">
      <button className="back-link" onClick={onBack} type="button">
        <ArrowLeft aria-hidden="true" size={14} /> Back to your studio
      </button>
      <div className="eyebrow with-dot">YOUR CAMPAIGN HAS A DIRECTION</div>
      <div className="workspace-title-row">
        <div>
          <h1>{campaign.brief.name}</h1>
          <div className="workspace-meta">
            <span>{brandName}</span>
            <i />
            <span>{campaign.brief.type}</span>
            <i />
            <span>{new Date(campaign.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>
        <span className="strategy-status"><Sparkles aria-hidden="true" size={13} /> STRATEGY READY</span>
      </div>
      {error && <p className="form-message form-error" role="alert">{error}</p>}

      <CampaignSection
        brand={brandContext}
        campaign={campaign}
        className="strategy-overview-card"
        onCampaignChange={onCampaignChange}
        sectionKey="overview"
        title="01 — THE CAMPAIGN IDEA"
      >
        <div className="review-chips">
          {[campaign.brief.objective, campaign.brief.aesthetic, campaign.brief.season, ...campaign.brief.formats]
            .filter(Boolean)
            .map((item) => <span key={item}>{item}</span>)}
        </div>
      </CampaignSection>

      <div className="workspace-section-heading">
        <div>
          <div className="eyebrow">YOUR CREATIVE BLUEPRINT</div>
          <h2>One clear direction. Everything in sync.</h2>
        </div>
        <span className="simple-tag">MADE FOR {brandName.toUpperCase()}</span>
      </div>

      <div className="strategy-grid">
        {sections.map((section) => (
          <CampaignSection
            brand={brandContext}
            campaign={campaign}
            className={section.className}
            key={section.number}
            onCampaignChange={onCampaignChange}
            sectionKey={section.sectionKey}
            title={`${section.number} — ${section.title}`}
          >
            {section.sectionKey === "marketingCopy" && (
              <button
                className="copy-action"
                onClick={() => void copyCampaignCopy(campaign.strategy.marketingCopy)}
                type="button"
              >
                {copyMessage || "Copy campaign copy"}
                {copyMessage === "Copied" ? <Check aria-hidden="true" size={13} /> : <ArrowUpRight aria-hidden="true" size={13} />}
              </button>
            )}
          </CampaignSection>
        ))}
      </div>

      <section aria-labelledby="campaign-images-title" className="image-generation-panel">
        <div className="image-generation-copy">
          <div className="strategy-card-label"><span>08</span> OPTIONAL VISUALS</div>
          <h2 id="campaign-images-title">Bring the idea to life.</h2>
          <p>Choose an image category and a separate output format, then decide how many to generate.</p>
        </div>
        <div className="image-generation-controls">
          <ImageModelSelector
            disabled={isGenerating}
            onChange={setImageModel}
            value={imageModel}
          />
          <div className="campaign-image-options">
            <label>
              Image category
              <select
                disabled={isGenerating}
                onChange={(event) => {
                  if (isCampaignImageCategory(event.target.value)) setImageCategory(event.target.value);
                }}
                value={imageCategory}
              >
                {campaignImageCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <span className="campaign-style-description">
                {campaignImageCategoryDescriptions[imageCategory]}
              </span>
            </label>
            <label>
              Image format
              <select
                disabled={isGenerating}
                onChange={(event) => {
                  if (isCampaignImageFormat(event.target.value)) setImageFormat(event.target.value);
                }}
                value={imageFormat}
              >
                {campaignImageFormats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label} · {format.detail.split(" · ")[0]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div aria-label="Number of images to generate" className="image-count-options">
            {[1, 2, 3, 4].map((count) => (
              <button
                aria-pressed={imageCount === count}
                className={imageCount === count ? "selected" : ""}
                disabled={isGenerating}
                key={count}
                onClick={() => setImageCount(count)}
                type="button"
              >
                {count}
              </button>
            ))}
          </div>
          <button
            className="primary-button"
            disabled={isGenerating || !brandContext || !imageModel}
            onClick={() => void generateImages()}
            type="button"
          >
            <ImagePlus aria-hidden="true" size={15} />
            {isGenerating ? generationProgress : `Generate ${imageCount} ${imageCount === 1 ? "image" : "images"}`}
          </button>
        </div>
      </section>
      {assets.length > 0 && (
        <section aria-label="Generated campaign images" className="generated-assets-grid">
          {assets.map((asset, index) => (
            <article className="generated-asset" key={asset.id}>
              <AssetPreview
                asset={asset}
                className={asset.format ? `asset-preview-${asset.format}` : ""}
                label={`Generated campaign image ${assets.length - index}`}
              />
              <div className="generated-asset-caption">
                <span>
                  {asset.category ?? `CAMPAIGN IMAGE ${String(assets.length - index).padStart(2, "0")}`}
                  {asset.format && ` · ${campaignImageFormats.find((format) => format.value === asset.format)?.label ?? asset.format}`}
                </span>
                <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="generated-asset-actions">
                <button
                  aria-label={`Save campaign image ${assets.length - index} to device`}
                  className="generated-asset-action"
                  onClick={() => saveImage(asset, assets.length - index)}
                  title="Save image to device"
                  type="button"
                >
                  <Download aria-hidden="true" size={13} /> Save image
                </button>
                <button
                  aria-label={`Delete campaign image ${assets.length - index}`}
                  className="generated-asset-action delete-generated-asset"
                  onClick={() => void deleteImage(asset)}
                  title="Delete from this campaign and asset library"
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={13} /> Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {assets.length > 0 && (
        <p className="generated-asset-delete-note">
          Deleting an image here also deletes it from your asset library.
        </p>
      )}

      <div className="strategy-footer">
        <Sparkles aria-hidden="true" size={15} />
        <span>{assets.length ? `${assets.length} generated ${assets.length === 1 ? "image is" : "images are"} saved in your asset library.` : "Your written campaign is ready. Image generation is an optional next step—you stay in control."}</span>
      </div>
    </div>
  );
}

function CampaignSection({
  brand,
  campaign,
  children,
  className,
  onCampaignChange,
  sectionKey,
  title,
}: {
  brand: BrandContext | null;
  campaign: Campaign;
  children?: ReactNode;
  className: string;
  onCampaignChange: (campaign: Campaign) => void;
  sectionKey: keyof CampaignStrategy;
  title: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState("");

  async function saveSection() {
    const content = draft.trim();
    if (!content) {
      setError("A campaign section cannot be empty.");
      return;
    }
    setIsSaving(true);
    setError("");
    const updatedCampaign = {
      ...campaign,
      strategy: { ...campaign.strategy, [sectionKey]: content },
    };
    try {
      await database.campaigns.put(updatedCampaign);
      onCampaignChange(updatedCampaign);
      setIsEditing(false);
    } catch {
      setError("This section could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function regenerateSection() {
    if (!brand) {
      setError("Brand details are still loading. Please try again in a moment.");
      return;
    }
    setIsRegenerating(true);
    setError("");
    try {
      const response = await fetch("/api/campaign/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          brief: campaign.brief,
          strategy: campaign.strategy,
          section: sectionKey,
        }),
      });
      let result: unknown;
      try {
        result = await response.json();
      } catch {
        throw new Error("The campaign section could not be read. Please try again.");
      }
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "This section could not be regenerated. Please try again.";
        throw new Error(message);
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("content" in result) ||
        typeof result.content !== "string" ||
        !result.content.trim()
      ) {
        throw new Error("The new campaign section was empty. Please try again.");
      }

      const updatedCampaign = {
        ...campaign,
        strategy: { ...campaign.strategy, [sectionKey]: result.content.trim() },
      };
      await database.campaigns.put(updatedCampaign);
      onCampaignChange(updatedCampaign);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "This section could not be regenerated. Please try again.",
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  const [number, label] = title.split(" — ");

  return (
    <article className={`strategy-card ${className}`}>
      <div className="strategy-section-header">
        <div className="strategy-card-label"><span>{number}</span> {label}</div>
        <div className="strategy-section-actions">
          {isEditing ? (
            <>
              <button
                className="section-action-button"
                disabled={isSaving}
                onClick={() => { setError(""); setIsEditing(false); }}
                type="button"
              >
                <X aria-hidden="true" size={12} /> Cancel
              </button>
              <button
                className="section-action-button save"
                disabled={isSaving}
                onClick={() => void saveSection()}
                type="button"
              >
                <Save aria-hidden="true" size={12} /> {isSaving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                className="section-action-button"
                disabled={isRegenerating}
                onClick={() => { setDraft(campaign.strategy[sectionKey]); setIsEditing(true); setError(""); }}
                type="button"
              >
                <Pencil aria-hidden="true" size={12} /> Edit
              </button>
              <button
                className="section-action-button"
                disabled={isRegenerating}
                onClick={() => void regenerateSection()}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={12} /> {isRegenerating ? "Writing…" : "Try another"}
              </button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <textarea
          aria-label={`Edit ${label.toLowerCase()}`}
          className="strategy-edit-field"
          onChange={(event) => setDraft(event.target.value)}
          rows={sectionKey === "overview" ? 4 : 5}
          value={draft}
        />
      ) : (
        <p>{campaign.strategy[sectionKey]}</p>
      )}
      {error && <p className="section-error" role="alert">{error}</p>}
      {children}
    </article>
  );
}
