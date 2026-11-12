"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus, Pencil, Plus, Sparkles, Trash2, WandSparkles, X } from "lucide-react";
import { BlobPreview } from "@/components/asset-preview";
import { ImageModelSelector } from "@/components/image-model-selector";
import { database } from "@/lib/database";
import type { Brand, BrandContext } from "@/lib/types";

const logoStyles = ["Graffiti", "Vintage", "Minimal", "Hand-drawn"];

export function BrandManager() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editing, setEditing] = useState<Brand | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [generatingLogoId, setGeneratingLogoId] = useState("");
  const [logoModel, setLogoModel] = useState("google/gemini-nano-banana-2.1");

  useEffect(() => {
    void database.brands
      .orderBy("updatedAt")
      .reverse()
      .toArray()
      .then(setBrands)
      .catch(() => setError("Your brands could not be loaded. Please try again."))
      .finally(() => setIsLoading(false));
  }, []);

  async function saveBrand(brand: Brand): Promise<boolean> {
    try {
      await database.brands.put(brand);
      setBrands(await database.brands.orderBy("updatedAt").reverse().toArray());
      setEditing(undefined);
      setError("");
      return true;
    } catch {
      setError("Your brand could not be saved. Please try again.");
      return false;
    }
  }

  async function deleteBrand(brand: Brand) {
    if (!window.confirm(`Delete ${brand.name} and its local campaigns and images? This cannot be undone.`)) {
      return;
    }
    try {
      await database.transaction("rw", database.brands, database.campaigns, database.assets, async () => {
        await database.assets.where("brandId").equals(brand.id).delete();
        await database.campaigns.where("brandId").equals(brand.id).delete();
        await database.brands.delete(brand.id);
      });
      setBrands(await database.brands.orderBy("updatedAt").reverse().toArray());
      setError("");
    } catch {
      setError("The brand could not be deleted. Please try again.");
    }
  }

  async function generateLogo(brand: Brand) {
    setGeneratingLogoId(brand.id);
    setError("");
    const brandContext: BrandContext = {
      name: brand.name,
      secondaryName: brand.secondaryName,
      slogan: brand.slogan,
      description: brand.description,
      category: brand.category,
      targetAudience: brand.targetAudience,
      personality: brand.personality,
      positioning: brand.positioning,
      inspirations: brand.inspirations,
    };
    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "logo",
          brand: brandContext,
          logoPrompt: brand.logoPrompt,
          logoStyle: brand.logoStyle,
          model: logoModel,
        }),
      });
      if (!response.ok) {
        let message = "Your logo could not be generated. Please try again.";
        try {
          const result: unknown = await response.json();
          if (typeof result === "object" && result !== null && "error" in result && typeof result.error === "string") {
            message = result.error;
          }
        } catch {
          message = "Your logo could not be generated. Please try again.";
        }
        throw new Error(message);
      }
      const logo = await response.blob();
      const updatedBrand = { ...brand, logo };
      await database.brands.put(updatedBrand);
      setBrands(await database.brands.orderBy("updatedAt").reverse().toArray());
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Your logo could not be generated. Please try again.",
      );
    } finally {
      setGeneratingLogoId("");
    }
  }

  return (
    <div className="feature-content">
      <div className="feature-heading">
        <div>
          <div className="eyebrow with-dot">YOUR BRAND ROSTER</div>
          <h1>
            Every brand has
            <br />
            a <span>point of view.</span>
          </h1>
          <p>Keep your brand details together, ready for your next campaign.</p>
        </div>
        <button className="primary-button" onClick={() => setEditing(null)} type="button">
          <Plus aria-hidden="true" size={17} /> Add a brand
        </button>
      </div>

      <div className="feature-section-title">
        <div>
          <div className="eyebrow">YOUR BRANDS</div>
          <h2>{brands.length} {brands.length === 1 ? "brand" : "brands"} in your studio</h2>
        </div>
        <div className="brand-logo-model">
          <ImageModelSelector
            disabled={Boolean(generatingLogoId)}
            onChange={setLogoModel}
            value={logoModel}
          />
          <span>Recommended for logos: Nano Banana 2.0, 2.1, Pro, and GPT Image models.</span>
        </div>
      </div>

      {error && <p className="form-message form-error" role="alert">{error}</p>}

      {isLoading ? (
        <div className="empty-panel">Loading your brands…</div>
      ) : brands.length ? (
        <div className="brand-grid">
          {brands.map((brand, index) => (
            <article className="brand-card" key={brand.id}>
              <div className={`brand-card-art art-${index % 4}`}>
                <span className="brand-card-category">{brand.category || "CLOTHING BRAND"}</span>
                {brand.logo ? (
                  <BlobPreview
                    blob={brand.logo}
                    className={`brand-card-logo${brand.logoFormat ? ` asset-preview-${brand.logoFormat}` : ""}`}
                    label={`${brand.name} logo`}
                  />
                ) : (
                  <div className="brand-monogram" aria-hidden="true">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="brand-card-name">
                  <strong>{brand.name}</strong>
                  {brand.secondaryName && <span>{brand.secondaryName}</span>}
                </div>
              </div>
              <div className="brand-card-content">
                {brand.slogan && <p className="brand-slogan">“{brand.slogan}”</p>}
                <p className="brand-description">{brand.description}</p>
                <div className="brand-meta">
                  {brand.targetAudience && <span>{brand.targetAudience}</span>}
                  {brand.positioning && <span>{brand.positioning}</span>}
                </div>
                <div className="brand-card-actions">
                  <button className="subtle-button" onClick={() => setEditing(brand)} type="button">
                    <Pencil aria-hidden="true" size={14} /> Edit brand
                  </button>
                  {brand.createLogo && !brand.logo && (
                    <button
                      className="subtle-button"
                      disabled={generatingLogoId === brand.id}
                      onClick={() => void generateLogo(brand)}
                      type="button"
                    >
                      <Sparkles aria-hidden="true" size={13} />
                      {generatingLogoId === brand.id ? "Creating…" : "Create logo"}
                    </button>
                  )}
                  <button
                    aria-label={`Delete ${brand.name}`}
                    className="subtle-icon-button"
                    onClick={() => void deleteBrand(brand)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-panel brand-empty">
          <div className="empty-icon"><ImagePlus aria-hidden="true" size={22} /></div>
          <h2>Your brand story starts here.</h2>
          <p>Add the details that make your clothing brand yours. We&apos;ll use them to shape every campaign.</p>
          <button className="primary-button" onClick={() => setEditing(null)} type="button">
            <Plus aria-hidden="true" size={16} /> Create your first brand
          </button>
        </div>
      )}

      {editing !== undefined && (
        <BrandForm
          brand={editing}
          onClose={() => setEditing(undefined)}
          onSave={saveBrand}
        />
      )}
    </div>
  );
}

function BrandForm({
  brand,
  onClose,
  onSave,
}: {
  brand: Brand | null;
  onClose: () => void;
  onSave: (brand: Brand) => Promise<boolean>;
}) {
  const [createLogo, setCreateLogo] = useState(brand?.createLogo ?? false);
  const [logoPreview, setLogoPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [brandName, setBrandName] = useState(brand?.name ?? "");
  const [description, setDescription] = useState(brand?.description ?? "");
  const [slogan, setSlogan] = useState(brand?.slogan ?? "");
  const [isGeneratingSlogan, setIsGeneratingSlogan] = useState(false);
  const [sloganError, setSloganError] = useState("");

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const uploadedLogo = values.get("logo");
    const file = uploadedLogo instanceof File && uploadedLogo.size > 0 ? uploadedLogo : undefined;
    setIsSaving(true);
    const saved = await onSave({
      id: brand?.id ?? crypto.randomUUID(),
      name: String(values.get("name") ?? "").trim(),
      secondaryName: String(values.get("secondaryName") ?? "").trim(),
      slogan: String(values.get("slogan") ?? "").trim(),
      description: String(values.get("description") ?? "").trim(),
      logo: file ?? brand?.logo,
      logoFormat: file ? undefined : brand?.logoFormat,
      website: String(values.get("website") ?? "").trim(),
      socialMedia: String(values.get("socialMedia") ?? "").trim(),
      category: String(values.get("category") ?? ""),
      targetAudience: String(values.get("targetAudience") ?? "").trim(),
      personality: String(values.get("personality") ?? "").trim(),
      positioning: String(values.get("positioning") ?? "").trim(),
      inspirations: String(values.get("inspirations") ?? "").trim(),
      createLogo,
      logoPrompt: String(values.get("logoPrompt") ?? "").trim(),
      logoStyle: String(values.get("logoStyle") ?? ""),
      updatedAt: Date.now(),
    });
    if (!saved) {
      setFormError("Your brand could not be saved. Please check the form and try again.");
      setIsSaving(false);
    }
  }

  async function generateSlogan() {
    if (!brandName.trim() || !description.trim()) {
      setSloganError("Enter a brand name and description to generate a slogan.");
      return;
    }

    setIsGeneratingSlogan(true);
    setSloganError("");
    try {
      const response = await fetch("/api/brand/slogan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: brandName, description }),
      });
      let result: unknown;
      try {
        result = await response.json();
      } catch {
        throw new Error("The generated slogan could not be read. Please try again.");
      }
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "A slogan could not be generated. Please try again.";
        throw new Error(message);
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("slogan" in result) ||
        typeof result.slogan !== "string" ||
        !result.slogan.trim()
      ) {
        throw new Error("Pollinations returned an empty slogan. Please try again.");
      }
      setSlogan(result.slogan.trim());
    } catch (generationError) {
      setSloganError(
        generationError instanceof Error
          ? generationError.message
          : "A slogan could not be generated. Please try again.",
      );
    } finally {
      setIsGeneratingSlogan(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section aria-labelledby="brand-form-title" aria-modal="true" className="brand-modal" role="dialog">
        <div className="modal-header">
          <div>
            <div className="eyebrow">{brand ? "BRAND DETAILS" : "NEW BRAND PROFILE"}</div>
            <h2 id="brand-form-title">{brand ? "Shape your brand." : "Tell us about your brand."}</h2>
          </div>
          <button aria-label="Close brand form" className="subtle-icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <form className="brand-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="form-grid">
            <label>
              Brand name <span className="required-mark">*</span>
              <input onChange={(event) => setBrandName(event.target.value)} name="name" placeholder="e.g. North Studio" required value={brandName} />
            </label>
            <label>
              Secondary name <span className="optional-label">OPTIONAL</span>
              <input defaultValue={brand?.secondaryName} name="secondaryName" placeholder="Line, studio or sub-brand" />
            </label>
            <div className="form-wide slogan-field">
              <label htmlFor="brand-slogan">
                Slogan <span className="optional-label">OPTIONAL</span>
              </label>
              <div className="slogan-input-row">
                <input id="brand-slogan" name="slogan" onChange={(event) => setSlogan(event.target.value)} placeholder="A few words that say it all" value={slogan} />
                <button
                  className="subtle-button slogan-generate-button"
                  disabled={isGeneratingSlogan || !brandName.trim() || !description.trim()}
                  onClick={() => void generateSlogan()}
                  type="button"
                >
                  <WandSparkles aria-hidden="true" size={14} />
                  {isGeneratingSlogan ? "Writing…" : "Generate slogan"}
                </button>
              </div>
              {sloganError ? (
                <p className="form-message form-error slogan-error" role="alert">{sloganError}</p>
              ) : (
                <span className="field-hint">
                  {!brandName.trim()
                    ? "Add a brand name before generating a slogan."
                    : description.trim()
                      ? "Uses your brand name and description."
                      : "Add a brand description before generating a slogan."}
                </span>
              )}
            </div>
            <label className="form-wide">
              Brand description <span className="required-mark">*</span>
              <textarea onChange={(event) => setDescription(event.target.value)} name="description" placeholder="What do you make, and what makes it different?" required rows={3} value={description} />
            </label>
            <label>
              Clothing category
              <select defaultValue={brand?.category ?? ""} name="category">
                <option value="">Choose a category</option>
                <option>Streetwear</option>
                <option>Ready-to-wear</option>
                <option>Activewear</option>
                <option>Denim</option>
                <option>Accessories</option>
                <option>Luxury</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Target audience
              <input defaultValue={brand?.targetAudience} name="targetAudience" placeholder="Who is it made for?" />
            </label>
            <label>
              Brand personality
              <input defaultValue={brand?.personality} name="personality" placeholder="e.g. Bold, thoughtful, playful" />
            </label>
            <label>
              Brand positioning
              <input defaultValue={brand?.positioning} name="positioning" placeholder="e.g. Independent premium" />
            </label>
            <label className="form-wide">
              Brand inspirations
              <textarea defaultValue={brand?.inspirations} name="inspirations" placeholder="People, places, eras, or ideas you love" rows={2} />
            </label>
            <label>
              Website <span className="optional-label">OPTIONAL</span>
              <input defaultValue={brand?.website} name="website" placeholder="yourbrand.com" type="url" />
            </label>
            <label>
              Social media <span className="optional-label">OPTIONAL</span>
              <input defaultValue={brand?.socialMedia} name="socialMedia" placeholder="@yourbrand" />
            </label>
          </div>

          <div className="logo-upload-row">
            {brand?.logo && !logoPreview ? (
              <BlobPreview blob={brand.logo} className="brand-form-logo" label="Brand logo preview" />
            ) : (
              <div className="logo-preview" role="img" aria-label="Brand logo preview" style={logoPreview ? { backgroundImage: `url("${logoPreview}")` } : undefined}>
                {!logoPreview && <ImagePlus aria-hidden="true" size={21} />}
              </div>
            )}
            <div className="logo-upload-copy">
              <strong>Brand logo</strong>
              <span>Upload a logo image. It stays in this browser.</span>
              <label className="subtle-button file-button">
                Choose file
                <input
                  accept="image/*"
                  name="logo"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) setLogoPreview(URL.createObjectURL(file));
                  }}
                  type="file"
                />
              </label>
            </div>
          </div>

          <label className="checkbox-row">
            <input checked={createLogo} onChange={(event) => setCreateLogo(event.target.checked)} type="checkbox" />
            <span className="custom-checkbox" />
            <span><strong>I don&apos;t have a logo. Create one for me.</strong><small>Choose a direction and prompt; you can generate it later.</small></span>
          </label>

          {createLogo && (
            <div className="logo-generator-fields">
              <label>
                Logo generation prompt
                <textarea defaultValue={brand?.logoPrompt} name="logoPrompt" placeholder="Describe the logo you imagine, including any text or symbols." rows={2} />
              </label>
              <fieldset>
                <legend>Logo style</legend>
                <div className="logo-style-options">
                  {logoStyles.map((style) => (
                    <label className="logo-style-option" key={style}>
                      <input
                        defaultChecked={brand?.logoStyle === style || (!brand?.logoStyle && style === logoStyles[0])}
                        name="logoStyle"
                        type="radio"
                        value={style}
                      />
                      <span>{style}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {formError && <p className="form-message form-error" role="alert">{formError}</p>}

          <div className="modal-footer">
            <button className="subtle-button" onClick={onClose} type="button">Cancel</button>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Saving…" : brand ? "Save changes" : "Save brand"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
