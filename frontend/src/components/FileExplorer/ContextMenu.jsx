import React, { useEffect, useRef } from "react";

/**
 * Reusable right-click / kebab context menu.
 *
 * Props:
 *  - x, y: viewport position to anchor at
 *  - items: [{ label, icon, danger, disabled, onClick }] | "divider"
 *  - onClose(): called on outside click, Escape, or after an item fires
 *  - theme: color tokens (same shape as Editor.jsx's `t`)
 */
export default function ContextMenu({ x, y, items, onClose, theme }) {
  const ref = useRef(null);
  const t = theme || DEFAULT_THEME;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick, true);
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("mousedown", handleClick, true);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [onClose]);

  // Clamp so the menu never renders off-screen.
  const width = 210;
  const estHeight = items.filter((i) => i !== "divider").length * 28 + 12;
  const left = Math.min(x, window.innerWidth - width - 8);
  const top = Math.min(y, window.innerHeight - estHeight - 8);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top,
        left,
        width,
        background: t.bgPanel,
        border: `1px solid ${t.border}`,
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        padding: "4px 0",
        zIndex: 1000,
        fontSize: 12.5,
        animation: "codehive-ctxmenu-in 90ms ease-out",
      }}
    >
      <style>{`
        @keyframes codehive-ctxmenu-in {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {items.map((item, i) =>
        item === "divider" ? (
          <div key={`d-${i}`} style={{ height: 1, background: t.border, margin: "4px 0" }} />
        ) : (
          <MenuItem
            key={item.label}
            item={item}
            t={t}
            onClick={() => {
              if (item.disabled) return;
              item.onClick && item.onClick();
              onClose();
            }}
          />
        )
      )}
    </div>
  );
}

function MenuItem({ item, t, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "6px 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: item.disabled ? "not-allowed" : "pointer",
        opacity: item.disabled ? 0.4 : 1,
        color: item.danger ? "#f87171" : t.textNormal,
        background: hover && !item.disabled ? t.accentBg : "transparent",
      }}
    >
      {item.icon && <span style={{ width: 14, textAlign: "center" }}>{item.icon}</span>}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.shortcut && (
        <span style={{ color: t.textDim, fontSize: 11 }}>{item.shortcut}</span>
      )}
    </div>
  );
}

const DEFAULT_THEME = {
  bgPanel: "#111116",
  border: "#232329",
  textNormal: "#e4e4e7",
  textDim: "#8b8b95",
  accentBg: "rgba(96,165,250,0.12)",
};
