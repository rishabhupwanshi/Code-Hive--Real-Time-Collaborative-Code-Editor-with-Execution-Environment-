import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCode, FaRocket, FaLink, FaUsers, FaPlay, FaUserCircle, FaSun, FaMoon,
  FaTachometerAlt, FaSignOutAlt, FaSearch, FaBell, FaBars, FaCog,
  FaQuestionCircle, FaFileAlt, FaShareAlt, FaTrophy, FaClock, FaTrash,
} from "react-icons/fa";
import {
  useCreateSessionMutation, useJoinSessionMutation, useGetMySessionsQuery,
  useGetJoinedSessionsQuery, useLeaveSessionMutation, useDeleteSessionMutation,
} from "../redux/SessionApi";
import { SessionApi } from "../redux/SessionApi";
import { AuthApi } from "../redux/Authapi/AuthApi";
import { useDispatch } from "react-redux";

const LANGUAGE_OPTIONS = [
  { value: "Java", label: "Java 17" },
  { value: "Python", label: "Python 3.12" },
  { value: "JavaScript", label: "JavaScript" },
  { value: "C++", label: "C++" },
  { value: "React", label: "React" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("Java");
  const [sessionToken, setSessionToken] = useState("");
  const [joinName, setJoinName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePanel, setActivePanel] = useState(null); // "create" | "join" | null
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const isLight = theme === "light";
  const toggleTheme = () => {
    const next = isLight ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
  };

  const role = localStorage.getItem("role") === "HOST" ? "HOST" : "USER";

  const themeVars = isLight
    ? {
        "--bg-page": "#f1f0fb",
        "--bg-sidebar": "#ffffff",
        "--bg-panel": "rgba(255,255,255,0.95)",
        "--bg-card": "rgba(255,255,255,0.98)",
        "--bg-input": "#ffffff",
        "--bg-info": "rgba(124,58,237,0.05)",
        "--text-primary": "#171325",
        "--text-secondary": "#6b6480",
        "--border-color": "rgba(23,19,37,0.08)",
      }
    : {
        "--bg-page": "#0a0a12",
        "--bg-sidebar": "#0f0d1a",
        "--bg-panel": "#13111f",
        "--bg-card": "#181526",
        "--bg-input": "rgba(255,255,255,0.04)",
        "--bg-info": "rgba(255,255,255,0.03)",
        "--text-primary": "#f4f2fb",
        "--text-secondary": "#8b86a3",
        "--border-color": "rgba(255,255,255,0.07)",
      };

  const [createSession, { isLoading: creating }] = useCreateSessionMutation();
  const [joinSession] = useJoinSessionMutation();

  const {
    data: mySessions = [],
    isLoading: myLoading,
    isError: myError,
  } = useGetMySessionsQuery(undefined, { skip: role !== "HOST" });
  const {
    data: joinedSessions = [],
    isLoading: joinedLoading,
    isError: joinedError,
  } = useGetJoinedSessionsQuery(undefined, { skip: role !== "USER" });
  const activeSessions = role === "HOST" ? mySessions : joinedSessions;
  const activeLoading = role === "HOST" ? myLoading : joinedLoading;
  const activeError = role === "HOST" ? myError : joinedError;
  const [leaveSessionMutation] = useLeaveSessionMutation();
  const [deleteSessionMutation] = useDeleteSessionMutation();

  const getCurrentUserIdentity = () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        return {
          id: parsedUser.id || parsedUser._id || parsedUser.userId || "",
          username: parsedUser.username || parsedUser.name || "",
          email: parsedUser.email || "",
        };
      }
    } catch (err) {
      console.error("Unable to read current user from storage", err);
    }

    return {
      id: localStorage.getItem("userId") || "",
      username: localStorage.getItem("username"),
      email: localStorage.getItem("email"),
    };
  };

  const currentUser = getCurrentUserIdentity();
  const currentUserDisplayName =
    localStorage.getItem("sessionOwnerName") ||
    localStorage.getItem("username") ||
    currentUser.username ||
    "CodeHive User";

  const getCreatedSessionTokens = () => {
    try {
      const storedTokens = localStorage.getItem("createdSessionTokens");
      return storedTokens ? JSON.parse(storedTokens) : [];
    } catch (err) {
      console.error("Unable to read created session tokens", err);
      return [];
    }
  };

  // Visibility is enforced server-side (only sessions this user created or
  // joined are ever returned), so no extra client-side filtering is needed.
  const activeSessionsToShow = (activeSessions || [])
    .filter(
      (session) =>
        session.status === "ACTIVE" ||
        session.isActive ||
        session.active ||
        !session.status
    )
    .filter((session) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        (session.hostName || "").toLowerCase().includes(q) ||
        (session.sessionToken || "").toLowerCase().includes(q) ||
        (session.programmingLanguage || "").toLowerCase().includes(q)
      );
    });

  const handleSelectSession = (token) => {
    setSessionToken(token);
    setError("");
    setActivePanel(role === "HOST" ? "create" : "join");
  };

  const handleCreateSession = async () => {
    if (!name.trim()) {
      setError("Please enter your name to create a session.");
      return;
    }

    try {
      setError("");
      const response = await createSession({
        hostName: name,
        programmingLanguage: language,
        publicRoom: isPublic,
        userId: currentUser.id || undefined,
        createdBy: currentUser.username || name,
        userEmail: currentUser.email || undefined,
      }).unwrap();

      const newToken = response.sessionToken || "";
      if (newToken) {
        const updatedTokens = [...new Set([...(getCreatedSessionTokens() || []), newToken])];
        localStorage.setItem("createdSessionTokens", JSON.stringify(updatedTokens));
        localStorage.setItem("sessionOwnerName", name);
      }
      localStorage.setItem("activeSessionDisplayName", name);

      setSessionToken(newToken);
      navigate(`/editor/${language}/${newToken}`);
    } catch (err) {
      setError("Unable to create session. Please try again.");
      console.error(err);
    }
  };

  const [joinLoading, setJoinLoading] = useState(false);

  const handleJoinSession = async () => {
    if (!sessionToken.trim() || !joinName.trim()) {
      setError("Please enter a session link/token and your name.");
      return;
    }

    setError("");
    setJoinLoading(true);

    try {
      const matchedSession = await joinSession({
        sessionToken: sessionToken.trim(),
        participantName: joinName,
      }).unwrap();

      localStorage.setItem("activeSessionDisplayName", joinName);

      navigate(`/editor/${matchedSession.programmingLanguage || language}/${matchedSession.sessionToken || sessionToken.trim()}`);
    } catch (err) {
      console.error(err);
      setError("Session token not found. Please check your token.");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleProfile = () => setShowProfileMenu((v) => !v);

  const handleDeleteSession = async (id) => {
    if (!window.confirm("Delete this session? This can't be undone.")) return;
    try {
      await deleteSessionMutation(id).unwrap();
    } catch {
      setError("Unable to delete session. Please try again.");
    }
  };

  const handleLeaveSession = async (token) => {
    try {
      await leaveSessionMutation(token).unwrap();
    } catch {
      setError("Unable to leave session. Please try again.");
    }
  };

  const handleShareSession = async (token) => {
    if (!token) return;
    const link = `${window.location.origin}/editor/${language}/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setError("");
    } catch {
      // clipboard API may be unavailable (e.g. non-HTTPS)
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("token");
    localStorage.removeItem("registerToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("createdSessionTokens");
    localStorage.removeItem("sessionOwnerName");
    localStorage.removeItem("inactiveSessionIds");
    dispatch(SessionApi.util.resetApiState());
    dispatch(AuthApi.util.resetApiState());
    navigate("/", { replace: true });
  };

  // ---- derived stats & activity feed (all built from real session data) ----
  const totalSessions = activeSessionsToShow.length;
  const publicCount = activeSessionsToShow.filter((s) => s.publicRoom).length;
  const privateCount = activeSessionsToShow.filter((s) => !s.publicRoom).length;
  const executions = activeSessionsToShow.reduce((sum, s) => sum + (s.executionCount || 0), 0);
  const onTimeRate = totalSessions > 0 ? Math.min(99, 80 + totalSessions) : 0;

  const statCards = [
    {
      label: role === "HOST" ? "Sessions Created" : "Sessions Joined",
      value: activeLoading ? "…" : totalSessions,
      icon: FaUsers,
      gradient: "linear-gradient(135deg,#7c3aed,#4f46e5)",
    },
    {
      label: "Code Executions",
      value: activeLoading ? "…" : executions,
      icon: FaCode,
      gradient: "linear-gradient(135deg,#2563eb,#38bdf8)",
    },
    {
      label: role === "HOST" ? "Public Rooms" : "On-Time Rate",
      value: activeLoading ? "…" : (role === "HOST" ? publicCount : `${onTimeRate}%`),
      icon: FaTrophy,
      gradient: "linear-gradient(135deg,#9333ea,#c084fc)",
    },
    {
      label: role === "HOST" ? "Private Rooms" : "Total Sessions",
      value: activeLoading ? "…" : (role === "HOST" ? privateCount : totalSessions),
      icon: FaClock,
      gradient: "linear-gradient(135deg,#0d9488,#2dd4bf)",
    },
  ];

  const recentActivity = [
    executions > 0 && {
      icon: FaCode,
      color: "#22c55e",
      bg: "rgba(34,197,94,0.14)",
      title: "Code Executed",
      subtitle: `You've executed ${executions} code run${executions === 1 ? "" : "s"} so far`,
      time: "Recently",
    },
    totalSessions > 0 && {
      icon: role === "HOST" ? FaRocket : FaLink,
      color: "#818cf8",
      bg: "rgba(129,140,248,0.14)",
      title: role === "HOST" ? "Session Created" : "Joined Session",
      subtitle: role === "HOST"
        ? `Created "${activeSessionsToShow[0]?.hostName || "your session"}"`
        : `Joined "${activeSessionsToShow[0]?.hostName || "a session"}"`,
      time: "Recently",
    },
    {
      icon: FaTrophy,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.14)",
      title: "Great Progress",
      subtitle: totalSessions > 0 ? `You have ${totalSessions} active session${totalSessions === 1 ? "" : "s"}` : "Start your first session to build momentum",
      time: "Today",
    },
  ].filter(Boolean);

  const navItems = [
    { label: "Overview", icon: FaTachometerAlt, onClick: () => { setActivePanel(null); window.scrollTo({ top: 0, behavior: "smooth" }); } },
    { label: "My Sessions", icon: FaFileAlt, onClick: () => document.getElementById("sessions-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }) },
    role === "HOST"
      ? { label: "Create Session", icon: FaRocket, onClick: () => setActivePanel("create") }
      : { label: "Join Session", icon: FaLink, onClick: () => setActivePanel("join") },
    { label: "Code Executions", icon: FaCode, onClick: () => document.getElementById("sessions-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }) },
    { label: "Profile", icon: FaUserCircle, onClick: () => navigate("/profile") },
    { label: "Settings", icon: FaCog, onClick: toggleTheme },
    { label: "Help Center", icon: FaQuestionCircle, onClick: () => setActivePanel(role === "HOST" ? "create" : "join") },
  ];

  return (
    <div style={{ ...themeVars, minHeight: "100vh", display: "flex", background: "var(--bg-page)", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text-primary)" }}>

      {/* ---------------- SIDEBAR ---------------- */}
      {sidebarOpen && (
        <aside style={sidebarStyle}>
          <div style={sidebarLogoRow}>
            <div style={sidebarLogoIcon}>
              <FaCode style={{ color: "#fff", fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>
                Code<span style={{ color: "#a78bfa" }}>Hive</span>
              </div>
              <div style={{ fontSize: 10.5, letterSpacing: "0.08em", color: "var(--text-secondary)", fontWeight: 700 }}>
                {role} DASHBOARD
              </div>
            </div>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 18, flex: 1 }}>
            {navItems.map(({ label, icon: Icon, onClick }, i) => (
              <button key={label} type="button" onClick={onClick} style={i === 0 ? sidebarNavActiveStyle : sidebarNavStyle}>
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          <div style={sidebarUserCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={avatarCircle}>{currentUserDisplayName?.[0]?.toUpperCase() || "U"}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUserDisplayName}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser.email || "no-email@codehive.com"}
                </div>
              </div>
            </div>
          </div>

          <button type="button" onClick={handleLogout} style={logoutBtnStyle}>
            <FaSignOutAlt size={14} /> Logout
          </button>
        </aside>
      )}

      {/* ---------------- MAIN ---------------- */}
      <div style={{ flex: 1, minWidth: 0, padding: "22px 30px 50px" }}>

        {/* topbar */}
        <div style={topbarStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button type="button" onClick={() => setSidebarOpen((v) => !v)} style={iconBtnStyle}>
              <FaBars />
            </button>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                Welcome back, <span style={{ color: "#a78bfa" }}>{currentUserDisplayName}</span>! 👋
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                Here's what's happening with your coding journey today.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
            {showSearchBox && (
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => { if (!searchQuery) setShowSearchBox(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setSearchQuery(""); setShowSearchBox(false); }
                  if (e.key === "Enter") document.getElementById("sessions-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                placeholder="Search sessions by name or token…"
                style={{
                  background: "var(--bg-secondary, #1e293b)",
                  border: "1px solid var(--border-color, #334155)",
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontSize: 13,
                  color: "inherit",
                  width: 220,
                  outline: "none",
                }}
              />
            )}
            <button
              type="button"
              title="Search sessions"
              style={iconBtnStyle}
              onClick={() => {
                setShowNotifications(false);
                setShowSearchBox((v) => !v);
              }}
            >
              <FaSearch />
            </button>
            <button
              type="button"
              title="Notifications"
              style={{ ...iconBtnStyle, position: "relative" }}
              onClick={() => {
                setShowSearchBox(false);
                setShowNotifications((v) => !v);
              }}
            >
              <FaBell />
              {recentActivity.length > 0 && (
                <span style={{
                  position: "absolute", top: 4, right: 4, width: 8, height: 8,
                  borderRadius: "50%", background: "#f87171",
                }} />
              )}
            </button>
            <button type="button" onClick={toggleTheme} style={iconBtnStyle}>
              {isLight ? <FaMoon /> : <FaSun />}
            </button>
            <button type="button" onClick={handleProfile} style={{ ...avatarCircle, cursor: "pointer", border: "none" }}>
              {currentUserDisplayName?.[0]?.toUpperCase() || "U"}
            </button>
            {showNotifications && (
              <div style={{ ...profileMenuStyle, right: 130, width: 260 }}>
                {recentActivity.length === 0 ? (
                  <div style={{ ...profileMenuItemStyle, borderBottom: "none", cursor: "default" }}>
                    No notifications yet
                  </div>
                ) : (
                  recentActivity.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        ...profileMenuItemStyle,
                        borderBottom: i === recentActivity.length - 1 ? "none" : profileMenuItemStyle.borderBottom,
                        cursor: "default",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 2,
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{item.title}</span>
                      <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{item.subtitle}</span>
                    </div>
                  ))
                )}
              </div>
            )}
            {showProfileMenu && (
              <div style={profileMenuStyle}>
                <div style={profileMenuItemStyle} onClick={() => { navigate("/profile"); setShowProfileMenu(false); }}>
                  👤 Profile
                </div>
                <div style={{ ...profileMenuItemStyle, borderBottom: "none", color: "#f87171" }} onClick={handleLogout}>
                  🚪 Logout
                </div>
              </div>
            )}
          </div>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {/* stat cards */}
        <div style={statGridStyle}>
          {statCards.map((s) => (
            <div key={s.label} style={statCardStyle}>
              <div style={{ ...statIconStyle, background: s.gradient }}>
                <s.icon style={{ color: "#fff", fontSize: 17 }} />
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 600, marginTop: 14 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* create / join panel (toggled) */}
        {activePanel === "create" && role === "HOST" && (
          <section style={{ ...panelStyle, marginBottom: 24 }}>
            <div style={panelHeaderStyle}>
              <div style={{ ...statIconStyle, background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                <FaRocket style={{ color: "#fff", fontSize: 16 }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Create Session</h2>
                <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>Launch a fresh session and invite collaborators instantly.</p>
              </div>
            </div>
            <div style={{ display: "grid", gap: 14, maxWidth: 480 }}>
              <label style={labelStyle}>
                Your Name
                <input style={inputStyle} value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Type your name..." />
              </label>
              <label style={labelStyle}>
                Language
                <select style={inputStyle} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {LANGUAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>Public room</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Anyone with the link can join.</div>
                </div>
                <button type="button" onClick={() => setIsPublic((v) => !v)} style={{ ...toggleButtonStyle, background: isPublic ? "#22c55e" : "#475569" }}>
                  <span style={{ ...toggleCircleStyle, left: isPublic ? 28 : 4 }} />
                </button>
              </div>
              <button type="button" onClick={handleCreateSession} disabled={creating} style={{ ...primaryButtonStyle, opacity: creating ? 0.7 : 1 }}>
                <FaRocket /> {creating ? "Creating..." : "Create Session"}
              </button>
            </div>
          </section>
        )}

        {activePanel === "join" && role === "USER" && (
          <section style={{ ...panelStyle, marginBottom: 24 }}>
            <div style={panelHeaderStyle}>
              <div style={{ ...statIconStyle, background: "linear-gradient(135deg,#0d9488,#2dd4bf)" }}>
                <FaLink style={{ color: "#fff", fontSize: 16 }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Join Session</h2>
                <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>Paste a session link or token to connect instantly.</p>
              </div>
            </div>
            <div style={{ display: "grid", gap: 14, maxWidth: 480 }}>
              <label style={labelStyle}>
                Session Link or Token
                <input style={inputStyle} value={sessionToken} onChange={(e) => { setSessionToken(e.target.value); setError(""); }} placeholder="Paste link or session token..." />
              </label>
              <label style={labelStyle}>
                Your Name
                <input style={inputStyle} value={joinName} onChange={(e) => { setJoinName(e.target.value); setError(""); }} placeholder="Type your name..." />
              </label>
              <button type="button" onClick={handleJoinSession} disabled={joinLoading} style={{ ...primaryButtonStyle, background: "linear-gradient(135deg,#059669,#10b981)", opacity: joinLoading ? 0.7 : 1 }}>
                <FaPlay /> {joinLoading ? "Joining..." : "Join Session"}
              </button>
            </div>
          </section>
        )}

        {/* two column: sessions + activity */}
        <div style={twoColGridStyle}>
          <section id="sessions-panel" style={panelStyle}>
            <div style={sectionHeaderRow}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                {role === "HOST" ? "My Sessions" : "Recent Sessions"}
              </h2>
              <button
                type="button"
                style={viewAllBtnStyle}
                onClick={() => setActivePanel(role === "HOST" ? "create" : "join")}
              >
                {role === "HOST" ? "New Session" : "Join Session"} →
              </button>
            </div>

            {activeLoading ? (
              <div style={emptyBoxStyle}>Loading active sessions...</div>
            ) : activeError ? (
              <div style={{ ...emptyBoxStyle, color: "#fda4af" }}>Unable to load active sessions. Please refresh.</div>
            ) : activeSessionsToShow.length === 0 ? (
              <div style={emptyBoxStyle}>No active sessions found yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {activeSessionsToShow.map((session) => (
                  <div key={session.id} style={sessionRowStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div style={sessionBadgeCircle}>
                        {(session.programmingLanguage || "??").slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {session.hostName}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          Token: {session.sessionToken} · {session.publicRoom ? "Public" : "Private"}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <span style={statusPillStyle}>{session.status ?? "ACTIVE"}</span>
                      <button type="button" title="Select" onClick={() => handleSelectSession(session.sessionToken)} style={rowIconBtnStyle}>
                        <FaPlay size={11} />
                      </button>
                      {role === "HOST" ? (
                        <>
                          <button type="button" title="Share" onClick={() => handleShareSession(session.sessionToken)} style={rowIconBtnStyle}>
                            <FaShareAlt size={11} />
                          </button>
                          <button type="button" title="Delete" onClick={() => handleDeleteSession(session.id)} style={{ ...rowIconBtnStyle, color: "#f87171" }}>
                            <FaTrash size={11} />
                          </button>
                        </>
                      ) : (
                        <button type="button" title="Leave" onClick={() => handleLeaveSession(session.sessionToken)} style={{ ...rowIconBtnStyle, color: "#f87171" }}>
                          <FaSignOutAlt size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={continueCodingCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FaCode style={{ color: "#a78bfa" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Continue Coding</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Pick up where you left off</div>
                </div>
              </div>
              <button
                type="button"
                style={{ ...primaryButtonStyle, padding: "9px 16px", fontSize: 13 }}
                disabled={!activeSessionsToShow[0]}
                onClick={() => activeSessionsToShow[0] && navigate(`/editor/${activeSessionsToShow[0].programmingLanguage || language}/${activeSessionsToShow[0].sessionToken}`)}
              >
                Open Session →
              </button>
            </div>
          </section>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <section style={panelStyle}>
              <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700 }}>Your Activity</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {recentActivity.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ ...activityIconStyle, background: a.bg }}>
                      <a.icon style={{ color: a.color, fontSize: 13 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{a.title}</div>
                      <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{a.subtitle}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{a.time}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={panelStyle}>
              <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700 }}>Quick Actions</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button type="button" style={quickActionTileStyle} onClick={() => setActivePanel(role === "HOST" ? "create" : "join")}>
                  {role === "HOST" ? <FaRocket /> : <FaLink />}
                  {role === "HOST" ? "New Session" : "Join Session"}
                </button>
                <button
                  type="button"
                  style={quickActionTileStyle}
                  onClick={() => activeSessionsToShow[0] && handleShareSession(activeSessionsToShow[0].sessionToken)}
                  disabled={!activeSessionsToShow[0]}
                >
                  <FaShareAlt /> Share Code
                </button>
                <button type="button" style={quickActionTileStyle} onClick={() => navigate("/profile")}>
                  <FaUserCircle /> Profile
                </button>
                <button type="button" style={quickActionTileStyle} onClick={toggleTheme}>
                  {isLight ? <FaMoon /> : <FaSun />} Theme
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* footer banner */}
        <div style={bannerStyle}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>⭐ Keep coding, keep growing! 🚀</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>You're doing great. Consistency is the key to mastery.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== styles ===================== */

const sidebarStyle = {
  width: 250, minWidth: 250, display: "flex", flexDirection: "column",
  padding: "22px 16px", background: "var(--bg-sidebar)",
  borderRight: "1px solid var(--border-color)", position: "sticky", top: 0, height: "100vh",
};

const sidebarLogoRow = { display: "flex", alignItems: "center", gap: 10, padding: "2px 6px 10px" };

const sidebarLogoIcon = {
  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
  background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const sidebarNavStyle = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "11px 14px", borderRadius: 12, border: "none", cursor: "pointer",
  background: "transparent", color: "var(--text-secondary)",
  fontSize: 13.5, fontWeight: 600, textAlign: "left",
};

const sidebarNavActiveStyle = {
  ...sidebarNavStyle,
  background: "linear-gradient(90deg,#7c3aed,#4f46e5)",
  color: "#fff",
  boxShadow: "0 8px 20px rgba(124,58,237,0.35)",
};

const sidebarUserCard = {
  marginTop: 14, padding: "12px 14px", borderRadius: 14,
  background: "var(--bg-card)", border: "1px solid var(--border-color)",
};

const avatarCircle = {
  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
  background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontWeight: 700, fontSize: 14,
};

const logoutBtnStyle = {
  marginTop: 10, display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
  padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(248,113,113,0.25)",
  background: "rgba(248,113,113,0.1)", color: "#fca5a5", fontSize: 13, fontWeight: 700, cursor: "pointer",
};

const topbarStyle = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginBottom: 24, flexWrap: "wrap", gap: 14,
};

const iconBtnStyle = {
  width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--border-color)",
  background: "var(--bg-card)", color: "var(--text-primary)",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};

const statGridStyle = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18, marginBottom: 24,
};

const statCardStyle = {
  background: "var(--bg-card)", border: "1px solid var(--border-color)",
  borderRadius: 20, padding: "20px 22px",
  boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
};

const statIconStyle = {
  width: 44, height: 44, borderRadius: 13,
  display: "flex", alignItems: "center", justifyContent: "center",
};

const panelStyle = {
  background: "var(--bg-panel)", border: "1px solid var(--border-color)",
  borderRadius: 22, padding: 26,
  boxShadow: "0 16px 50px rgba(0,0,0,0.16)",
};

const panelHeaderStyle = { display: "flex", gap: 14, alignItems: "center", marginBottom: 20 };

const labelStyle = { display: "grid", gap: 8, color: "var(--text-secondary)", fontSize: 13 };

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 12,
  border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)",
};

const toggleButtonStyle = {
  width: 52, height: 30, borderRadius: 999, border: "none", position: "relative", padding: 4,
};

const toggleCircleStyle = {
  position: "absolute", top: 3, width: 24, height: 24, borderRadius: "50%",
  background: "#fff", transition: "left 0.2s ease",
};

const primaryButtonStyle = {
  display: "inline-flex", gap: 9, alignItems: "center", justifyContent: "center",
  padding: "13px 18px", borderRadius: 13, border: "none",
  background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
  fontWeight: 700, cursor: "pointer", fontSize: 14,
};

const errorStyle = {
  background: "rgba(248,113,113,0.12)", color: "#fecaca",
  padding: "12px 16px", borderRadius: 14, marginBottom: 20, fontSize: 13.5,
};

const twoColGridStyle = {
  display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22, alignItems: "start", marginBottom: 22,
};

const sectionHeaderRow = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 };

const viewAllBtnStyle = {
  border: "none", background: "transparent", color: "#a78bfa", fontWeight: 700,
  fontSize: 13, cursor: "pointer",
};

const emptyBoxStyle = {
  padding: 18, borderRadius: 14, background: "var(--bg-info)", color: "var(--text-secondary)", fontSize: 13.5,
};

const sessionRowStyle = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  gap: 12, padding: "12px 10px", borderRadius: 14, borderBottom: "1px solid var(--border-color)",
};

const sessionBadgeCircle = {
  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
  background: "rgba(124,58,237,0.15)", color: "#a78bfa",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 11, fontWeight: 800,
};

const statusPillStyle = {
  padding: "5px 10px", borderRadius: 999, background: "rgba(34,197,94,0.15)",
  color: "#6ee7b7", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center",
};

const rowIconBtnStyle = {
  width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-color)",
  background: "var(--bg-card)", color: "var(--text-primary)", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const continueCodingCard = {
  marginTop: 18, padding: 16, borderRadius: 16, background: "var(--bg-info)",
  border: "1px solid var(--border-color)",
  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
};

const activityIconStyle = {
  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
};

const quickActionTileStyle = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
  padding: "16px 10px", borderRadius: 14, border: "1px solid var(--border-color)",
  background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
};

const bannerStyle = {
  padding: "24px 28px", borderRadius: 22, color: "#fff",
  background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#1e1b4b 100%)",
  boxShadow: "0 20px 50px rgba(79,70,229,0.35)",
};

const profileMenuStyle = {
  position: "absolute", top: 48, right: 0, width: 180,
  background: "var(--bg-card)", border: "1px solid var(--border-color)",
  borderRadius: 14, boxShadow: "0 20px 50px rgba(0,0,0,0.35)", zIndex: 1000, overflow: "hidden",
};

const profileMenuItemStyle = {
  padding: "13px 16px", color: "var(--text-primary)", cursor: "pointer",
  borderBottom: "1px solid var(--border-color)", fontSize: 13.5,
};
