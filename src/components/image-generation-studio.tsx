"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Plus, Sparkles } from "lucide-react";
import { AssetPreview, BlobPreview } from "@/components/asset-preview";
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
import { pollinationsImageModels } from "@/lib/pollinations-image-models";
import type { Brand, BrandContext, CampaignAsset } from "@/lib/types";

type GenerationMode = "logo" | "image" | null;

async function imageError(response: Response, fallback: string) {
  try {
    const result: unknown = await response.json();
    if (
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
    ) {
      return result.error;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export function ImageGenerationStudio({
  onCreateBrand,
}: {
  onCreateBrand: () => void;
}) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [standaloneAssets, setStandaloneAssets] = useState<CampaignAsset[]>([]);
  const [mode, setMode] = useState<GenerationMode>(null);
  const [category, setCategory] = useState<CampaignImageCategory>("Hero Campaign Image");
  const [format, setFormat] = useState<CampaignImageFormat>("portrait");
  const [logoFormat, setLogoFormat] = useState<CampaignImageFormat>("square");
  const [model, setModel] = useState(pollinationsImageModels[0].name);
  const [imagePrompt, setImagePrompt] = useState("");
  const [logoPrompt, setLogoPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    void database.brands
      .orderBy("updatedAt")
      .reverse()
      .toArray()
      .then((savedBrands) => {
        if (!active) return;
        setBrands(savedBrands);
        setSelectedBrandId((current) => current || savedBrands[0]?.id || "");
      })
      .catch(() => {
        if (active) setError("Your brands could not be loaded. Please try again.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedBrandId) return;
    let active = true;
    void database.assets
      .where("brandId")
      .equals(selectedBrandId)
      .reverse()
      .toArray()
      .then((savedAssets) => {
        if (active) {
          setStandaloneAssets(savedAssets.filter(
            (asset) => !asset.campaignId && asset.kind !== "logo",
          ));
        }
      })
      .catch(() => {
        if (active) setError("Saved images could not be loaded. Please try again.");
      });
    return () => {
      active = false;
    };
  }, [selectedBrandId]);

  const selectedBrand = brands.find((brand) => brand.id === selectedBrandId);
  const visibleStandaloneAssets = standaloneAssets.filter(
    (asset) => asset.brandId === selectedBrandId,
  );
  const brandContext: BrandContext | null = selectedBrand
    ? {
        name: selectedBrand.name,
        secondaryName: selectedBrand.secondaryName,
        slogan: selectedBrand.slogan,
        description: selectedBrand.description,
        category: selectedBrand.category,
        targetAudience: selectedBrand.targetAudience,
        personality: selectedBrand.personality,
        positioning: selectedBrand.positioning,
        inspirations: selectedBrand.inspirations,
      }
    : null;

  async function generate() {
    if (!selectedBrand || !brandContext || !mode) {
      setError("Choose a saved brand and generation type first.");
      return;
    }
    const prompt = mode === "logo" ? logoPrompt.trim() : imagePrompt.trim();
    if (!prompt) {
      setError(mode === "logo" ? "Describe the logo you want to create." : "Describe the image you want to create.");
      return;
    }

    setError("");
    setSuccess("");
    setIsGenerating(true);
    try {
      const isLogo = mode === "logo";
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLogo
          ? {
              purpose: "logo",
              brand: brandContext,
              logoPrompt: prompt,
              format: logoFormat,
              model,
            }
          : {
              purpose: "standalone",
              brand: brandContext,
              prompt,
              category,
              format,
              model,
            }),
      });
      if (!response.ok) {
        throw new Error(await imageError(
          response,
          isLogo ? "The logo could not be generated. Please try again." : "The image could not be generated. Please try again.",
        ));
      }
      const blob = await response.blob();
      if (isLogo) {
        const updatedBrand = {
          ...selectedBrand,
          logo: blob,
          logoFormat,
          logoPrompt: prompt,
          updatedAt: Date.now(),
        };
        try {
          await database.brands.put(updatedBrand);
        } catch {
          throw new Error("The logo was generated but could not be saved to this brand.");
        }
        setBrands((current) => current.map((brand) =>
          brand.id === updatedBrand.id ? updatedBrand : brand,
        ));
        const selectedModelTitle = pollinationsImageModels.find((item) => item.name === model)?.title ?? "selected model";
        setSuccess(`${selectedBrand.name}'s logo was generated with ${selectedModelTitle} and saved to the brand.`);
      } else {
        const asset: CampaignAsset = {
          id: crypto.randomUUID(),
          brandId: selectedBrand.id,
          blob,
          prompt,
          createdAt: Date.now(),
          kind: "campaign",
          category,
          format,
        };
        try {
          await database.assets.add(asset);
        } catch {
          throw new Error("The image was generated but could not be saved to your asset library.");
        }
        setStandaloneAssets((current) => [asset, ...current]);
        setSuccess("Image generated and saved to your asset library.");
      }
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "The image could not be generated. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="feature-content image-generation-studio">
      <div className="feature-heading">
        <div>
          <div className="eyebrow with-dot">MAKE SOMETHING VISUAL</div>
          <h1>Image <span>generation.</span></h1>
          <p>Choose a brand, then create a logo or a campaign image.</p>
        </div>
        <span className="local-note">Saved on this device</span>
      </div>

      <section aria-labelledby="generation-type-title" className="image-generation-page-card">
        <div className="image-generation-page-intro">
          <div className="strategy-card-label"><span>01</span> CHOOSE WHAT TO CREATE</div>
          <h2 id="generation-type-title">What are we making?</h2>
          <p>Choose any listed model for logos or campaign images. Nano Banana 2.0, 2.1, Pro, and GPT Image models are recommended for logo generation.</p>
        </div>

        <div aria-label="Generation type" className="generation-mode-options" role="group">
          <button
            aria-pressed={mode === "logo"}
            className={mode === "logo" ? "selected" : ""}
            onClick={() => {
              setMode("logo");
              setError("");
              setSuccess("");
            }}
            type="button"
          >
            Logo
          </button>
          <button
            aria-pressed={mode === "image"}
            className={mode === "image" ? "selected" : ""}
            onClick={() => {
              setMode("image");
              setError("");
              setSuccess("");
            }}
            type="button"
          >
            Image Generation
          </button>
        </div>

        {error && <p className="form-message form-error" role="alert">{error}</p>}
        {success && <p className="form-message form-success" role="status">{success}</p>}

        {isLoading ? (
          <div className="empty-panel">Loading your brands…</div>
        ) : brands.length === 0 ? (
          <div className="image-generation-no-brand">
            <p>Add a brand profile before generating a logo or campaign image.</p>
            <button className="primary-button" onClick={onCreateBrand} type="button">
              <Plus aria-hidden="true" size={15} /> Add a brand
            </button>
          </div>
        ) : mode ? (
          <>
            <div className="standalone-generation-fields">
              <label>
                Brand
                <select
                  disabled={isGenerating}
                  onChange={(event) => {
                    setSelectedBrandId(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  value={selectedBrandId}
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </label>

              <ImageModelSelector
                disabled={isGenerating}
                onChange={setModel}
                value={model}
              />

              <div className="campaign-image-options">
                {mode === "image" && (
                  <label>
                    Campaign style
                    <select
                      disabled={isGenerating}
                      onChange={(event) => {
                        if (isCampaignImageCategory(event.target.value)) setCategory(event.target.value);
                      }}
                      value={category}
                    >
                      {campaignImageCategories.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <span className="campaign-style-description">
                      {campaignImageCategoryDescriptions[category]}
                    </span>
                  </label>
                )}
                <label>
                  Image format
                  <select
                    disabled={isGenerating}
                    onChange={(event) => {
                      if (isCampaignImageFormat(event.target.value)) {
                        if (mode === "logo") setLogoFormat(event.target.value);
                        else setFormat(event.target.value);
                      }
                    }}
                    value={mode === "logo" ? logoFormat : format}
                  >
                    {campaignImageFormats.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label} · {item.detail.split(" · ")[0]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="standalone-prompt-field">
                {mode === "logo" ? "Logo prompt" : "Image prompt"}
                <textarea
                  disabled={isGenerating}
                  maxLength={1200}
                  onChange={(event) => mode === "logo"
                    ? setLogoPrompt(event.target.value)
                    : setImagePrompt(event.target.value)}
                  placeholder={mode === "logo"
                    ? "Describe the logo, lettering, colors, and visual details you want."
                    : "Describe the clothing, scene, mood, palette, and other visual details you want."}
                  required
                  rows={5}
                  value={mode === "logo" ? logoPrompt : imagePrompt}
                />
              </label>
              {mode === "image" && (
                <span className="standalone-category-note">
                  The selected category and its description are included in the image prompt.
                </span>
              )}
              <button
                className="primary-button"
                disabled={isGenerating || !selectedBrand || !model}
                onClick={() => void generate()}
                type="button"
              >
                {mode === "logo" ? <Sparkles aria-hidden="true" size={15} /> : <ImagePlus aria-hidden="true" size={15} />}
                {isGenerating ? "Generating…" : mode === "logo" ? "Generate logo" : "Generate image"}
              </button>
            </div>
          </>
        ) : (
          <p className="generation-mode-hint">Select Logo or Image Generation to choose your settings.</p>
        )}
      </section>

      {mode === "logo" && selectedBrand?.logo && (
        <section aria-label={`${selectedBrand.name} saved logo`} className="standalone-logo-result">
          <h2>{selectedBrand.name} logo</h2>
          <BlobPreview
            blob={selectedBrand.logo}
            className={selectedBrand.logoFormat ? `asset-preview-${selectedBrand.logoFormat}` : ""}
            label={`${selectedBrand.name} logo`}
          />
        </section>
      )}

      {mode === "image" && visibleStandaloneAssets.length > 0 && (
        <section aria-label="Standalone generated images" className="generated-assets-grid">
          {visibleStandaloneAssets.map((asset, index) => (
            <article className="generated-asset" key={asset.id}>
              <AssetPreview
                asset={asset}
                className={asset.format ? `asset-preview-${asset.format}` : ""}
                label={`Generated image ${visibleStandaloneAssets.length - index}`}
              />
              <div className="generated-asset-caption">
                <span>{asset.category}</span>
                <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
