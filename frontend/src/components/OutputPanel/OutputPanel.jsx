import React, { useEffect, useMemo, useRef, useState } from "react";
import { ansiToSpans, stripAnsi } from "./ansi";

/**
 * FEATURE 2 — Professional Output Panel.
 *
 * A VS Code-style multi-tab terminal area:
 *   Output | Console | Terminal | Problems | Debug | Logs
 *
 * Props:
 *  - entries: [{ id, tab, kind, text, timestamp }]
 *      tab:  "Output" | "Console" | "Terminal" | "Debug" | "Logs"
 *      kind: "compile" | "runtime" | "error" | "success" | "info" | "prompt"
 *  - problems: [{ id, severity, message, line, file }]
 *  - execMeta: { exitCode, durationMs, memoryUsageKb, timedOut, running }
 *  - onClear(tab): called when the user clears the active tab
 *  - onClose(): called when the panel's ✕ is clicked
 *  - theme: color tokens object (same shape as Editor.jsx's `t`)
 */
export default function OutputPanel({
  entries = [],
  problems = [],
  execMeta = {},
  onClear,
  onClose,
  onExplain,
  explaining = false,
  theme,
  defaultTab = "Output",
  height = 220,
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef(null);

  const t = theme || DEFAULT_THEME;

  const tabs = useMemo(
    () => [
      { id: "Output", badge: 0 },
      { id: "Console", badge: 0 },
      { id: "Terminal", badge: 0 },
      { id: "Problems", badge: problems.length },
      { id: "Debug", badge: 0 },
      { id: "Logs", badge: 0 },
    ],
    [problems.length]
  );

  const visibleEntries = useMemo(
    () => entries.filter((e) => e.tab === activeTab),
    [entries, activeTab]
  );

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleEntries, autoScroll, activeTab]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setAutoScroll(atBottom);
  };

  const downloadLogs = () => {
    const source = activeTab === "Problems"
      ? problems.map((p) => `[${p.severity}] ${p.file || ""}:${p.line ?? ""} ${p.message}`).join("\n")
      : entries.map((e) => `[${e.tab}] ${stripAnsi(e.text)}`).join("\n");
    const blob = new Blob([source], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codehive-${activeTab.toLowerCase()}-${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        height,
        background: t.bgDeep,
        borderTop: `1px solid ${t.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          height: 34,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          borderBottom: `1px solid ${t.border}`,
          gap: 2,
          background: t.bgPanel,
          flexShrink: 0,
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "5px 12px",
              borderRadius: "4px 4px 0 0",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: activeTab === tab.id ? t.textNormal : t.textDim,
              background: activeTab === tab.id ? t.bgDeep : "transparent",
              borderBottom: activeTab === tab.id ? `2px solid ${t.accent}` : "2px solid transparent",
              transition: "color 120ms ease, background 120ms ease",
            }}
          >
            {tab.id}
            {tab.badge > 0 && (
              <span
                style={{
                  fontSize: 10,
                  background: tab.id === "Problems" ? "#f87171" : t.accent,
                  color: "#0b0b0f",
                  borderRadius: 999,
                  padding: "0 5px",
                  minWidth: 14,
                  textAlign: "center",
                  lineHeight: "14px",
                }}
              >
                {tab.badge}
              </span>
            )}
          </div>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {execMeta.running && (
            <span style={{ fontSize: 11, color: t.accent, display: "flex", alignItems: "center", gap: 5 }}>
              <Spinner color={t.accent} /> Running…
            </span>
          )}
          {!execMeta.running && execMeta.exitCode !== undefined && execMeta.exitCode !== null && (
            <span
              style={{
                fontSize: 11,
                color: execMeta.exitCode === 0 ? t.successText : "#f87171",
                fontFamily: "Menlo, monospace",
              }}
              title="Process exit code"
            >
              exit {execMeta.exitCode}
            </span>
          )}
          {execMeta.durationMs != null && (
            <span style={{ fontSize: 11, color: t.textDim, fontFamily: "Menlo, monospace" }} title="Execution time">
              {formatDuration(execMeta.durationMs)}
            </span>
          )}
          {execMeta.memoryUsageKb != null && (
            <span style={{ fontSize: 11, color: t.textDim, fontFamily: "Menlo, monospace" }} title="Peak memory usage">
              {formatMemory(execMeta.memoryUsageKb)}
            </span>
          )}

          <IconButton title="Toggle auto-scroll" active={autoScroll} onClick={() => setAutoScroll((v) => !v)} t={t}>
            ⇩
          </IconButton>
          <IconButton title="Download logs" onClick={downloadLogs} t={t}>
            ⭳
          </IconButton>
          <IconButton title="Clear" onClick={() => onClear && onClear(activeTab)} t={t}>
            ⌫
          </IconButton>
          <IconButton title="Close panel" onClick={onClose} t={t}>
            ✕
          </IconButton>
        </div>
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          padding: "8px 14px",
          fontFamily: "Menlo, Consolas, monospace",
          fontSize: 12,
          lineHeight: 1.65,
          overflowY: "auto",
          color: t.textNormal,
        }}
      >
        {activeTab === "Problems" ? (
          <ProblemsList problems={problems} t={t} onExplain={onExplain} explaining={explaining} />
        ) : visibleEntries.length === 0 ? (
          <EmptyState tab={activeTab} t={t} />
        ) : (
          visibleEntries.map((line) => (
            <OutputLine key={line.id} line={line} t={t} onExplain={onExplain} explaining={explaining} />
          ))
        )}
      </div>
    </div>
  );
}

function OutputLine({ line, t, onExplain, explaining }) {
  const colorFor = {
    error: "#f87171",
    success: t.successText,
    compile: t.accent,
    runtime: t.textNormal,
    info: t.textDim,
    prompt: t.textNormal,
    ai: "#c084fc",
  }[line.kind] || t.textDim;

  if (line.kind === "prompt") {
    return (
      <div>
        <span style={{ color: t.accent }}>❯</span>{" "}
        <span style={{ color: t.textNormal }}>{line.text}</span>
      </div>
    );
  }

  const isError = line.kind === "error";

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <div style={{ color: colorFor, whiteSpace: "pre-wrap", wordBreak: "break-word", flex: 1 }}>
        {ansiToSpans(line.text, colorFor).map((s, si) => (
          <span key={si} style={s.style}>{s.text}</span>
        ))}
      </div>
      {isError && onExplain && (
        <ExplainButton onClick={() => onExplain(line.text)} explaining={explaining} t={t} />
      )}
    </div>
  );
}

function ExplainButton({ onClick, explaining, t }) {
  return (
    <button
      onClick={onClick}
      disabled={explaining}
      title="Explain this error with AI"
      style={{
        flexShrink: 0,
        border: `1px solid #c084fc55`,
        background: "rgba(192,132,252,0.1)",
        color: "#c084fc",
        borderRadius: 4,
        padding: "1px 7px",
        fontSize: 10.5,
        cursor: explaining ? "default" : "pointer",
        opacity: explaining ? 0.6 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {explaining ? "Explaining…" : "✨ Explain"}
    </button>
  );
}

function ProblemsList({ problems, t, onExplain, explaining }) {
  if (problems.length === 0) {
    return <EmptyState tab="Problems" t={t} />;
  }
  return (
    <div>
      {problems.map((p) => (
        <div
          key={p.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "3px 0",
            cursor: "default",
          }}
        >
          <span style={{ color: p.severity === "error" ? "#f87171" : "#facc15" }}>
            {p.severity === "error" ? "✕" : "⚠"}
          </span>
          <span style={{ color: t.textNormal, flex: 1 }}>{p.message}</span>
          {p.line != null && (
            <span style={{ color: t.textDim, fontFamily: "Menlo, monospace" }}>
              {p.file ? `${p.file}:` : ""}{p.line}
            </span>
          )}
          {p.severity === "error" && onExplain && (
            <ExplainButton
              onClick={() => onExplain(`${p.message}${p.line != null ? ` (line ${p.line})` : ""}`)}
              explaining={explaining}
              t={t}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab, t }) {
  const copy = {
    Output: "No output yet — run your code to see compile and program output here.",
    Console: "Console is empty.",
    Terminal: "No terminal activity yet.",
    Problems: "No problems detected in this workspace.",
    Debug: "Not currently debugging. Start a debug session to see output here.",
    Logs: "No logs recorded yet.",
  }[tab] || "Nothing to show yet.";
  return (
    <div style={{ color: t.textDim, fontStyle: "italic", padding: "10px 2px" }}>
      {copy}
    </div>
  );
}

function IconButton({ children, title, onClick, active, t }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: "none",
        background: hover ? t.accentBg : "transparent",
        color: active ? t.accent : t.textDim,
        borderRadius: 4,
        width: 22,
        height: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 12,
        transition: "background 120ms ease",
      }}
    >
      {children}
    </button>
  );
}

function Spinner({ color }) {
  return (
    <span
      style={{
        width: 9,
        height: 9,
        borderRadius: "50%",
        border: `1.5px solid ${color}55`,
        borderTopColor: color,
        display: "inline-block",
        animation: "codehive-spin 700ms linear infinite",
      }}
    >
      <style>{`@keyframes codehive-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatMemory(kb) {
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
}

const DEFAULT_THEME = {
  bgDeep: "#0b0b0f",
  bgPanel: "#111116",
  border: "#232329",
  textNormal: "#e4e4e7",
  textDim: "#8b8b95",
  accent: "#60a5fa",
  accentBg: "rgba(96,165,250,0.12)",
  successText: "#4ade80",
};
