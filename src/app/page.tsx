"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleHelp,
  Clapperboard,
  Command,
  FolderOpen,
  Grid2X2,
  Image as ImageIcon,
  ImagePlus,
  Layers3,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings2,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BrandManager } from "@/components/brand-manager";
import { AssetPreview } from "@/components/asset-preview";
import { CampaignBuilder } from "@/components/campaign-builder";
import { CampaignWorkspace } from "@/components/campaign-workspace";
import { ImageGenerationStudio } from "@/components/image-generation-studio";
import { StudioLibrary } from "@/components/studio-library";
import { database } from "@/lib/database";
import type { CampaignTemplate } from "@/lib/templates";
import type { Campaign, CampaignAsset } from "@/lib/types";

type RecentProject = {
  campaign: Campaign;
  brandName: string;
  asset?: CampaignAsset;
};

const userName = "Kai";
const userInitial = userName.trim().charAt(0).toUpperCase() || "K";

const navigation = [
  { label: "Dashboard", icon: Grid2X2 },
  { label: "Create campaign", icon: WandSparkles },
  { label: "My Campaigns", icon: FolderOpen },
  { label: "My Brands", icon: Layers3 },
  { label: "Image Generation", icon: ImagePlus },
  { label: "Asset library", icon: ImageIcon },
  { label: "Campaign templates", icon: Clapperboard },
];

export default function Home() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [studioCounts, setStudioCounts] = useState({ campaigns: 0, brands: 0, assets: 0 });
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [dashboardError, setDashboardError] = useState("");

  function startBlankCampaign() {
    setSelectedTemplate(null);
    setActiveCampaign(null);
    setActivePage("Create campaign");
  }

  useEffect(() => {
    if (activePage !== "Dashboard") return;
    let active = true;
    void Promise.all([
      database.campaigns.count(),
      database.brands.count(),
      database.assets.toArray(),
      database.campaigns.orderBy("createdAt").reverse().limit(2).toArray(),
      database.brands.toArray(),
    ])
      .then(async ([campaignCount, brandCount, assets, campaigns, brands]) => {
        if (!active) return;
        const brandNames = new Map(brands.map((brand) => [brand.id, brand.name]));
        const recentAssets = await Promise.all(
          campaigns.map((campaign) =>
            database.assets.where("campaignId").equals(campaign.id).first(),
          ),
        );
        if (!active) return;
        setStudioCounts({
          campaigns: campaignCount,
          brands: brandCount,
          assets: assets.filter((asset) => asset.kind !== "logo").length +
            brands.filter((brand) => brand.logo).length,
        });
        setRecentProjects(campaigns.map((campaign, index) => ({
          campaign,
          brandName: brandNames.get(campaign.brandId) ?? "Your brand",
          asset: recentAssets[index],
        })));
        setDashboardError("");
      })
      .catch(() => {
        if (active) setDashboardError("Your studio summary could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [activePage]);

  return (
    <main className="app-shell">
      <aside className={`sidebar${sidebarCollapsed ? " is-collapsed" : ""}`}>
        <a
          aria-label="KAMPAIGN By Kai home"
          className="wordmark"
          href="#dashboard"
          onClick={() => setActivePage("Dashboard")}
        >
          <span className="wordmark-main">KAMPAIGN</span>
          <span className="wordmark-by">BY KAI</span>
          <span className="wordmark-spark" aria-hidden="true">
            ✳
          </span>
        </a>

        <div className="workspace-switcher">
          <div className="workspace-avatar">{userInitial}</div>
          <div className="workspace-copy">
            <span className="eyebrow">YOUR STUDIO</span>
            <strong>{userName}&apos;s workspace</strong>
          </div>
          <ChevronDown aria-hidden="true" size={15} />
        </div>

        <div className="nav-section-label">MENU</div>
        <nav aria-label="Main navigation" className="primary-nav">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              aria-current={activePage === label ? "page" : undefined}
              aria-label={label}
              className={`nav-link ${activePage === label ? "is-active" : ""}`}
              key={label}
              title={sidebarCollapsed ? label : undefined}
              onClick={() => {
                if (label === "Create campaign") {
                  startBlankCampaign();
                } else {
                  setActivePage(label);
                }
              }}
              type="button"
            >
              <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Create campaign" && (
                <span className="nav-new" aria-hidden="true">
                  NEW
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-note">
          <div className="sidebar-note-icon">
            <Sparkles aria-hidden="true" size={16} />
          </div>
          <p>Good ideas deserve a good campaign.</p>
          <span>Make something unforgettable.</span>
          <button
            className="note-link"
            onClick={startBlankCampaign}
            type="button"
          >
            Start creating <ArrowRight aria-hidden="true" size={14} />
          </button>
        </div>

        <div className="sidebar-bottom">
          <button
            aria-label="Settings"
            className={`nav-link ${activePage === "Settings" ? "is-active" : ""}`}
            onClick={() => setActivePage("Settings")}
            title={sidebarCollapsed ? "Settings" : undefined}
            type="button"
          >
            <Settings2 aria-hidden="true" size={17} strokeWidth={1.8} />
            <span>Settings</span>
          </button>
          <div className="profile-row">
            <div className="profile-avatar">{userInitial}</div>
            <div className="profile-copy">
              <strong>{userName}</strong>
              <span>Creative director</span>
            </div>
            <button aria-label="Open profile menu" className="icon-button" type="button">
              <CircleHelp aria-hidden="true" size={17} />
            </button>
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="topbar-leading">
            <button
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="icon-button sidebar-toggle"
              onClick={() => setSidebarCollapsed((current) => !current)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              type="button"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen aria-hidden="true" size={17} />
              ) : (
                <PanelLeftClose aria-hidden="true" size={17} />
              )}
            </button>
            <div className="breadcrumb">
              <span>STUDIO</span>
              <span className="breadcrumb-slash">/</span>
              <strong>{activePage.toUpperCase()}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="today-label">YOUR CREATIVE SPACE</span>
            <button aria-label="Notifications" className="icon-button notification-button" type="button">
              <Bell aria-hidden="true" size={18} />
              <i />
            </button>
            <div className="topbar-divider" />
            <div className="topbar-avatar">{userInitial}</div>
          </div>
        </header>

        {activePage === "Dashboard" ? (
          <div className="dashboard-content">
            <div className="welcome-row">
              <div>
                <div className="eyebrow with-dot">YOUR CREATIVE HQ</div>
                <h1>
                  Make room
                  <br />
                  for <span>what&apos;s next.</span>
                </h1>
                <p className="welcome-description">
                  Your next great campaign starts with a little imagination.
                  Let&apos;s make something worth looking at.
                </p>
                <button
                  className="primary-button"
                  onClick={startBlankCampaign}
                  type="button"
                >
                  <Plus aria-hidden="true" size={17} />
                  Create a campaign
                  <ArrowRight aria-hidden="true" size={15} />
                </button>
              </div>
              <div className="welcome-mark" aria-hidden="true">
                <span>MAKE</span>
                <span>IT</span>
                <span className="mark-outline">MATTER</span>
                <div className="mark-spark">✳</div>
              </div>
            </div>

            <div className="section-heading">
              <div>
                <div className="eyebrow">THE BIG PICTURE</div>
                <h2>Your studio, at a glance</h2>
              </div>
              <button
                className="text-button"
                onClick={() => setActivePage("My Campaigns")}
                type="button"
              >
                View all campaigns <ArrowRight aria-hidden="true" size={15} />
              </button>
            </div>

            {dashboardError && <p className="form-message form-error" role="alert">{dashboardError}</p>}

            <div className="stat-grid">
              <article className="stat-card">
                <div className="stat-icon peach">
                  <Clapperboard aria-hidden="true" size={17} />
                </div>
                <span className="stat-label">CAMPAIGNS CREATED</span>
                <div className="stat-value-row">
                  <strong>{String(studioCounts.campaigns).padStart(2, "0")}</strong>
                  <span className="stat-detail">Saved in your studio</span>
                </div>
                <div className="stat-foot">
                  <span>Keep the momentum going</span>
                  <ArrowUpRight aria-hidden="true" size={15} />
                </div>
              </article>
              <article className="stat-card">
                <div className="stat-icon lavender">
                  <Layers3 aria-hidden="true" size={17} />
                </div>
                <span className="stat-label">BRANDS IN YOUR STUDIO</span>
                <div className="stat-value-row">
                  <strong>{String(studioCounts.brands).padStart(2, "0")}</strong>
                  <span className="stat-detail">Your brand profiles</span>
                </div>
                <div className="stat-foot">
                  <span>Every brand, one home</span>
                  <ArrowUpRight aria-hidden="true" size={15} />
                </div>
              </article>
              <article className="stat-card">
                <div className="stat-icon mint">
                  <ImageIcon aria-hidden="true" size={17} />
                </div>
                <span className="stat-label">CAMPAIGN ASSETS</span>
                <div className="stat-value-row">
                  <strong>{String(studioCounts.assets).padStart(2, "0")}</strong>
                  <span className="stat-detail">Ready to make a mark</span>
                </div>
                <div className="stat-foot">
                  <span>Browse your visual library</span>
                  <ArrowUpRight aria-hidden="true" size={15} />
                </div>
              </article>
            </div>

            <div className="section-heading projects-heading">
              <div>
                <div className="eyebrow">FRESH OFF THE MOODBOARD</div>
                <h2>Recent campaigns</h2>
              </div>
              <button
                className="text-button"
                onClick={() => setActivePage("My Campaigns")}
                type="button"
              >
                All campaigns <ArrowRight aria-hidden="true" size={15} />
              </button>
            </div>

            <div className="project-grid">
              {recentProjects.map(({ campaign, brandName, asset }, index) => (
                <article className="project-card" key={campaign.id}>
                  <div className={`project-image recent-project-image recent-art-${index % 4}`}>
                    {asset ? (
                      <AssetPreview
                        asset={asset}
                        className="project-cover-preview"
                        label={`${campaign.brief.name} campaign`}
                      />
                    ) : (
                      <div className="project-art-fallback">{campaign.brief.name}</div>
                    )}
                    <div className="image-topline">
                      <span>0{index + 1} / CAMPAIGN</span>
                      <span className="project-status done">STRATEGY READY</span>
                    </div>
                    <button
                      aria-label={`Open ${campaign.brief.name} campaign`}
                      className="image-open"
                      onClick={() => {
                        setActiveCampaign(campaign);
                        setActivePage("Campaign workspace");
                      }}
                      type="button"
                    >
                      <ArrowUpRight aria-hidden="true" size={17} />
                    </button>
                  </div>
                  <div className="project-info">
                    <div>
                      <h3>{campaign.brief.name}</h3>
                      <p>{campaign.brief.type} · {new Date(campaign.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="project-brand-chip">{brandName}</span>
                  </div>
                </article>
              ))}
              {recentProjects.length === 0 && (
                <div className="dashboard-project-empty">
                  <FolderOpen aria-hidden="true" size={20} />
                  <strong>Your first campaign is waiting.</strong>
                  <span>Once you create one, it will show up here.</span>
                </div>
              )}
              <button
                className="new-project-card"
                onClick={startBlankCampaign}
                type="button"
              >
                <div className="new-project-icon">
                  <Plus aria-hidden="true" size={20} />
                </div>
                <strong>Your next big idea.</strong>
                <span>Start with a blank canvas</span>
                <span className="new-project-link">
                  Create a campaign <ArrowRight aria-hidden="true" size={14} />
                </span>
                <div className="new-project-decoration" aria-hidden="true">
                  <ArrowDownRight size={78} strokeWidth={0.8} />
                </div>
              </button>
            </div>

            <div className="bottom-hint">
              <Command aria-hidden="true" size={13} />
              <span>Your studio is looking good. Where will your imagination take you?</span>
              <Sparkles aria-hidden="true" size={14} />
            </div>
          </div>
        ) : activePage === "My Brands" ? (
          <BrandManager />
        ) : activePage === "Image Generation" ? (
          <ImageGenerationStudio onCreateBrand={() => setActivePage("My Brands")} />
        ) : activePage === "Create campaign" ? (
          <CampaignBuilder
            onCreateBrand={() => setActivePage("My Brands")}
            template={selectedTemplate}
            onCreated={(campaign) => {
              setActiveCampaign(campaign);
              setActivePage("Campaign workspace");
            }}
          />
        ) : activePage === "Campaign workspace" && activeCampaign ? (
          <CampaignWorkspace
            campaign={activeCampaign}
            onBack={() => setActivePage("Dashboard")}
            onCampaignChange={setActiveCampaign}
          />
        ) : (
          activePage === "My Campaigns" ||
          activePage === "Asset library" ||
          activePage === "Campaign templates" ||
          activePage === "Settings"
        ) ? (
          <StudioLibrary
            page={activePage}
            onOpenCampaign={(campaign) => {
              setActiveCampaign(campaign);
              setActivePage("Campaign workspace");
            }}
            onOpenBrand={() => setActivePage("My Brands")}
            onUseTemplate={(template) => {
              setSelectedTemplate(template);
              setActivePage("Create campaign");
            }}
          />
        ) : (
          <div className="coming-content">
            <div className="eyebrow with-dot">YOUR CREATIVE HQ</div>
            <div className="coming-mark" aria-hidden="true">
              ✳
            </div>
            <h1>
              Something good
              <br />
              is <span>in the works.</span>
            </h1>
            <p>
              {activePage} is part of your studio. We&apos;re building it step
              by step, with care.
            </p>
            <button
              className="primary-button"
              onClick={() => setActivePage("Dashboard")}
              type="button"
            >
              Back to your dashboard <ArrowRight aria-hidden="true" size={15} />
            </button>
          </div>
        )}

        <footer className="app-footer">
          <span>KAMPAIGN BY KAI</span>
          <span>GOOD IDEAS. BETTER CAMPAIGNS.</span>
        </footer>
      </section>
    </main>
  );
}
