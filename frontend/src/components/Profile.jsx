import { useNavigate } from "react-router-dom";
import { useGetAllSessionsQuery } from "../redux/SessionApi";
import { useState } from "react";

// ── Icons ─────────────────────────────────────────────────────────────────────
const ArrowLeftIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);
const GlobeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const LockIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const CopyIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ExternalIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const CodeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);
const PowerIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <line x1="12" y1="2" x2="12" y2="12" />
  </svg>
);

// ── Language color map ────────────────────────────────────────────────────────
const LANG_COLORS = {
  javascript: { bg: "rgba(234,179,8,0.15)", text: "#fbbf24" },
  typescript: { bg: "rgba(96,165,250,0.15)", text: "#60a5fa" },
  python: { bg: "rgba(52,211,153,0.15)", text: "#34d399" },
  java: { bg: "rgba(251,146,60,0.15)", text: "#fb923c" },
  cpp: { bg: "rgba(167,139,250,0.15)", text: "#60a5fa" },
  c: { bg: "rgba(167,139,250,0.15)", text: "#60a5fa" },
  go: { bg: "rgba(103,232,249,0.15)", text: "#67e8f9" },
  rust: { bg: "rgba(251,146,60,0.15)", text: "#fb923c" },
  default: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
};
const getLangColor = (lang = "") =>
  LANG_COLORS[lang.toLowerCase()] ?? LANG_COLORS.default;

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 88 }) => {
  const initials = (name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #1d4ed8 0%, #06b6d4 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
        letterSpacing: "0.02em",
        boxShadow:
          "0 0 0 3px rgba(96,165,250,0.25), 0 0 0 6px rgba(96,165,250,0.08)",
      }}
    >
      {initials}
    </div>
  );
};

// ── Stat pill ─────────────────────────────────────────────────────────────────
const StatPill = ({ value, label }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "16px 24px",
      background: "rgba(30,41,59,0.8)",
      border: "1px solid rgba(148,163,184,0.1)",
      borderRadius: "14px",
      minWidth: 80,
    }}
  >
    <span
      style={{ fontSize: 26, fontWeight: 700, color: "#f1f5f9", lineHeight: 1 }}
    >
      {value}
    </span>
    <span
      style={{
        fontSize: 11,
        color: "#64748b",
        marginTop: 6,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  </div>
);

// ── Toggle switch ─────────────────────────────────────────────────────────────
const ToggleSwitch = ({ isActive, onToggle }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isActive ? "Set Inactive" : "Set Active"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px 4px 7px",
        borderRadius: "999px",
        border: "none",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        transition: "background 0.2s, color 0.2s, box-shadow 0.2s",
        background: isActive
          ? hovered
            ? "rgba(239,68,68,0.18)"
            : "rgba(16,185,129,0.12)"
          : hovered
            ? "rgba(16,185,129,0.18)"
            : "rgba(148,163,184,0.1)",
        color: isActive
          ? hovered
            ? "#f87171"
            : "#34d399"
          : hovered
            ? "#34d399"
            : "#64748b",
        boxShadow: hovered
          ? isActive
            ? "0 0 0 1px rgba(239,68,68,0.3)"
            : "0 0 0 1px rgba(16,185,129,0.3)"
          : "none",
      }}
    >
      {/* Track + thumb */}
      <div
        style={{
          width: 28,
          height: 16,
          borderRadius: "999px",
          position: "relative",
          background: isActive ? "#10b981" : "#334155",
          transition: "background 0.22s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: isActive ? 15 : 3,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.22s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </div>
      {isActive
        ? hovered
          ? "Deactivate"
          : "Active"
        : hovered
          ? "Activate"
          : "Inactive"}
    </button>
  );
};

// ── Session card ──────────────────────────────────────────────────────────────
const SessionCard = ({ session, isActive, onToggle, onOpen }) => {
  const [copied, setCopied] = useState(false);
  const colors = getLangColor(session.programmingLanguage);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(session.sessionToken || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      style={{
        background: isActive ? "rgba(15,23,42,0.7)" : "rgba(15,23,42,0.35)",
        border: `1px solid ${isActive ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.05)"}`,
        borderRadius: "18px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.2s, box-shadow 0.2s, opacity 0.2s",
        opacity: isActive ? 1 : 0.55,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (isActive) {
          e.currentTarget.style.borderColor = "rgba(96,165,250,0.4)";
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(37,99,235,0.12)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isActive
          ? "rgba(148,163,184,0.1)"
          : "rgba(148,163,184,0.05)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Inactive watermark stripe */}
      {!isActive && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background:
              "repeating-linear-gradient(90deg, rgba(100,116,139,0.3) 0px, rgba(100,116,139,0.3) 8px, transparent 8px, transparent 16px)",
          }}
        />
      )}

      {/* Header row: language badge + toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: "999px",
            background: isActive ? colors.bg : "rgba(148,163,184,0.08)",
            color: isActive ? colors.text : "#475569",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            transition: "background 0.2s, color 0.2s",
          }}
        >
          <CodeIcon />
          {session.programmingLanguage}
        </span>

        <ToggleSwitch isActive={isActive} onToggle={onToggle} />
      </div>

      {/* Host name */}
      <h3
        style={{
          margin: "0 0 6px",
          fontSize: 17,
          fontWeight: 700,
          lineHeight: 1.3,
          color: isActive ? "#f1f5f9" : "#475569",
          transition: "color 0.2s",
        }}
      >
        {session.hostName || "Unnamed Session"}
      </h3>

      {/* Visibility */}
      <p
        style={{
          margin: "0 0 14px",
          display: "flex",
          alignItems: "center",
          gap: 5,
          color: "#475569",
          fontSize: 13,
        }}
      >
        {session.publicRoom ? <GlobeIcon /> : <LockIcon />}
        <span>{session.publicRoom ? "Public" : "Private"} Room</span>
      </p>

      {/* Token */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(30,41,59,0.6)",
          border: "1px solid rgba(148,163,184,0.08)",
          borderRadius: "10px",
          padding: "9px 12px",
          marginBottom: 18,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "#64748b",
            fontFamily: "monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "85%",
          }}
        >
          {session.sessionToken}
        </span>
        <button
          onClick={handleCopy}
          title="Copy token"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: copied ? "#34d399" : "#475569",
            padding: 2,
            flexShrink: 0,
            display: "flex",
            transition: "color 0.15s",
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>

      {/* Open button — disabled when inactive */}
      <button
        onClick={isActive ? onOpen : undefined}
        disabled={!isActive}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "11px 0",
          borderRadius: "10px",
          border: "none",
          background: isActive
            ? "linear-gradient(90deg, #1d4ed8, #0891b2)"
            : "rgba(30,41,59,0.5)",
          color: isActive ? "#fff" : "#334155",
          fontWeight: 600,
          fontSize: 14,
          cursor: isActive ? "pointer" : "not-allowed",
          transition: "background 0.2s, color 0.2s, opacity 0.15s",
        }}
        onMouseEnter={(e) => {
          if (isActive) e.currentTarget.style.opacity = "0.88";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        {isActive ? (
          <>
            <span>Open Session</span>
            <ExternalIcon />
          </>
        ) : (
          <>
            <PowerIcon />
            <span>Session Inactive</span>
          </>
        )}
      </button>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();

  const username = localStorage.getItem("username") || "Developer";
  const email = localStorage.getItem("email") || "";

  const { data: activeSessions = [] } = useGetAllSessionsQuery();

  // Frontend-only inactive set (stores session IDs marked inactive by user)
  const [inactiveIds, setInactiveIds] = useState(() => {
    try {
      return new Set(
        JSON.parse(localStorage.getItem("inactiveSessionIds") || "[]"),
      );
    } catch {
      return new Set();
    }
  });

  const toggleSessionActive = (id) => {
    setInactiveIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("inactiveSessionIds", JSON.stringify([...next]));
      return next;
    });
  };

  // ── Ownership resolution ──────────────────────────────────────────────────
  const getCurrentUserIdentity = () => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const p = JSON.parse(stored);
        return {
          id: p.id || p._id || p.userId || "",
          username: p.username || p.name || "",
          email: p.email || "",
        };
      }
    } catch {}
    return { id: localStorage.getItem("userId") || "", username, email };
  };

  const currentUser = getCurrentUserIdentity();
  const currentUserDisplayName =
    localStorage.getItem("sessionOwnerName") ||
    username ||
    currentUser.username ||
    "";
  const normalize = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase();

  const createdSessionTokens = (() => {
    try {
      return JSON.parse(localStorage.getItem("createdSessionTokens") || "[]");
    } catch {
      return [];
    }
  })();

  const isOwned = (session) => {
    if (
      createdSessionTokens.some(
        (t) => normalize(t) === normalize(session?.sessionToken),
      )
    )
      return true;
    const userKeys = [
      currentUser.id,
      currentUser.username,
      currentUser.email,
      currentUserDisplayName,
      (currentUser.username || "").split(" ")[0],
    ]
      .map(normalize)
      .filter(Boolean);
    const sessKeys = [
      session?.userId,
      session?.createdBy,
      session?.createdById,
      session?.ownerId,
      session?.hostName,
      session?.host?.name,
      session?.host?.username,
      session?.host?.email,
      session?.user?.id,
      session?.user?.userId,
      session?.user?.username,
      session?.user?.email,
      session?.username,
      session?.email,
    ]
      .map(normalize)
      .filter(Boolean);
    return userKeys.some((v) => sessKeys.includes(v));
  };

  const mySessions = activeSessions.filter(isOwned);
  const activeCount = mySessions.filter((s) => !inactiveIds.has(s.id)).length;
  const totalPublic = mySessions.filter((s) => s.publicRoom).length;
  const languages = new Set(mySessions.map((s) => s.programmingLanguage)).size;
  const memberSince = (() => {
    try {
      return new Date(
        JSON.parse(localStorage.getItem("user"))?.createdAt,
      ).getFullYear();
    } catch {
      return null;
    }
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020817",
        color: "#f1f5f9",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          borderBottom: "1px solid rgba(148,163,184,0.08)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(2,8,23,0.9)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(148,163,184,0.15)",
            background: "transparent",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#f1f5f9";
            e.currentTarget.style.borderColor = "rgba(148,163,184,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.borderColor = "rgba(148,163,184,0.15)";
          }}
        >
          <ArrowLeftIcon /> Dashboard
        </button>
        <span style={{ color: "rgba(148,163,184,0.3)", fontSize: 13 }}>/</span>
        <span style={{ color: "#64748b", fontSize: 13 }}>Profile</span>
      </div>

      <div
        style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}
      >
        {/* Profile hero */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 28,
            marginBottom: 40,
            flexWrap: "wrap",
          }}
        >
          <Avatar name={username} size={88} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1
              style={{
                margin: "0 0 4px",
                fontSize: 26,
                fontWeight: 700,
                color: "#f8fafc",
                lineHeight: 1.2,
              }}
            >
              {username}
            </h1>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#64748b" }}>
              {email}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
             
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  fontSize: 12,
                  color: "#34d399",
                }}
              >
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Stats — active count updates live */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 48,
          }}
        >
          <StatPill value={mySessions.length} label="Sessions" />
          <StatPill value={activeCount} label="Active" />
          <StatPill value={mySessions.length - activeCount} label="Inactive" />
          <StatPill value={totalPublic} label="Public" />
          <StatPill value={languages} label="Languages" />
        </div>

        {/* Sessions header */}
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "#f1f5f9",
              }}
            >
              My Sessions
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              {mySessions.length === 0
                ? "No sessions yet"
                : `${activeCount} active · ${mySessions.length - activeCount} inactive`}
            </p>
          </div>

          {/* Legend */}
          {mySessions.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontSize: 12,
                color: "#475569",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#10b981",
                    display: "inline-block",
                  }}
                />{" "}
                Active
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#334155",
                    display: "inline-block",
                  }}
                />{" "}
                Inactive
              </span>
            </div>
          )}
        </div>

        {/* Session cards */}
        {mySessions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "64px 24px",
              border: "1px dashed rgba(148,163,184,0.15)",
              borderRadius: "20px",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>⌨️</div>
            <p
              style={{
                margin: "0 0 6px",
                fontWeight: 600,
                fontSize: 15,
                color: "#64748b",
              }}
            >
              No sessions yet
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              Head to the dashboard and create your first coding session.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 18,
            }}
          >
            {mySessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isActive={!inactiveIds.has(session.id)}
                onToggle={() => toggleSessionActive(session.id)}
                onOpen={() =>
                  navigate(`/editor/${session.programmingLanguage}`)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
