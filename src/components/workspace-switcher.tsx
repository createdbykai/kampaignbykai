"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { database } from "@/lib/database";
import type { Workspace } from "@/lib/types";

type WorkspaceDialog = "create" | "rename" | null;

function getTimestamp() {
  return Date.now();
}

export function WorkspaceSwitcher({
  onWorkspaceChange,
}: {
  onWorkspaceChange: (workspaceId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<WorkspaceDialog>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const currentWorkspace = workspaces.find(({ id }) => id === currentWorkspaceId);

  const readWorkspaces = useCallback(async () => {
    const savedWorkspaces = await database.workspaces.orderBy("createdAt").toArray();
    if (!savedWorkspaces.length) {
      throw new Error("No workspaces were found. Please refresh the page.");
    }

    const selectedWorkspace =
      savedWorkspaces.find((workspace) => workspace.isCurrent) ?? savedWorkspaces[0];
    const normalizedWorkspaces = savedWorkspaces.map((workspace) => ({
      ...workspace,
      isCurrent: workspace.id === selectedWorkspace.id,
    }));
    if (savedWorkspaces.some((workspace) =>
        workspace.isCurrent !== (workspace.id === selectedWorkspace.id),
    )) {
      await database.workspaces.bulkPut(normalizedWorkspaces);
    }

    return normalizedWorkspaces;
  }, []);

  useEffect(() => {
    let active = true;
    void readWorkspaces()
      .then((savedWorkspaces) => {
        if (!active) return;
        const selected = savedWorkspaces.find(({ isCurrent }) => isCurrent) ?? savedWorkspaces[0];
        setWorkspaces(savedWorkspaces);
        setCurrentWorkspaceId(selected.id);
        setError("");
        onWorkspaceChange(selected.id);
      })
      .catch(() => {
        if (active) setError("Your workspaces could not be loaded. Please try again.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onWorkspaceChange, readWorkspaces]);

  async function reloadWorkspaces() {
    setIsLoading(true);
    setError("");
    try {
      const savedWorkspaces = await readWorkspaces();
      const selected = savedWorkspaces.find(({ isCurrent }) => isCurrent) ?? savedWorkspaces[0];
      setWorkspaces(savedWorkspaces);
      setCurrentWorkspaceId(selected.id);
      onWorkspaceChange(selected.id);
    } catch {
      setError("Your workspaces could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!menuOpen) return;
    function closeMenu(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [menuOpen]);

  function openDialog(action: Exclude<WorkspaceDialog, null>) {
    setDialog(action);
    setWorkspaceName(action === "rename" ? currentWorkspace?.name ?? "" : "");
    setDialogError("");
    setMenuOpen(false);
  }

  async function handleDialogSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name) {
      setDialogError("Enter a name for this workspace.");
      return;
    }
    if (name.length > 80) {
      setDialogError("Workspace names must be 80 characters or fewer.");
      return;
    }
    if (workspaces.some((workspace) =>
      workspace.id !== currentWorkspaceId &&
      workspace.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )) {
      setDialogError("A workspace with that name already exists.");
      return;
    }

    setIsSaving(true);
    setError("");
    setDialogError("");
    try {
      const now = getTimestamp();
      if (dialog === "create") {
        const workspace: Workspace = {
          id: crypto.randomUUID(),
          name,
          isCurrent: true,
          createdAt: now,
          updatedAt: now,
        };
        await database.transaction("rw", database.workspaces, async () => {
          await database.workspaces.toCollection().modify((item) => {
            item.isCurrent = false;
          });
          await database.workspaces.add(workspace);
        });
        setWorkspaces((current) => [
          ...current.map((item) => ({ ...item, isCurrent: false })),
          workspace,
        ]);
        setCurrentWorkspaceId(workspace.id);
        onWorkspaceChange(workspace.id);
      } else if (currentWorkspace) {
        const renamedWorkspace = { ...currentWorkspace, name, updatedAt: now };
        await database.workspaces.put(renamedWorkspace);
        setWorkspaces((current) => current.map((item) =>
          item.id === renamedWorkspace.id ? renamedWorkspace : item,
        ));
      }
      setDialog(null);
    } catch {
      setDialogError(
        dialog === "create"
          ? "The workspace could not be created. Please try again."
          : "The workspace could not be renamed. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function selectWorkspace(workspace: Workspace) {
    setMenuOpen(false);
    if (workspace.id === currentWorkspaceId) return;
    setError("");
    try {
      await database.transaction("rw", database.workspaces, async () => {
        await database.workspaces.toCollection().modify((item) => {
          item.isCurrent = item.id === workspace.id;
          item.updatedAt = getTimestamp();
        });
      });
      setWorkspaces((current) => current.map((item) => ({
        ...item,
        isCurrent: item.id === workspace.id,
      })));
      setCurrentWorkspaceId(workspace.id);
      onWorkspaceChange(workspace.id);
    } catch {
      setError("The workspace could not be opened. Please try again.");
    }
  }

  async function deleteCurrentWorkspace() {
    if (!currentWorkspace || workspaces.length <= 1) return;
    if (!window.confirm(
      `Delete “${currentWorkspace.name}” and all of its brands, campaigns, and generated images? This cannot be undone.`,
    )) {
      return;
    }

    setError("");
    setMenuOpen(false);
    try {
      const nextWorkspace = await database.transaction(
        "rw",
        database.workspaces,
        database.brands,
        database.campaigns,
        database.assets,
        async () => {
          const savedWorkspaces = await database.workspaces.orderBy("createdAt").toArray();
          if (savedWorkspaces.length <= 1) {
            throw new Error("At least one workspace must remain.");
          }
          const next = savedWorkspaces.find(({ id }) => id !== currentWorkspace.id);
          if (!next) throw new Error("A replacement workspace could not be found.");

          await database.assets.where("workspaceId").equals(currentWorkspace.id).delete();
          await database.campaigns.where("workspaceId").equals(currentWorkspace.id).delete();
          await database.brands.where("workspaceId").equals(currentWorkspace.id).delete();
          await database.workspaces.delete(currentWorkspace.id);
          await database.workspaces.toCollection().modify((item) => {
            item.isCurrent = item.id === next.id;
            item.updatedAt = getTimestamp();
          });
          return next;
        },
      );

      const remainingWorkspaces = await database.workspaces.orderBy("createdAt").toArray();
      setWorkspaces(remainingWorkspaces);
      setCurrentWorkspaceId(nextWorkspace.id);
      onWorkspaceChange(nextWorkspace.id);
    } catch {
      setError("The workspace and its data could not be deleted. Please try again.");
    }
  }

  return (
    <div
      className="workspace-switcher-container"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setMenuOpen(false);
          setDialog(null);
        }
      }}
      ref={containerRef}
    >
      <button
        aria-expanded={menuOpen}
        aria-controls="workspace-options"
        aria-label={`Current workspace: ${currentWorkspace?.name ?? "loading"}`}
        className="workspace-switcher"
        disabled={isLoading || Boolean(error)}
        onClick={() => setMenuOpen((current) => !current)}
        type="button"
      >
        <span className="workspace-avatar" aria-hidden="true">
          {(currentWorkspace?.name.trim().charAt(0) || "W").toUpperCase()}
        </span>
        <span className="workspace-copy">
          <span className="eyebrow">YOUR STUDIO</span>
          <strong>{currentWorkspace?.name ?? (isLoading ? "Loading workspace…" : "Workspace unavailable")}</strong>
        </span>
        <ChevronDown aria-hidden="true" size={15} />
      </button>

      {error && (
        <div className="workspace-switcher-error" role="alert">
          <span>{error}</span>
          <button
            onClick={() => {
              void reloadWorkspaces();
            }}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {menuOpen && currentWorkspace && (
        <div aria-label="Workspace options" className="workspace-menu" id="workspace-options" role="group">
          <span className="workspace-menu-label">SWITCH WORKSPACE</span>
          {workspaces.map((workspace) => (
            <button
              aria-current={workspace.id === currentWorkspaceId ? "true" : undefined}
              className="workspace-menu-item"
              key={workspace.id}
              onClick={() => void selectWorkspace(workspace)}
              type="button"
            >
              <span>{workspace.name}</span>
              {workspace.id === currentWorkspaceId && <Check aria-hidden="true" size={15} />}
            </button>
          ))}
          <div className="workspace-menu-divider" role="separator" />
          <button className="workspace-menu-item" onClick={() => openDialog("create")} type="button">
            <span><Plus aria-hidden="true" size={15} /> Create a workspace</span>
          </button>
          <button className="workspace-menu-item" onClick={() => openDialog("rename")} type="button">
            <span>Rename current workspace</span>
          </button>
          {workspaces.length > 1 && (
            <button
              className="workspace-menu-item workspace-menu-delete"
              onClick={() => void deleteCurrentWorkspace()}
              type="button"
            >
              <span><Trash2 aria-hidden="true" size={14} /> Delete current workspace</span>
            </button>
          )}
        </div>
      )}

      {dialog && (
        <div
          className="modal-backdrop workspace-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) setDialog(null);
          }}
        >
          <section aria-labelledby="workspace-dialog-title" aria-modal="true" className="workspace-modal" role="dialog">
            <div className="modal-header">
              <div>
                <div className="eyebrow">YOUR STUDIO</div>
                <h2 id="workspace-dialog-title">
                  {dialog === "create" ? "Create a workspace." : "Rename your workspace."}
                </h2>
              </div>
              <button
                aria-label="Close workspace dialog"
                className="subtle-icon-button"
                disabled={isSaving}
                onClick={() => setDialog(null)}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <form onSubmit={(event) => void handleDialogSubmit(event)}>
              <label htmlFor="workspace-name">Workspace name</label>
              <input
                autoFocus
                id="workspace-name"
                maxLength={80}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="e.g. Summer collection"
                value={workspaceName}
              />
              {dialogError && <p className="form-message form-error" role="alert">{dialogError}</p>}
              <div className="workspace-modal-actions">
                <button className="subtle-button" disabled={isSaving} onClick={() => setDialog(null)} type="button">
                  Cancel
                </button>
                <button className="primary-button" disabled={isSaving} type="submit">
                  {isSaving ? "Saving…" : dialog === "create" ? "Create workspace" : "Save name"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
