import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaTachometerAlt, FaUsers, FaBroadcastTower, FaHistory, FaTerminal,
  FaSlidersH, FaHeartbeat, FaFileAlt, FaShieldAlt, FaSearch, FaBell,
  FaMoon, FaSignOutAlt, FaBars,
} from "react-icons/fa";
import { colors } from "../styles/theme";

const API = "http://localhost:8086/api/admin";

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
});

const TABS = [
  { key: "users", label: "User Management", icon: FaUsers },
  { key: "live", label: "Live Sessions", icon: FaBroadcastTower },
  { key: "history", label: "Session History", icon: FaHistory },
  { key: "executions", label: "Code Execution", icon: FaTerminal },
  { key: "settings", label: "Sandbox Limits", icon: FaSlidersH },
  { key: "health", label: "System Health", icon: FaHeartbeat },
  { key: "logs", label: "Reports & Logs", icon: FaFileAlt },
  { key: "security", label: "Security", icon: FaShieldAlt },
];

const card = {
  background: "linear-gradient(160deg, rgba(30,22,54,0.95) 0%, rgba(19,14,36,0.98) 100%)",
  border: "1px solid rgba(167,139,250,0.16)",
  borderRadius: 14,
  padding: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
};

const btn = (bg) => ({
  padding: "6px 14px",
  borderRadius: 8,
  border: "none",
  background: bg,
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
});

const th = { textAlign: "left", padding: "8px 10px", fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.04em" };
const td = { padding: "8px 10px", fontSize: 13, borderTop: "1px solid rgba(255,255,255,0.06)" };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("users");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [overview, setOverview] = useState({ totalUsers: null, liveSessions: null, codeExecutions: null, onlineNow: null });
  const username = localStorage.getItem("username") || "Admin";
  const initials = username.slice(0, 2).toUpperCase();
  const activeLabel = TABS.find((t) => t.key === tab)?.label || "Dashboard";

  useEffect(() => {
    let cancelled = false;
    const loadOverview = async () => {
      try {
        const [usersRes, liveRes, execRes] = await Promise.all([
          axios.get(`${API}/users`, authHeaders()),
          axios.get(`${API}/sessions/live`, authHeaders()),
          axios.get(`${API}/executions/stats`, authHeaders()),
        ]);
        if (cancelled) return;
        const liveSessions = liveRes.data || [];
        const onlineNow = liveSessions.reduce((sum, s) => sum + (s.participantCount || 0), 0);
        setOverview({
          totalUsers: usersRes.data?.length ?? 0,
          liveSessions: liveSessions.length,
          codeExecutions: execRes.data?.totalRuns ?? 0,
          onlineNow,
        });
      } catch {
        // Overview row is a nice-to-have; leave dashes if any of these fail.
      }
    };
    loadOverview();
    const id = setInterval(loadOverview, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const logout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: colors.bgPage, color: colors.textPrimary, "--accent-1": colors.accentLight, "--accent-2": colors.accentMid }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarOpen ? 272 : 0,
        minWidth: sidebarOpen ? 272 : 0,
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(23,16,41,0.98) 0%, rgba(11,8,23,0.98) 100%)",
        borderRight: "1px solid rgba(167,139,250,0.14)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease, min-width 0.2s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "22px 22px 18px" }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 15, color: colors.bgPage,
            boxShadow: "0 4px 16px rgba(167,139,250,0.35)", flexShrink: 0,
          }}>
            <img src="/codehive-mark.svg" alt="" style={{ display: "none" }} onError={(e) => (e.target.style.display = "none")} />
            {"</>"}
          </div>
          <div style={{ whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>
              Code<span style={{ color: colors.accentLight }}>Hive</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: "0.06em" }}>ADMIN PANEL</div>
          </div>
        </div>

        <nav style={{ padding: "6px 14px", display: "flex", flexDirection: "column", gap: 4, flex: 1, overflowY: "auto" }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", borderRadius: 10, border: "none",
                  background: active ? "linear-gradient(90deg, #7c3aed, #4f46e5)" : "transparent",
                  color: active ? "#fff" : "#93b8d8",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  textAlign: "left", whiteSpace: "nowrap",
                  boxShadow: active ? "0 6px 16px rgba(124,58,237,0.35)" : "none",
                  transition: "all 0.15s",
                }}
              >
                <Icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }} />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: 14, borderTop: "1px solid rgba(167,139,250,0.14)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", marginBottom: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13, color: "#fff", flexShrink: 0,
            }}>{initials}</div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{username}</div>
              <div style={{ fontSize: 11, opacity: 0.55, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>admin@codehive.com</div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.08)",
              color: "#fca5a5", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 28px", borderBottom: "1px solid rgba(167,139,250,0.14)",
          background: "rgba(23,16,41,0.55)", backdropFilter: "blur(10px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid rgba(167,139,250,0.18)", background: "rgba(167,139,250,0.08)", color: colors.textPrimary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <FaBars />
            </button>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" }}>Admin Dashboard</div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>
                Welcome back, <span style={{ color: colors.accentLight, fontWeight: 600 }}>CodeHive Admin</span>! Viewing {activeLabel.toLowerCase()}.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {showSearch && (
              <input
                autoFocus
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setAdminSearch(""); setShowSearch(false); }
                  if (e.key === "Enter") setTab("users");
                }}
                onBlur={() => { if (!adminSearch) setShowSearch(false); }}
                placeholder="Search users by name or email…"
                style={{
                  background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.18)",
                  borderRadius: 8, padding: "8px 12px", fontSize: 13, color: colors.textPrimary,
                  width: 220, outline: "none",
                }}
              />
            )}
            <button
              title="Search users"
              style={iconBtn}
              onClick={() => {
                setShowSearch((v) => !v);
                setTab("users");
              }}
            >
              <FaSearch />
            </button>
            <button
              title="Notifications"
              style={{ ...iconBtn, position: "relative" }}
              onClick={() =>
                toast.info(
                  `${overview.onlineNow ?? 0} user${overview.onlineNow === 1 ? "" : "s"} online · ${overview.liveSessions ?? 0} live session${overview.liveSessions === 1 ? "" : "s"}`
                )
              }
            >
              <FaBell />
              <span style={{ position: "absolute", top: -4, right: -4, background: colors.accentLight, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
            </button>
            <button
              title="Theme"
              style={iconBtn}
              onClick={() => toast.info("The admin console is dark-mode only for now.")}
            >
              <FaMoon />
            </button>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13, color: "#fff",
            }}>{initials}</div>
          </div>
        </header>

        <div style={{ padding: 28, flex: 1 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
            marginBottom: 24,
          }} className="fx-fade-up">
            <OverviewCard
              icon={FaUsers}
              iconBg="linear-gradient(135deg, #7c3aed, #4f46e5)"
              label="Total Users"
              value={overview.totalUsers}
            />
            <OverviewCard
              icon={FaBroadcastTower}
              iconBg="linear-gradient(135deg, #9333ea, #c084fc)"
              label="Live Sessions"
              value={overview.liveSessions}
            />
            <OverviewCard
              icon={FaTerminal}
              iconBg="linear-gradient(135deg, #7c3aed, #4f46e5)"
              label="Code Executions"
              value={overview.codeExecutions}
            />
            <OverviewCard
              icon={FaHeartbeat}
              iconBg="linear-gradient(135deg, #0d9488, #2dd4bf)"
              label="Online Now"
              value={overview.onlineNow}
            />
          </div>

          {tab === "users" && <UsersPanel searchQuery={adminSearch} />}
          {tab === "live" && <LiveSessionsPanel />}
          {tab === "history" && <HistoryPanel />}
          {tab === "executions" && <ExecutionsPanel />}
          {tab === "settings" && <SettingsPanel />}
          {tab === "health" && <HealthPanel />}
          {tab === "logs" && <LogsPanel />}
          {tab === "security" && <SecurityPanel />}
        </div>
      </div>
    </div>
  );
}

const iconBtn = {
  width: 40, height: 40, borderRadius: "50%",
  border: "1px solid rgba(167,139,250,0.18)", background: "rgba(167,139,250,0.08)",
  color: colors.textPrimary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};

function OverviewCard({ icon: Icon, iconBg, label, value }) {
  return (
    <div className="glass-panel" style={{
      display: "flex", alignItems: "center", gap: 16,
      background: "linear-gradient(160deg, rgba(30,22,54,0.9), rgba(19,14,36,0.95))",
      border: "1px solid rgba(56,189,248,0.16)", borderRadius: 22, padding: "20px 22px", boxShadow: "0 10px 24px rgba(0,0,0,0.2)",
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: "50%", background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon style={{ color: "#fff", fontSize: 18 }} />
      </div>
      <div>
        <div style={{ fontSize: 13, opacity: 0.6, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>{value === null || value === undefined ? "…" : value}</div>
      </div>
    </div>
  );
}

// ─── 1. User Management ────────────────────────────────────────────────────
function UsersPanel({ searchQuery = "" }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    axios
      .get(`${API}/users`, authHeaders())
      .then(({ data }) => setUsers(data))
      .catch(() => setError("Couldn't load users. Are you logged in as an admin?"));
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (fn, successMsg) => {
    try {
      await fn();
      toast.success(successMsg);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed.");
    }
  };

  if (error) return <div className="glass-panel fx-fade-up" style={card}>{error}</div>;
  if (!users) return <div className="glass-panel fx-fade-up" style={card}>Loading users…</div>;

  const q = searchQuery.trim().toLowerCase();
  const filteredUsers = q
    ? users.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      )
    : users;

  return (
    <div className="glass-panel fx-fade-up" style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>User Management</div>
          <div style={{ fontSize: 12, opacity: 0.55 }}>Manage all users and their activities</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.55 }}>
          {q ? `${filteredUsers.length} of ${users.length} users` : `${users.length} user${users.length === 1 ? "" : "s"}`}
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>Role</th>
            <th style={th}>Status</th>
            <th style={th}>Joined</th>
            <th style={th}>Last active</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 && (
            <tr><td style={td} colSpan={7}>No users match "{searchQuery}".</td></tr>
          )}
          {filteredUsers.map((u) => (
            <tr key={u.id}>
              <td style={td}>{u.name}</td>
              <td style={td}>{u.email}</td>
              <td style={td}>{u.role}</td>
              <td style={td}>
                <span style={{ color: u.enabled ? "#3ddc97" : "#ff6b6b" }}>
                  {u.enabled ? "Active" : "Blocked"}
                </span>
              </td>
              <td style={td}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>
              <td style={td}>{u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : "Never"}</td>
              <td style={{ ...td, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {u.enabled ? (
                  <button style={btn("#da3633")} onClick={() => act(() => axios.post(`${API}/users/${u.id}/block`, {}, authHeaders()), "User blocked")}>Block</button>
                ) : (
                  <button style={btn("#238636")} onClick={() => act(() => axios.post(`${API}/users/${u.id}/unblock`, {}, authHeaders()), "User unblocked")}>Unblock</button>
                )}
                {u.role === "ADMIN" ? (
                  <button style={btn("#6b7280")} onClick={() => act(() => axios.put(`${API}/users/${u.id}/role`, { role: "USER" }, authHeaders()), "Demoted to user")}>Make user</button>
                ) : (
                  <button style={btn(colors.accentLight)} onClick={() => act(() => axios.put(`${API}/users/${u.id}/role`, { role: "ADMIN" }, authHeaders()), "Promoted to admin")}>Make admin</button>
                )}
                <button
                  style={btn("#991b1b")}
                  onClick={() => {
                    if (window.confirm(`Delete ${u.email}? This can't be undone.`)) {
                      act(() => axios.delete(`${API}/users/${u.id}`, authHeaders()), "User deleted");
                    }
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 2. Live Session Monitoring ────────────────────────────────────────────
function LiveSessionsPanel() {
  const [sessions, setSessions] = useState(null);

  const load = useCallback(() => {
    axios.get(`${API}/sessions/live`, authHeaders()).then(({ data }) => setSessions(data)).catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // live-ish view without a dedicated socket feed
    return () => clearInterval(interval);
  }, [load]);

  const forceClose = async (token) => {
    if (!window.confirm(`Force-close session ${token}? Everyone in it will be disconnected.`)) return;
    try {
      await axios.post(`${API}/sessions/${token}/close`, {}, authHeaders());
      toast.success("Session closed");
      load();
    } catch {
      toast.error("Couldn't close that session.");
    }
  };

  if (!sessions) return <div className="glass-panel fx-fade-up" style={card}>Loading live sessions…</div>;
  if (sessions.length === 0) return <div className="glass-panel fx-fade-up" style={card}>No active sessions right now.</div>;

  return (
    <div className="glass-panel fx-fade-up" style={card}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Session</th>
            <th style={th}>Language</th>
            <th style={th}>Host</th>
            <th style={th}>Participants</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.sessionToken}>
              <td style={td}>{s.sessionName} <span style={{ opacity: 0.4, fontSize: 11 }}>({s.sessionToken})</span></td>
              <td style={td}>{s.language}</td>
              <td style={td}>{s.hostName || "-"}</td>
              <td style={td}>{s.participantCount} — {(s.participants || []).join(", ")}</td>
              <td style={td}>
                <button style={btn("#da3633")} onClick={() => forceClose(s.sessionToken)}>Force close</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 3. Session History & Analytics ────────────────────────────────────────
function HistoryPanel() {
  const [sessions, setSessions] = useState(null);

  useEffect(() => {
    axios.get(`${API}/sessions/history`, authHeaders()).then(({ data }) => setSessions(data)).catch(() => setSessions([]));
  }, []);

  if (!sessions) return <div className="glass-panel fx-fade-up" style={card}>Loading history…</div>;

  const byLanguage = sessions.reduce((acc, s) => {
    const lang = s.programmingLanguage || "unknown";
    acc[lang] = (acc[lang] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 16 }}>
        <div className="glass-panel fx-fade-up" style={{ ...card, flex: 1 }}>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>Total sessions created</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{sessions.length}</div>
        </div>
        <div className="glass-panel fx-fade-up" style={{ ...card, flex: 2 }}>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>Most used languages</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {Object.entries(byLanguage).sort((a, b) => b[1] - a[1]).map(([lang, count]) => (
              <div key={lang} style={{ fontSize: 13 }}>{lang}: <strong>{count}</strong></div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel fx-fade-up" style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Language</th>
              <th style={th}>Status</th>
              <th style={th}>Created by</th>
              <th style={th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {sessions.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((s) => (
              <tr key={s.id}>
                <td style={td}>{s.sessionName}</td>
                <td style={td}>{s.programmingLanguage}</td>
                <td style={td}>{s.status}</td>
                <td style={td}>{s.createdByEmail || "anonymous"}</td>
                <td style={td}>{s.createdAt ? new Date(s.createdAt).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 4. Code Execution Monitoring ──────────────────────────────────────────
function ExecutionsPanel() {
  const [stats, setStats] = useState(null);

  const load = useCallback(() => {
    axios.get(`${API}/executions/stats`, authHeaders()).then(({ data }) => setStats(data)).catch(() => setStats(null));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  if (!stats) return <div className="glass-panel fx-fade-up" style={card}>Loading execution stats…</div>;

  const statBox = (label, value, color) => (
    <div className="glass-panel fx-fade-up" style={{ ...card, flex: 1 }}>
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#e0f2fe" }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 16 }}>
        {statBox("Total runs", stats.totalRuns)}
        {statBox("Succeeded", stats.successCount, "#3ddc97")}
        {statBox("Failed", stats.failureCount, "#ff6b6b")}
        {statBox("Timed out", stats.timeoutCount, "#facc15")}
      </div>

      <div className="glass-panel fx-fade-up" style={card}>
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 10 }}>Runs by language</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {Object.entries(stats.runsByLanguage || {}).map(([lang, count]) => (
            <div key={lang} style={{ fontSize: 13 }}>{lang}: <strong>{count}</strong></div>
          ))}
        </div>
      </div>

      <div className="glass-panel fx-fade-up" style={card}>
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 10 }}>Recent executions</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Time</th>
              <th style={th}>Language</th>
              <th style={th}>Result</th>
              <th style={th}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {(stats.recent || []).map((r, i) => (
              <tr key={i}>
                <td style={td}>{new Date(r.at).toLocaleTimeString()}</td>
                <td style={td}>{r.language}</td>
                <td style={td}>
                  {r.timedOut ? <span style={{ color: "#facc15" }}>Timeout</span>
                    : r.success ? <span style={{ color: "#3ddc97" }}>Success</span>
                    : <span style={{ color: "#ff6b6b" }}>Failed</span>}
                </td>
                <td style={td}>{r.durationMs}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 5. Resource & Sandbox Limits Control ──────────────────────────────────
const ALL_LANGUAGES = ["java", "python", "javascript"];

function SettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);

  const load = useCallback(() => {
    axios.get(`${API}/settings`, authHeaders()).then(({ data }) => {
      setSettings(data);
      setForm({ timeoutSeconds: data.timeoutSeconds, memoryLimit: data.memoryLimit, cpuLimit: data.cpuLimit, idleCloseMinutes: data.idleCloseMinutes });
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      const { data } = await axios.put(`${API}/settings`, form, authHeaders());
      setSettings(data);
      toast.success("Sandbox limits updated");
    } catch {
      toast.error("Couldn't save settings.");
    }
  };

  const toggleLanguage = async (lang, enabled) => {
    try {
      const { data } = await axios.post(`${API}/settings/languages/${lang}?enabled=${enabled}`, {}, authHeaders());
      setSettings(data);
      toast.success(`${lang} ${enabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Couldn't update language.");
    }
  };

  if (!settings || !form) return <div className="glass-panel fx-fade-up" style={card}>Loading sandbox settings…</div>;

  const inputStyle = { padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(167,139,250,0.32)", background: colors.bgPage, color: colors.textPrimary, width: 120 };
  const label = { fontSize: 12, opacity: 0.7, display: "block", marginBottom: 4 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="glass-panel fx-fade-up" style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Docker sandbox limits (applies to every new run/check — no restart needed)</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <span style={label}>Timeout (seconds)</span>
            <input style={inputStyle} type="number" min={1} max={60} value={form.timeoutSeconds}
              onChange={(e) => setForm({ ...form, timeoutSeconds: Number(e.target.value) })} />
          </div>
          <div>
            <span style={label}>Memory limit</span>
            <input style={inputStyle} type="text" value={form.memoryLimit}
              onChange={(e) => setForm({ ...form, memoryLimit: e.target.value })} placeholder="e.g. 128m" />
          </div>
          <div>
            <span style={label}>CPU limit (cores)</span>
            <input style={inputStyle} type="number" step="0.1" min={0.1} max={4} value={form.cpuLimit}
              onChange={(e) => setForm({ ...form, cpuLimit: Number(e.target.value) })} />
          </div>
          <div>
            <span style={label}>Idle room auto-close (minutes)</span>
            <input style={inputStyle} type="number" min={1} value={form.idleCloseMinutes}
              onChange={(e) => setForm({ ...form, idleCloseMinutes: Number(e.target.value) })} />
          </div>
          <button style={btn(colors.accentLight)} onClick={save}>Save limits</button>
        </div>
      </div>

      <div className="glass-panel fx-fade-up" style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Supported languages</div>
        <div style={{ display: "flex", gap: 12 }}>
          {ALL_LANGUAGES.map((lang) => {
            const enabled = settings.enabledLanguages.includes(lang);
            return (
              <button
                key={lang}
                style={btn(enabled ? "#238636" : "#6b7280")}
                onClick={() => toggleLanguage(lang, !enabled)}
              >
                {lang} — {enabled ? "Enabled" : "Disabled"} (click to {enabled ? "disable" : "enable"})
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 6. System Health ───────────────────────────────────────────────────────
function HealthPanel() {
  const [health, setHealth] = useState(null);

  const load = useCallback(() => {
    axios.get(`${API}/system/health`, authHeaders()).then(({ data }) => setHealth(data)).catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  if (!health) return <div className="glass-panel fx-fade-up" style={card}>Loading system health…</div>;

  const fmtUptime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  };

  const statBox = (label, value, ok) => (
    <div className="glass-panel fx-fade-up" style={{ ...card, flex: 1 }}>
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: ok === undefined ? "#e0f2fe" : ok ? "#3ddc97" : "#ff6b6b" }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {statBox("Backend uptime", fmtUptime(health.uptimeSeconds))}
        {statBox("Database", health.databaseConnected ? "Connected" : "Down", health.databaseConnected)}
        {statBox("Socket.IO server", health.socketServerRunning ? "Running" : "Down", health.socketServerRunning)}
        {statBox("Connected clients", health.socketClientsConnected)}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {statBox("JVM memory used", `${health.jvmUsedMemoryMB} MB / ${health.jvmMaxMemoryMB} MB`)}
        {statBox("Available CPU cores", health.availableProcessors)}
      </div>
    </div>
  );
}

// ─── 7. Reports & Logs ──────────────────────────────────────────────────────
function LogsPanel() {
  const [logs, setLogs] = useState(null);

  const load = useCallback(() => {
    axios.get(`${API}/logs`, authHeaders()).then(({ data }) => setLogs(data)).catch(() => setLogs([]));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const downloadCsv = async (path, filename) => {
    try {
      const { data } = await axios.get(`${API}${path}`, { ...authHeaders(), responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed.");
    }
  };

  if (!logs) return <div className="glass-panel fx-fade-up" style={card}>Loading logs…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={btn("#0891b2")} onClick={() => downloadCsv("/logs/export", "codehive-admin-logs.csv")}>Export logs (CSV)</button>
        <button style={btn("#0891b2")} onClick={() => downloadCsv("/users/export", "codehive-users.csv")}>Export users (CSV)</button>
      </div>
      <div className="glass-panel fx-fade-up" style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Time</th>
              <th style={th}>Actor</th>
              <th style={th}>Action</th>
              <th style={th}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i}>
                <td style={td}>{new Date(l.at).toLocaleString()}</td>
                <td style={td}>{l.actor}</td>
                <td style={td}>{l.action}</td>
                <td style={td}>{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 8. Security / Abuse Control ───────────────────────────────────────────
function SecurityPanel() {
  const [flags, setFlags] = useState(null);
  const [banned, setBanned] = useState(null);

  const load = useCallback(() => {
    axios.get(`${API}/security/flags`, authHeaders()).then(({ data }) => setFlags(data)).catch(() => setFlags([]));
    axios.get(`${API}/security/banned-users`, authHeaders()).then(({ data }) => setBanned(data)).catch(() => setBanned([]));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  if (!flags || !banned) return <div className="glass-panel fx-fade-up" style={card}>Loading security data…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="glass-panel fx-fade-up" style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          Potential abuse — users creating a lot of sessions in the last hour
        </div>
        {flags.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.6 }}>No unusual session-creation activity right now.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr><th style={th}>User</th><th style={th}>Sessions in last hour</th></tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.userEmail}>
                  <td style={td}>{f.userEmail}</td>
                  <td style={{ ...td, color: "#facc15" }}>{f.sessionsInLastHour}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="glass-panel fx-fade-up" style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          Blocked / banned users — manage in the User Management tab
        </div>
        {banned.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.6 }}>Nobody is currently blocked.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr><th style={th}>Name</th><th style={th}>Email</th></tr>
            </thead>
            <tbody>
              {banned.map((u) => (
                <tr key={u.id}>
                  <td style={td}>{u.name}</td>
                  <td style={td}>{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
