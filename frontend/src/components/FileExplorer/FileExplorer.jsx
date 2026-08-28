import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import ContextMenu from "./ContextMenu";
import { iconForFile, FOLDER_ICON_CLOSED, FOLDER_ICON_OPEN } from "./fileIcons";
import { getSocket } from "../../lib/socket";
import {
  useGetFileTreeQuery,
  useCreateFileNodeMutation,
  useRenameFileNodeMutation,
  useMoveFileNodeMutation,
  useDuplicateFileNodeMutation,
  useDeleteFileNodeMutation,
} from "../../redux/FileApi";

/**
 * FEATURE 1 — Advanced File Explorer.
 *
 * VS Code-style project tree for a coding session: create/rename/delete/
 * duplicate file & folders, drag & drop to reorganize, right-click context
 * menu, multi-select, collapse/expand, and file-type icons.
 *
 * Props:
 *  - sessionToken: string — which session's tree to show/edit
 *  - onOpenFile(node): called when a file is single-clicked/opened
 *  - activeFileId: currently open file's id, for highlighting
 *  - theme: color tokens (same shape as Editor.jsx's `t`)
 */
export default function FileExplorer({ sessionToken, onOpenFile, activeFileId, theme }) {
  const t = theme || DEFAULT_THEME;

  const { data: tree = [], isLoading, isFetching, refetch } = useGetFileTreeQuery(sessionToken, {
    skip: !sessionToken,
  });
  const [createFileNode] = useCreateFileNodeMutation();
  const [renameFileNode] = useRenameFileNodeMutation();
  const [moveFileNode] = useMoveFileNodeMutation();
  const [duplicateFileNode] = useDuplicateFileNodeMutation();
  const [deleteFileNode] = useDeleteFileNodeMutation();

  const [expanded, setExpanded] = useState(() => new Set());
  const [selected, setSelected] = useState(() => new Set());
  const [contextMenu, setContextMenu] = useState(null); // { x, y, node | null }
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [creating, setCreating] = useState(null); // { parentId, type }
  const [createValue, setCreateValue] = useState("");
  const [dragOverId, setDragOverId] = useState(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);
  const draggingIdRef = useRef(null);

  // Auto-expand the top-level "src" folder on first load so the tree isn't
  // a single collapsed row the first time a participant opens the panel.
  useEffect(() => {
    if (tree.length && expanded.size === 0) {
      const src = tree.find((n) => n.type === "FOLDER");
      if (src) setExpanded(new Set([src.id]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.length]);

  // Live sync: another participant's create/rename/delete/move refetches our tree.
  useEffect(() => {
    if (!sessionToken) return;
    const socket = getSocket();
    const handler = () => refetch();
    socket.on("file_tree_change", handler);
    return () => socket.off("file_tree_change", handler);
  }, [sessionToken, refetch]);

  const broadcastChange = useCallback(() => {
    if (!sessionToken) return;
    getSocket().emit("file_tree_change", { sessionToken, at: Date.now() });
  }, [sessionToken]);

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectNode = (node, e) => {
    const additive = e.metaKey || e.ctrlKey;
    setSelected((prev) => {
      if (additive) {
        const next = new Set(prev);
        next.has(node.id) ? next.delete(node.id) : next.add(node.id);
        return next;
      }
      return new Set([node.id]);
    });
  };

  const handleNodeClick = (node, e) => {
    selectNode(node, e);
    if (node.type === "FOLDER") {
      toggleExpand(node.id);
    } else if (onOpenFile) {
      onOpenFile(node);
    }
  };

  // ── Create ───────────────────────────────────────────────────────────────

  const startCreate = (parentId, type) => {
    if (parentId != null) setExpanded((prev) => new Set(prev).add(parentId));
    setCreating({ parentId, type });
    setCreateValue("");
  };

  const commitCreate = async () => {
    const name = createValue.trim();
    if (!name || !creating) {
      setCreating(null);
      return;
    }
    try {
      await createFileNode({
        sessionToken,
        parentId: creating.parentId,
        name,
        type: creating.type,
        content: "",
      }).unwrap();
      broadcastChange();
    } catch (err) {
      alert(err?.data?.message || err?.error || "Could not create — that name may already exist.");
    }
    setCreating(null);
    setCreateValue("");
  };

  // ── Rename ───────────────────────────────────────────────────────────────

  const startRename = (node) => {
    setRenamingId(node.id);
    setRenameValue(node.name);
  };

  const commitRename = async (node) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name || name === node.name) return;
    try {
      await renameFileNode({ id: node.id, name }).unwrap();
      broadcastChange();
    } catch (err) {
      alert(err?.data?.message || err?.error || "Rename failed — that name may already exist.");
    }
  };

  // ── Delete / Duplicate ──────────────────────────────────────────────────

  const handleDelete = async (node) => {
    const label = node.type === "FOLDER" ? "this folder and everything inside it" : `"${node.name}"`;
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;
    try {
      await deleteFileNode(node.id).unwrap();
      broadcastChange();
    } catch (err) {
      alert(err?.data?.message || err?.error || "Delete failed.");
    }
  };

  const handleDuplicate = async (node) => {
    try {
      await duplicateFileNode(node.id).unwrap();
      broadcastChange();
    } catch (err) {
      alert(err?.data?.message || err?.error || "Duplicate failed.");
    }
  };

  // ── Drag & drop ──────────────────────────────────────────────────────────

  const handleDragStart = (node) => (e) => {
    draggingIdRef.current = node.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(node.id));
  };

  const handleDropOn = (targetFolderId) => async (e) => {
    e.preventDefault();
    setDragOverId(null);
    setDragOverRoot(false);
    const draggedId = Number(e.dataTransfer.getData("text/plain")) || draggingIdRef.current;
    draggingIdRef.current = null;
    if (!draggedId || draggedId === targetFolderId) return;
    try {
      await moveFileNode({ id: draggedId, newParentId: targetFolderId }).unwrap();
      broadcastChange();
      if (targetFolderId != null) setExpanded((prev) => new Set(prev).add(targetFolderId));
    } catch (err) {
      alert(err?.data?.message || err?.error || "Couldn't move — that name may already exist there.");
    }
  };

  // ── Context menu builders ────────────────────────────────────────────────

  const openContextMenu = (e, node) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(new Set([node.id]));
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const openRootContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node: null });
  };

  const contextItemsFor = (node) => {
    if (!node) {
      return [
        { label: "New File", icon: "📄", onClick: () => startCreate(null, "FILE") },
        { label: "New Folder", icon: "📁", onClick: () => startCreate(null, "FOLDER") },
        "divider",
        { label: "Refresh Explorer", icon: "↻", onClick: () => refetch() },
      ];
    }
    const items = [];
    if (node.type === "FOLDER") {
      items.push(
        { label: "New File", icon: "📄", onClick: () => startCreate(node.id, "FILE") },
        { label: "New Folder", icon: "📁", onClick: () => startCreate(node.id, "FOLDER") },
        "divider"
      );
    }
    items.push(
      { label: "Rename", icon: "✎", shortcut: "F2", onClick: () => startRename(node) },
      { label: "Duplicate", icon: "⧉", onClick: () => handleDuplicate(node) },
      "divider",
      { label: "Delete", icon: "🗑", danger: true, shortcut: "Del", onClick: () => handleDelete(node) }
    );
    return items;
  };

  if (!sessionToken) {
    return (
      <ExplorerShell t={t} onCreateFile={() => {}} onCreateFolder={() => {}} onRefresh={() => {}}>
        <EmptyMessage t={t} text="No active session." />
      </ExplorerShell>
    );
  }

  return (
    <ExplorerShell
      t={t}
      onCreateFile={() => startCreate(null, "FILE")}
      onCreateFolder={() => startCreate(null, "FOLDER")}
      onRefresh={() => refetch()}
    >
      <div
        onContextMenu={openRootContextMenu}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverRoot(true);
        }}
        onDragLeave={() => setDragOverRoot(false)}
        onDrop={handleDropOn(null)}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 0",
          background: dragOverRoot ? t.accentBg : "transparent",
          minHeight: "100%",
        }}
      >
        {isLoading ? (
          <LoadingSkeleton t={t} />
        ) : tree.length === 0 && !creating ? (
          <EmptyMessage t={t} text="This project is empty. Right-click to create a file or folder." />
        ) : (
          <>
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                t={t}
                expanded={expanded}
                selected={selected}
                activeFileId={activeFileId}
                renamingId={renamingId}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                onCommitRename={commitRename}
                creating={creating}
                createValue={createValue}
                setCreateValue={setCreateValue}
                onCommitCreate={commitCreate}
                onNodeClick={handleNodeClick}
                onContextMenu={openContextMenu}
                onDragStart={handleDragStart}
                onDropOn={handleDropOn}
                dragOverId={dragOverId}
                setDragOverId={setDragOverId}
              />
            ))}
            {creating && creating.parentId === null && (
              <InlineCreateRow
                depth={0}
                type={creating.type}
                value={createValue}
                setValue={setCreateValue}
                onCommit={commitCreate}
                t={t}
              />
            )}
          </>
        )}
        {isFetching && !isLoading && (
          <div style={{ padding: "4px 12px", fontSize: 10.5, color: t.textDim }}>Syncing…</div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextItemsFor(contextMenu.node)}
          onClose={() => setContextMenu(null)}
          theme={t}
        />
      )}
    </ExplorerShell>
  );
}

// ── Recursive tree row ──────────────────────────────────────────────────────

function TreeNode({
  node, depth, t, expanded, selected, activeFileId,
  renamingId, renameValue, setRenameValue, onCommitRename,
  creating, createValue, setCreateValue, onCommitCreate,
  onNodeClick, onContextMenu, onDragStart, onDropOn, dragOverId, setDragOverId,
}) {
  const isFolder = node.type === "FOLDER";
  const isOpen = expanded.has(node.id);
  const isSelected = selected.has(node.id);
  const isActive = node.id === activeFileId;
  const isRenaming = renamingId === node.id;
  const isDragOver = dragOverId === node.id;
  const meta = isFolder ? null : iconForFile(node.name);

  return (
    <div>
      <div
        draggable={!isRenaming}
        onDragStart={onDragStart(node)}
        onDragOver={(e) => {
          if (!isFolder) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOverId(node.id);
        }}
        onDragLeave={() => setDragOverId((id) => (id === node.id ? null : id))}
        onDrop={isFolder ? (e) => { e.stopPropagation(); onDropOn(node.id)(e); } : undefined}
        onClick={(e) => onNodeClick(node, e)}
        onContextMenu={(e) => onContextMenu(e, node)}
        title={node.name}
        style={{
          padding: `4px 10px 4px ${10 + depth * 14}px`,
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          fontSize: 12.5,
          margin: "0 4px",
          borderRadius: 4,
          color: isActive ? t.accent : isFolder ? t.textNormal : t.textDim,
          background: isDragOver ? t.accentBg : isSelected ? t.accentBg : isActive ? t.accentBg : "transparent",
          transition: "background 100ms ease",
        }}
      >
        {isFolder && (
          <span style={{ width: 10, fontSize: 9, color: t.textDim }}>{isOpen ? "▾" : "▸"}</span>
        )}
        <span style={{ color: meta?.color, fontSize: isFolder ? 13 : 11, minWidth: 16, textAlign: "center" }}>
          {isFolder ? (isOpen ? FOLDER_ICON_OPEN : FOLDER_ICON_CLOSED) : meta.icon}
        </span>
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => onCommitRename(node)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitRename(node);
              if (e.key === "Escape") onCommitRename({ ...node, name: node.name });
            }}
            style={{
              flex: 1,
              background: t.bgDeep,
              border: `1px solid ${t.accent}`,
              borderRadius: 3,
              color: t.textNormal,
              fontSize: 12.5,
              padding: "1px 4px",
            }}
          />
        ) : (
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        )}
      </div>

      {isFolder && isOpen && (
        <>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              t={t}
              expanded={expanded}
              selected={selected}
              activeFileId={activeFileId}
              renamingId={renamingId}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              onCommitRename={onCommitRename}
              creating={creating}
              createValue={createValue}
              setCreateValue={setCreateValue}
              onCommitCreate={onCommitCreate}
              onNodeClick={onNodeClick}
              onContextMenu={onContextMenu}
              onDragStart={onDragStart}
              onDropOn={onDropOn}
              dragOverId={dragOverId}
              setDragOverId={setDragOverId}
            />
          ))}
          {creating && creating.parentId === node.id && (
            <InlineCreateRow
              depth={depth + 1}
              type={creating.type}
              value={createValue}
              setValue={setCreateValue}
              onCommit={onCommitCreate}
              t={t}
            />
          )}
        </>
      )}
    </div>
  );
}

function InlineCreateRow({ depth, type, value, setValue, onCommit, t }) {
  return (
    <div
      style={{
        padding: `4px 10px 4px ${10 + depth * 14}px`,
        display: "flex",
        alignItems: "center",
        gap: 6,
        margin: "0 4px",
      }}
    >
      <span style={{ fontSize: 12 }}>{type === "FOLDER" ? FOLDER_ICON_CLOSED : "📄"}</span>
      <input
        autoFocus
        value={value}
        placeholder={type === "FOLDER" ? "folder name" : "file name.ext"}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit();
          if (e.key === "Escape") setValue("");
        }}
        style={{
          flex: 1,
          background: t.bgDeep,
          border: `1px solid ${t.accent}`,
          borderRadius: 3,
          color: t.textNormal,
          fontSize: 12.5,
          padding: "1px 4px",
        }}
      />
    </div>
  );
}

function ExplorerShell({ t, children, onCreateFile, onCreateFolder, onRefresh }) {
  return (
    <div
      style={{
        width: 240,
        background: t.bgPanel,
        borderRight: `1px solid ${t.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "8px 12px 6px",
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: t.textDim,
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        Explorer
        <div style={{ display: "flex", gap: 4 }}>
          <HeaderIcon title="New File" onClick={onCreateFile} t={t}>📄+</HeaderIcon>
          <HeaderIcon title="New Folder" onClick={onCreateFolder} t={t}>📁+</HeaderIcon>
          <HeaderIcon title="Refresh Explorer" onClick={onRefresh} t={t}>↻</HeaderIcon>
        </div>
      </div>
      {children}
    </div>
  );
}

function HeaderIcon({ children, title, onClick, t }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontSize: 11,
        color: hover ? t.accent : t.muted || t.textDim,
        cursor: "pointer",
        padding: 2,
      }}
    >
      {children}
    </span>
  );
}

function LoadingSkeleton({ t }) {
  const widths = [70, 50, 85, 60, 40, 75, 55];
  return (
    <div style={{ padding: "6px 12px" }}>
      {widths.map((w, i) => (
        <div
          key={i}
          style={{
            height: 12,
            width: `${w}%`,
            marginLeft: i % 3 === 0 ? 0 : 16,
            marginBottom: 8,
            borderRadius: 4,
            background: t.border,
            opacity: 0.6,
            animation: "codehive-skel-pulse 1.1s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes codehive-skel-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

function EmptyMessage({ t, text }) {
  return (
    <div style={{ padding: "16px 14px", fontSize: 11.5, color: t.textDim, textAlign: "center", lineHeight: 1.5 }}>
      {text}
    </div>
  );
}

const DEFAULT_THEME = {
  bgPanel: "#111116",
  bgDeep: "#0b0b0f",
  border: "#232329",
  textNormal: "#e4e4e7",
  textDim: "#8b8b95",
  accent: "#60a5fa",
  accentBg: "rgba(96,165,250,0.12)",
  muted: "#6b6b74",
};
