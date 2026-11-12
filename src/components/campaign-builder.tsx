"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { database } from "@/lib/database";
import type { CampaignTemplate } from "@/lib/templates";
import type {
  Brand,
  BrandContext,
  Campaign,
  CampaignBrief,
  CampaignStrategy,
} from "@/lib/types";

const initialBrief: CampaignBrief = {
  name: "",
  type: "",
  objective: "",
  targetAudience: "",
  aesthetic: "",
  photographyStyle: "",
  modelCasting: "",
  location: "",
  lighting: "",
  season: "",
  mood: "",
  colourPalette: "",
  formats: ["Instagram", "Campaign images"],
  creativeInstructions: "",
};

const steps = ["The brief", "Creative direction", "Review"];
const campaignTypes = ["Single product", "Collection", "Brand awareness", "Seasonal"];
const objectives = ["Build awareness", "Launch something new", "Drive sales", "Tell our story"];
const aesthetics = ["Editorial", "Street", "Minimal", "Romantic", "Sporty", "Unexpected"];
const photographyStyles = ["High-fashion editorial", "Candid and documentary", "Studio portrait", "Lifestyle"];
const modelCastings = ["One model", "A diverse group", "Friends and community", "No models / product-led"];
const locations = ["City streets", "Studio", "Nature", "At home", "A place that feels like us"];
const lightingStyles = ["Soft daylight", "Golden hour", "Direct flash", "Dramatic shadows"];
const seasons = ["Spring / Summer", "Autumn / Winter", "Resort", "All season"];
const moods = ["Confident", "Playful", "Quiet", "Nostalgic", "Bold", "Dreamlike"];
const palettes = ["Warm earth", "Black & white", "Soft neutrals", "Bright colour", "Brand colours"];
const formats = ["Campaign images", "Instagram", "TikTok", "Website", "Email", "Print"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCampaignStrategy(value: unknown): value is CampaignStrategy {
  return (
    isRecord(value) &&
    [
      "overview",
      "creativeDirection",
      "visualIdentity",
      "photographyDirection",
      "campaignImages",
      "marketingCopy",
      "campaignExecution",
    ].every((key) => typeof value[key] === "string")
  );
}

export function CampaignBuilder({
  onCreateBrand,
  onCreated,
  template,
  workspaceId,
}: {
  onCreateBrand: () => void;
  onCreated: (campaign: Campaign) => void;
  template?: CampaignTemplate | null;
  workspaceId: string;
}) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("");
  const [brief, setBrief] = useState<CampaignBrief>(() => ({
    ...initialBrief,
    ...template?.brief,
    formats: template?.brief.formats ?? initialBrief.formats,
  }));
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    void database.brands
      .where("workspaceId")
      .equals(workspaceId)
      .toArray()
      .then((savedBrands) => {
        const sortedBrands = savedBrands.sort((a, b) => b.updatedAt - a.updatedAt);
        setBrands(sortedBrands);
        setBrandId(sortedBrands[0]?.id ?? "");
      })
      .catch(() => setError("Your brands could not be loaded. Please try again."))
      .finally(() => setIsLoading(false));
  }, [workspaceId]);

  const selectedBrand = brands.find((brand) => brand.id === brandId);

  function updateBrief<Key extends keyof CampaignBrief>(
    key: Key,
    value: CampaignBrief[Key],
  ) {
    setBrief((current) => ({ ...current, [key]: value }));
  }

  function continueToNextStep() {
    setError("");
    if (step === 0 && (!brandId || !brief.name.trim() || !brief.type || !brief.objective)) {
      setError("Choose a brand and complete the campaign name, type, and objective.");
      return;
    }
    if (step === 1 && (!brief.aesthetic || !brief.photographyStyle)) {
      setError("Choose an aesthetic and photography style to continue.");
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function makeBrandContext(brand: Brand): BrandContext {
    return {
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
  }

  async function generateCampaign() {
    if (!selectedBrand) {
      setError("Choose a brand before creating a campaign.");
      return;
    }
    if (!brief.formats.length) {
      setError("Choose at least one campaign format.");
      return;
    }
    setError("");
    setIsGenerating(true);
    try {
      const response = await fetch("/api/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: makeBrandContext(selectedBrand), brief }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          isRecord(result) && typeof result.error === "string"
            ? result.error
            : "Your campaign could not be generated. Please try again.";
        throw new Error(message);
      }
      if (!isRecord(result) || !isCampaignStrategy(result.strategy)) {
        throw new Error("The generated campaign was incomplete. Please try again.");
      }

      const now = Date.now();
      const campaign: Campaign = {
        id: crypto.randomUUID(),
        workspaceId,
        brandId: selectedBrand.id,
        brief,
        strategy: result.strategy,
        imageCount: 1,
        createdAt: now,
        updatedAt: now,
      };
      await database.campaigns.add(campaign);
      onCreated(campaign);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Your campaign could not be generated. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="feature-content campaign-builder">
      <div className="eyebrow with-dot">LET&apos;S MAKE SOMETHING GOOD</div>
      <div className="campaign-builder-heading">
        <div>
          <h1>
            Start with an idea.
            <br />
            Leave with a <span>campaign.</span>
          </h1>
          <p>A few thoughtful choices are all it takes to get the creative moving.</p>
        </div>
        <div className="campaign-sticker" aria-hidden="true">IDEAS<br />IN MOTION</div>
      </div>

      <div aria-label="Campaign setup progress" className="wizard-progress">
        {steps.map((label, index) => (
          <button
            aria-current={step === index ? "step" : undefined}
            className={`wizard-step ${step === index ? "current" : ""} ${step > index ? "complete" : ""}`}
            key={label}
            onClick={() => step > index && setStep(index)}
            type="button"
          >
            <span className="wizard-number">{step > index ? <Check size={13} /> : `0${index + 1}`}</span>
            <span>{label}</span>
          </button>
        ))}
        <div className="wizard-line"><span style={{ width: `${(step / (steps.length - 1)) * 100}%` }} /></div>
      </div>

      <section className="wizard-panel">
        {step === 0 && (
          <>
            <div className="wizard-panel-heading">
              <span className="wizard-count">01 — SET THE SCENE</span>
              <h2>What are we making?</h2>
              <p>Start with the brand and what you want this campaign to do.</p>
            </div>
            {isLoading ? (
              <p className="local-note">Loading your brands…</p>
            ) : brands.length ? (
              <div className="wizard-form-grid">
                <label className="form-field">
                  Your brand <span className="required-mark">*</span>
                  <select value={brandId} onChange={(event) => setBrandId(event.target.value)}>
                    <option value="">Choose a brand</option>
                    {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                  </select>
                </label>
                <label className="form-field">
                  Campaign name <span className="required-mark">*</span>
                  <input
                    onChange={(event) => updateBrief("name", event.target.value)}
                    placeholder="e.g. The New Form"
                    value={brief.name}
                  />
                </label>
                <ChoiceField
                  label="Campaign type"
                  options={campaignTypes}
                  required
                  value={brief.type}
                  onChange={(value) => updateBrief("type", value)}
                />
                <ChoiceField
                  label="Campaign objective"
                  options={objectives}
                  required
                  value={brief.objective}
                  onChange={(value) => updateBrief("objective", value)}
                />
                <label className="form-field form-field-wide">
                  Who are we speaking to?
                  <input
                    onChange={(event) => updateBrief("targetAudience", event.target.value)}
                    placeholder="Describe the people you want to reach"
                    value={brief.targetAudience || selectedBrand?.targetAudience || ""}
                  />
                  <span className="field-hint">You can adjust your brand&apos;s audience for this campaign.</span>
                </label>
              </div>
            ) : (
              <div className="empty-panel campaign-no-brand">
                <h2>Add your brand first.</h2>
                <p>Your brand profile helps shape your campaign strategy.</p>
                <button className="primary-button" onClick={onCreateBrand} type="button">Create a brand</button>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div className="wizard-panel-heading">
              <span className="wizard-count">02 — FIND THE FEELING</span>
              <h2>Set the creative direction.</h2>
              <p>There are no wrong answers. Choose the options that feel like your brand.</p>
            </div>
            <div className="wizard-form-grid">
              <ChoiceField label="Campaign aesthetic" options={aesthetics} required value={brief.aesthetic} onChange={(value) => updateBrief("aesthetic", value)} />
              <ChoiceField label="Photography style" options={photographyStyles} required value={brief.photographyStyle} onChange={(value) => updateBrief("photographyStyle", value)} />
              <ChoiceField label="Model casting" options={modelCastings} value={brief.modelCasting} onChange={(value) => updateBrief("modelCasting", value)} />
              <ChoiceField label="Location" options={locations} value={brief.location} onChange={(value) => updateBrief("location", value)} />
              <ChoiceField label="Lighting" options={lightingStyles} value={brief.lighting} onChange={(value) => updateBrief("lighting", value)} />
              <ChoiceField label="Season" options={seasons} value={brief.season} onChange={(value) => updateBrief("season", value)} />
              <ChoiceField label="Mood" options={moods} value={brief.mood} onChange={(value) => updateBrief("mood", value)} />
              <ChoiceField label="Colour palette" options={palettes} value={brief.colourPalette} onChange={(value) => updateBrief("colourPalette", value)} />
              <label className="form-field form-field-wide">
                Anything else we should know?
                <textarea
                  onChange={(event) => updateBrief("creativeInstructions", event.target.value)}
                  placeholder="A product detail, a feeling, or something you definitely want to avoid."
                  rows={3}
                  value={brief.creativeInstructions}
                />
              </label>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="wizard-panel-heading">
              <span className="wizard-count">03 — ONE LAST LOOK</span>
              <h2>Ready to make it real?</h2>
              <p>Choose the formats you need. We&apos;ll write the campaign strategy first—no images are generated yet.</p>
            </div>
            <fieldset className="format-fieldset">
              <legend>Where will this campaign show up?</legend>
              <div className="format-options">
                {formats.map((format) => (
                  <label className="format-option" key={format}>
                    <input
                      checked={brief.formats.includes(format)}
                      onChange={() => updateBrief(
                        "formats",
                        brief.formats.includes(format)
                          ? brief.formats.filter((item) => item !== format)
                          : [...brief.formats, format],
                      )}
                      type="checkbox"
                    />
                    <span><Check aria-hidden="true" size={13} />{format}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="brief-review">
              <div className="brief-review-label">YOUR CAMPAIGN BRIEF</div>
              <h3>{brief.name || "Untitled campaign"}</h3>
              <div className="review-chips">
                {[selectedBrand?.name, brief.type, brief.objective, brief.aesthetic, brief.photographyStyle, brief.season, ...brief.formats]
                  .filter(Boolean)
                  .map((item) => <span key={item}>{item}</span>)}
              </div>
              <p>Written strategy will be saved in this browser. You&apos;ll review it before choosing whether to generate any images.</p>
            </div>
          </>
        )}

        {error && <p className="form-message form-error" role="alert">{error}</p>}

        <div className="wizard-actions">
          {step > 0 ? (
            <button className="subtle-button" onClick={() => { setError(""); setStep((current) => current - 1); }} type="button">
              <ArrowLeft aria-hidden="true" size={14} /> Back
            </button>
          ) : <span />}
          {step < steps.length - 1 ? (
            <button className="primary-button" onClick={continueToNextStep} type="button">
              Continue <ArrowRight aria-hidden="true" size={15} />
            </button>
          ) : (
            <button className="primary-button" disabled={isGenerating} onClick={() => void generateCampaign()} type="button">
              <Sparkles aria-hidden="true" size={15} />
              {isGenerating ? "Writing your campaign…" : "Create campaign strategy"}
              {!isGenerating && <ArrowRight aria-hidden="true" size={15} />}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function ChoiceField({
  label,
  options,
  value,
  onChange,
  required = false,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="form-field">
      {label} {required && <span className="required-mark">*</span>}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose one</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
