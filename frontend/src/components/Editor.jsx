import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import MonacoEditor from "@monaco-editor/react";
import { getSocket } from "../lib/socket";
import { useHostControls } from "./HostControls/useHostControls";
import HostControlPanel from "./HostControls/HostControlPanel";
import ParticipantPickerModal from "./HostControls/ParticipantPickerModal";
import InviteModal from "./HostControls/InviteModal";
import ParticipantPanel from "./ParticipantPanel/ParticipantPanel";
import ProfileModal from "./ParticipantPanel/ProfileModal";
import { useParticipantPresence } from "./ParticipantPanel/useParticipantPresence";
import FileExplorer from "./FileExplorer/FileExplorer";
import OutputPanel from "./OutputPanel/OutputPanel";
import { languageForFile } from "./FileExplorer/fileIcons";
import { useUpdateFileContentMutation } from "../redux/FileApi";

// NFR-02: parse standard ANSI SGR escape sequences (\x1b[...m) out of
// process stdout/stderr — colored test runners, linters, colorama output,
// etc. — into styled spans instead of dumping the raw escape bytes.
const ANSI_FG = {
  30: "#3f3f46", 31: "#f87171", 32: "#4ade80", 33: "#facc15",
  34: "#60a5fa", 35: "#e879f9", 36: "#22d3ee", 37: "#e4e4e7",
  90: "#71717a", 91: "#fca5a5", 92: "#86efac", 93: "#fde047",
  94: "#93c5fd", 95: "#f0abfc", 96: "#67e8f9", 97: "#fafafa",
};
const ANSI_BG = {
  40: "#3f3f46", 41: "#f87171", 42: "#4ade80", 43: "#facc15",
  44: "#60a5fa", 45: "#e879f9", 46: "#22d3ee", 47: "#e4e4e7",
  100: "#71717a", 101: "#fca5a5", 102: "#86efac", 103: "#fde047",
  104: "#93c5fd", 105: "#f0abfc", 106: "#67e8f9", 107: "#fafafa",
};

function ansiToSpans(raw, defaultColor) {
  if (typeof raw !== "string" || raw.indexOf("\x1b[") === -1) {
    return [{ text: raw ?? "", style: {} }];
  }
  const spans = [];
  let state = { color: defaultColor, background: undefined, fontWeight: undefined, fontStyle: undefined, textDecoration: undefined };
  let lastIndex = 0;
  const re = /\x1b\[([0-9;]*)m/g;
  let match;
  const styleOf = (s) => ({
    color: s.color,
    background: s.background,
    fontWeight: s.fontWeight,
    fontStyle: s.fontStyle,
    textDecoration: s.textDecoration,
  });
  while ((match = re.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ text: raw.slice(lastIndex, match.index), style: styleOf(state) });
    }
    const codes = match[1].split(";").filter((c) => c !== "").map(Number);
    if (codes.length === 0) codes.push(0);
    for (const code of codes) {
      if (code === 0) state = { color: defaultColor, background: undefined, fontWeight: undefined, fontStyle: undefined, textDecoration: undefined };
      else if (code === 1) state.fontWeight = 700;
      else if (code === 3) state.fontStyle = "italic";
      else if (code === 4) state.textDecoration = "underline";
      else if (code === 39) state.color = defaultColor;
      else if (code === 49) state.background = undefined;
      else if (ANSI_FG[code]) state.color = ANSI_FG[code];
      else if (ANSI_BG[code]) state.background = ANSI_BG[code];
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < raw.length) {
    spans.push({ text: raw.slice(lastIndex), style: styleOf(state) });
  }
  return spans.length ? spans : [{ text: "", style: {} }];
}

const languageInfo = {
  Java: {
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
    ext: "java",
    monaco: "java",
    version: "Java 21",
  },
  Python: {
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    ext: "py",
    monaco: "python",
    version: "Python 3.12",
  },
  JavaScript: {
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
    ext: "js",
    monaco: "javascript",
    version: "Node 20",
  },
  "C++": {
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
    ext: "cpp",
    monaco: "cpp",
    version: "C++17",
  },
  React: {
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
    ext: "jsx",
    monaco: "javascript",
    version: "React 18",
  },
};

const menuConfig = {
  File: [
    { label: "New file", shortcut: "⌘N", icon: "📄" },
    { label: "Open folder", shortcut: "⌘O", icon: "📂" },
    { type: "sep" },
    { label: "Save", shortcut: "⌘S", icon: "💾" },
    { label: "Save all", shortcut: "⌘⇧S", icon: "💾" },
    { type: "sep" },
    { label: "Share workspace", icon: "🔗" },
    { label: "Export project", icon: "📤" },
    { type: "sep" },
    { label: "Close editor", shortcut: "⌘W", icon: "✕" },
  ],
  Edit: [
    { label: "Undo", shortcut: "⌘Z", icon: "↩" },
    { label: "Redo", shortcut: "⌘⇧Z", icon: "↪" },
    { type: "sep" },
    { label: "Cut", shortcut: "⌘X", icon: "✂" },
    { label: "Copy", shortcut: "⌘C", icon: "📋" },
    { label: "Paste", shortcut: "⌘V", icon: "📌" },
    { type: "sep" },
    { label: "Find", shortcut: "⌘F", icon: "🔍" },
    { label: "Replace", shortcut: "⌘H", icon: "🔄" },
    { type: "sep" },
    { label: "Format document", shortcut: "⌘⇧F", icon: "⬡" },
  ],
  Selection: [
    { label: "Select all", shortcut: "⌘A" },
    { label: "Select line", shortcut: "⌘L" },
    { type: "sep" },
    { label: "Add cursor above", shortcut: "⌥⌘↑" },
    { label: "Add cursor below", shortcut: "⌥⌘↓" },
    { label: "Select all occurrences", shortcut: "⌘⇧L" },
    { type: "sep" },
    { label: "Expand selection", shortcut: "⌃⇧→" },
    { label: "Shrink selection", shortcut: "⌃⇧←" },
  ],
  View: [
    { label: "Explorer", shortcut: "⌘⇧E" },
    { label: "Search", shortcut: "⌘⇧F" },
    { label: "Source control", shortcut: "⌃⇧G" },
    { type: "sep" },
    { label: "Terminal", shortcut: "⌘`" },
    { label: "Output panel" },
    { label: "Minimap" },
    { type: "sep" },
    { label: "Zoom in", shortcut: "⌘+" },
    { label: "Zoom out", shortcut: "⌘-" },
  ],
  Go: [
    { label: "Go to file", shortcut: "⌘P" },
    { label: "Go to line", shortcut: "⌃G" },
    { label: "Go to symbol", shortcut: "⌘⇧O" },
    { type: "sep" },
    { label: "Go to definition", shortcut: "F12" },
    { label: "Go to references", shortcut: "⇧F12" },
    { label: "Peek definition", shortcut: "⌥F12" },
    { type: "sep" },
    { label: "Navigate back", shortcut: "⌃-" },
    { label: "Navigate forward", shortcut: "⌃⇧-" },
  ],
  Run: [
    { label: "Run", shortcut: "F5" },
    { label: "Debug", shortcut: "⌘⇧D" },
    { label: "Run without debug", shortcut: "⌃F5" },
    { type: "sep" },
    { label: "Pause" },
    { label: "Stop", shortcut: "⇧F5" },
    { type: "sep" },
    { label: "Step into", shortcut: "F11" },
    { label: "Step over", shortcut: "F10" },
    { label: "Step out", shortcut: "⇧F11" },
    { type: "sep" },
    { label: "Manage configurations" },
  ],
  Terminal: [
    { label: "New terminal", shortcut: "⌘⇧`" },
    { label: "Split terminal" },
    { type: "sep" },
    { label: "Clear terminal", shortcut: "⌘K" },
    { label: "Kill terminal" },
    { type: "sep" },
    { label: "Configure shell" },
  ],
  Help: [
    { label: "Documentation" },
    { label: "Keyboard shortcuts" },
    { label: "Command palette", shortcut: "⌘⇧P" },
    { type: "sep" },
    { label: "AI assistant ✨" },
    { label: "Community forum" },
    { label: "Report an issue" },
    { type: "sep" },
    { label: "About CodeHive" },
  ],
};

const defaultFiles = (ext, t) => [
  { name: `Main.${ext}`, color: t.accent, active: true, unsaved: true },
  { name: `Program.${ext}`, color: t.successText, active: false, unsaved: false },
  { name: `Test.${ext}`, color: t.purple, active: false, unsaved: false },
  { name: `Utils.${ext}`, color: t.warning, active: false, unsaved: false },
];

const defaultCode = (language) => `// Welcome to ${language} — CodeHive Workspace
// Start coding below...

public class Main {

    public static void main(String[] args) {
        System.out.println("Hello, CodeHive!");
    }

}`;

const THEMES = {
  dark: {
    bg: "#0b0f1a",
    bgPanel: "#111627",
    bgDeep: "#080b14",
    border: "#1e2438",
    border2: "#2a3350",
    text: "#e6edf3",
    textNormal: "#c9d1d9",
    textDim: "#8b949e",
    muted: "#6e7681",
    accent: "#60a5fa",
    accentStrong: "#3b82f6",
    accentBg: "#3b82f622",
    success: "#1d4ed8",
    successText: "#60a5fa",
    danger: "#f85149",
    warning: "#e3b341",
    purple: "#38bdf8",
    hover: "#1a2138",
    dropdown: "#131a2c",
    avatarGradient: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
    statusBar: "linear-gradient(90deg,#1d4ed8,#3b82f6)",
    glow: "none",
  },
  futuristic: {
    bg: "#05040e",
    bgPanel: "#0c0a1f",
    bgDeep: "#020108",
    border: "#2a1f5c",
    border2: "#3d2b85",
    text: "#eafcff",
    textNormal: "#c8d3ff",
    textDim: "#8f8ad1",
    muted: "#6a63a8",
    accent: "#00f0ff",
    accentStrong: "#ff2ee6",
    accentBg: "#00f0ff22",
    success: "#00ffa3",
    successText: "#00ffa3",
    danger: "#ff3d6e",
    warning: "#ffd23f",
    purple: "#60a5fa",
    hover: "#1a1440",
    dropdown: "#0f0b2e",
    avatarGradient: "linear-gradient(135deg,#00f0ff,#ff2ee6)",
    statusBar: "linear-gradient(90deg,#ff2ee6,#00f0ff)",
    glow: "0 0 8px currentColor",
  },
  light: {
    bg: "#ffffff",
    bgPanel: "#f6f8fa",
    bgDeep: "#eaeef2",
    border: "#d0d7de",
    border2: "#d8dee4",
    text: "#1f2328",
    textNormal: "#24292f",
    textDim: "#57606a",
    muted: "#8c959f",
    accent: "#0969da",
    accentStrong: "#0550ae",
    accentBg: "#0969da1a",
    success: "#1a7f37",
    successText: "#1a7f37",
    danger: "#cf222e",
    warning: "#9a6700",
    purple: "#8250df",
    hover: "#eaeef2",
    dropdown: "#ffffff",
    avatarGradient: "linear-gradient(135deg,#0969da,#54aeff)",
    statusBar: "#0969da",
    glow: "none",
  },
};

const THEME_ORDER = ["dark", "futuristic", "light"];
const THEME_LABEL = { dark: "🌙 Dark", futuristic: "⚡ Futuristic", light: "☀️ Light" };

export default function Editor() {
  const { language: routeLanguage, token: sessionToken } = useParams();
  const [language, setLanguage] = useState(routeLanguage || "Java");
  const userName =
    localStorage.getItem("activeSessionDisplayName") ||
    localStorage.getItem("username") ||
    localStorage.getItem("email") ||
    "Anonymous";
  const current = languageInfo[language] || languageInfo["Java"];
  const [theme, setTheme] = useState("dark");
  const t = THEMES[theme];
  const [activeMenu, setActiveMenu] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [tabs, setTabs] = useState(defaultFiles(current.ext, t));
  const [code, setCode] = useState(defaultCode(language));
  // FEATURE 1 — Advanced File Explorer: which explorer file (if any) is
  // currently open in the editor. When null, the editor behaves exactly as
  // before (per-language boilerplate tabs) — fully backward compatible.
  const [activeFileNode, setActiveFileNode] = useState(null);
  const [updateFileContentApi] = useUpdateFileContentMutation();
  const fileSaveDebounceRef = useRef(null);

  const handleOpenExplorerFile = (node) => {
    setActiveFileNode(node);
    setCode(node.content || "");
    const mappedLang = languageForFile(node.name);
    if (mappedLang && mappedLang !== "plaintext") {
      setLanguage((prev) => prev); // language tabs stay language-scoped; file content just fills the buffer
    }
  };

  // Debounced autosave of explorer-file edits back to the backend, mirroring
  // the existing socket code_change autosave below.
  useEffect(() => {
    if (!activeFileNode) return;
    clearTimeout(fileSaveDebounceRef.current);
    fileSaveDebounceRef.current = setTimeout(() => {
      updateFileContentApi({ id: activeFileNode.id, content: code }).catch(() => {});
    }, 600);
    return () => clearTimeout(fileSaveDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, activeFileNode?.id]);
  const [terminalOutput, setTerminalOutput] = useState([
    { type: "path", text: `~/workspace/${language}Project`, tab: "Terminal" },
    { type: "prompt", text: `javac src/Main.${current.ext}`, tab: "Terminal" },
    { type: "output", text: "Compiling...", tab: "Terminal" },
    { type: "success", text: "✓ Build successful in 0.43s", tab: "Terminal" },
  ]);
  const [showTerminal, setShowTerminal] = useState(true);
  const [activeTermTab, setActiveTermTab] = useState("Terminal");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  // FEATURE 2 — Professional Output Panel: last run's exit code / duration /
  // memory, and live compiler diagnostics for the Problems tab.
  const [execMeta, setExecMeta] = useState({});
  const [problems, setProblems] = useState([]);

  // ── Live collaboration state ──
  const [onlineParticipants, setOnlineParticipants] = useState([]);
  const [sessionHostName, setSessionHostName] = useState(null);
  const [participantRoles, setParticipantRoles] = useState([]); // [{userName, socketId, role}]
  const [myRole, setMyRole] = useState("HOST"); // optimistic default until the server confirms
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [rightPanelTab, setRightPanelTab] = useState("output"); // "output" | "chat"
  // FR-06: badge count of chat messages received while the Chat tab is
  // collapsed (i.e. the Output tab is showing). Reset to 0 whenever the
  // user actually opens the Chat tab.
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [explaining, setExplaining] = useState(false);
  // FR-01: live remote cursor + selection positions, keyed by socketId, so
  // each collaborator is rendered in a stable, distinct color.
  const [remoteCursors, setRemoteCursors] = useState({});
  const cursorDecorationsRef = useRef({}); // socketId -> decoration collection
  const CURSOR_PALETTE = ["#f97316", "#22c55e", "#3b82f6", "#e879f9", "#eab308", "#14b8a6", "#f43f5e", "#8b5cf6"];
  const colorForUser = (key) => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return CURSOR_PALETTE[hash % CURSOR_PALETTE.length];
  };
  const socketRef = useRef(null);
  const applyingRemoteChange = useRef(false);
  // Mirrors rightPanelTab so the socket-event handlers below (registered
  // once per session token) can read the *current* tab without having to
  // rebuild the whole socket wiring every time the user switches tabs.
  const rightPanelTabRef = useRef(rightPanelTab);
  const typingTimeoutRef = useRef(null);
  const monacoEditorRef = useRef(null);
  const monacoRef = useRef(null);
  const checkDebounceRef = useRef(null);
  const checkRequestIdRef = useRef(0);
  const [editorFontSize, setEditorFontSize] = useState(13);
  const [showMinimap, setShowMinimap] = useState(true);
  // "connecting" | "pending" | "approved" | "denied" — drives the waiting-room overlay.
  const [joinStatus, setJoinStatus] = useState("connecting");
  const [saving, setSaving] = useState(false);

  // ── FEATURE 1: Host Controls ──
  const isHost = myRole === "HOST";
  const [showKickModal, setShowKickModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const hostControls = useHostControls({
    socket: getSocket(),
    sessionToken,
    isHost,
    onSessionEnded: () => {
      // Both "kicked" and "ended" land here — either way this client no
      // longer belongs in the room, so send them back to the dashboard.
      window.location.href = "/dashboard";
    },
  });

  // ── FEATURE 2: Participant Panel ──
  const [profileTarget, setProfileTarget] = useState(null); // userName or null
  const participantPresence = useParticipantPresence({ socket: getSocket(), remoteCursors, userName });

  const initials = userName.split(" ").map((w) => w[0]).join("").toUpperCase();

  useEffect(() => {
    rightPanelTabRef.current = rightPanelTab;
    if (rightPanelTab === "chat") setUnreadChatCount(0);
  }, [rightPanelTab]);

  // Connect to the collaboration socket, join this session's room, and
  // wire up all the live-collab events. Runs once per session token.
  useEffect(() => {
    if (!sessionToken) return;
    const socket = getSocket();
    socketRef.current = socket;

    // Reset chat/participants immediately so the previous session's
    // messages never leak into the newly-opened one while we wait for
    // the server's chat_history reply.
    setChatMessages([]);
    setOnlineParticipants([]);
    setTypingUsers([]);
    setSessionHostName(null);
    setParticipantRoles([]);
    setMyRole("HOST");

    // Belt-and-braces: also fetch history over plain REST. The socket
    // normally delivers this right after join, but if that event is ever
    // dropped (slow reconnect, tab was backgrounded, etc.) this guarantees
    // a joiner still sees prior messages instead of an empty chat panel.
    axios
      .get(`http://localhost:8086/api/sessions/${sessionToken}/chat`)
      .then(({ data }) => setChatMessages((prev) => (prev.length ? prev : data || [])))
      .catch(() => {});

    // Load whatever was last saved for this session, so a reload doesn't
    // lose work.
    axios
      .get(`http://localhost:8086/api/sessions/${sessionToken}`)
      .then(({ data }) => {
        if (data?.code) setCode(data.code);
      })
      .catch(() => {});

    const handleOnlineParticipants = (names) => setOnlineParticipants(names || []);
    const handleSessionHost = (hostName) => setSessionHostName(hostName || null);
    const handleParticipantRoles = (roles) => {
      setParticipantRoles(roles || []);
      const mySocketId = socket.id;
      const mine = (roles || []).find((r) => r.socketId === mySocketId);
      if (mine) setMyRole(mine.role);
    };
    const handleLanguageChanged = (newLanguage) => {
      if (newLanguage) setLanguage(newLanguage);
    };
    const handleChatHistory = (history) => setChatMessages(history || []);
    const handleChatMessage = (data) => {
      setChatMessages((prev) => [...prev, data]);
      // FR-06: only badge messages that arrive while the sidebar is
      // showing something other than Chat, and never badge our own
      // outgoing message (it's echoed back by the server).
      if (rightPanelTabRef.current !== "chat" && data?.userName !== userName) {
        setUnreadChatCount((n) => n + 1);
      }
    };
    const handleCodeChange = (data) => {
      if (data && typeof data.code === "string") {
        applyingRemoteChange.current = true;
        setCode(data.code);
      }
    };
    // FR-01: remote cursor + selection position from another participant.
    const handleCursorMove = (data) => {
      if (!data?.socketId || data.userName === userName) return;
      setRemoteCursors((prev) => ({
        ...prev,
        [data.socketId]: {
          userName: data.userName,
          position: data.position || null,
          selection: data.selection || null,
          color: colorForUser(data.userName || data.socketId),
          updatedAt: Date.now(),
        },
      }));
    };
    const handleTyping = (data) => {
      if (!data?.userName || data.userName === userName) return;
      setTypingUsers((prev) => [...new Set([...prev, data.userName])]);
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== data.userName));
      }, 2000);
    };
    setJoinStatus("connecting");

    const handleSystemMessage = (text) => {
      setChatMessages((prev) => [
        ...prev,
        { system: true, message: text, sentAt: new Date().toISOString() },
      ]);
      if (text === `${userName} joined the session`) {
        toast.success(`You've entered the session`);
      } else if (typeof text === "string" && text.endsWith("joined the session")) {
        toast.info(text);
      }
    };

    // ── Host-approval handshake ──
    // A brand-new (empty) room admits its first joiner immediately and makes
    // them host. Anyone joining after that sends a request the host has to
    // approve before they actually get into the room.
    const handleJoinPending = () => setJoinStatus("pending");
    const handleJoinApproved = () => setJoinStatus("approved");
    const handleJoinDenied = () => {
      setJoinStatus("denied");
      toast.error("The host declined your request to join this session.");
    };
    const handleJoinRequest = ({ requestId, userName: requesterName }) => {
      toast(
        <div>
          <div style={{ marginBottom: 8 }}>
            <strong>{requesterName}</strong> wants to join your session
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                socket.emit("approve_join", { sessionToken, requestId });
                toast.dismiss(`join-req-${requestId}`);
              }}
              style={{ flex: 1, padding: "5px 0", borderRadius: 4, border: "none", background: "#238636", color: "#fff", cursor: "pointer" }}
            >
              Approve
            </button>
            <button
              onClick={() => {
                socket.emit("deny_join", { sessionToken, requestId });
                toast.dismiss(`join-req-${requestId}`);
              }}
              style={{ flex: 1, padding: "5px 0", borderRadius: 4, border: "none", background: "#da3633", color: "#fff", cursor: "pointer" }}
            >
              Deny
            </button>
          </div>
        </div>,
        { toastId: `join-req-${requestId}`, autoClose: false, closeOnClick: false }
      );
    };

    socket.on("online_participants", handleOnlineParticipants);
    socket.on("session_host", handleSessionHost);
    socket.on("participant_roles", handleParticipantRoles);
    socket.on("language_changed", handleLanguageChanged);
    socket.on("chat_history", handleChatHistory);
    socket.on("chat_message", handleChatMessage);
    socket.on("code_change", handleCodeChange);
    socket.on("cursor_move", handleCursorMove);
    socket.on("typing", handleTyping);
    socket.on("system_message", handleSystemMessage);
    socket.on("join_pending", handleJoinPending);
    socket.on("join_approved", handleJoinApproved);
    socket.on("join_denied", handleJoinDenied);
    socket.on("join_request", handleJoinRequest);

    const joinThisRoom = () => socket.emit("join_room", { sessionToken, userName });

    // The singleton socket may already be connected from a previous
    // session in this same tab — in that case join immediately. Otherwise
    // wait for the connect event before joining, and (re)connect if the
    // connection ever drops, so a network blip doesn't leave the room
    // silently unjoined.
    if (socket.connected) {
      joinThisRoom();
    } else {
      socket.on("connect", joinThisRoom);
      socket.connect();
    }

    return () => {
      if (socket.connected) {
        socket.emit("leave_room", { sessionToken, userName });
      }
      socket.off("connect", joinThisRoom);
      socket.off("online_participants", handleOnlineParticipants);
      socket.off("session_host", handleSessionHost);
      socket.off("participant_roles", handleParticipantRoles);
      socket.off("language_changed", handleLanguageChanged);
      socket.off("chat_history", handleChatHistory);
      socket.off("chat_message", handleChatMessage);
      socket.off("code_change", handleCodeChange);
      socket.off("cursor_move", handleCursorMove);
      socket.off("typing", handleTyping);
      socket.off("system_message", handleSystemMessage);
      socket.off("join_pending", handleJoinPending);
      socket.off("join_approved", handleJoinApproved);
      socket.off("join_denied", handleJoinDenied);
      socket.off("join_request", handleJoinRequest);
      // Deliberately NOT calling socket.disconnect() here: this cleanup
      // also runs when sessionToken changes (switching sessions), and
      // tearing the transport down on every switch is what was causing
      // chat history to sometimes never arrive for the new room. The
      // socket now lives for the lifetime of the tab.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  // Broadcast local code edits to the room, but skip the echo of a change
  // that just arrived from someone else (otherwise we'd loop it back out).
  useEffect(() => {
    if (applyingRemoteChange.current) {
      applyingRemoteChange.current = false;
      return;
    }
    if (!sessionToken || !socketRef.current) return;
    socketRef.current.emit("code_change", { sessionToken, code, userName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Live red-squiggly error checking: debounced compile/parse-only check
  // against the backend, translated into Monaco markers. Runs client-side
  // for JS via Monaco's own worker where possible would be nicer, but we
  // route every supported language through the same backend endpoint so
  // FR-01: paint every other participant's cursor + selection into the
  // editor, in that participant's stable color, and drop entries nobody
  // has updated in a while (covers disconnects the room list hasn't
  // caught up with yet).
  useEffect(() => {
    const styleId = "codehive-remote-cursor-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    const styleEl = document.getElementById(styleId);
    const rules = Object.values(remoteCursors).map(({ color }) => {
      const cls = color.replace("#", "c-");
      return `
        .remote-cursor-${cls} { border-left: 2px solid ${color}; }
        .remote-cursor-label-${cls}::after {
          content: attr(data-user); position: relative; top: -1.1em;
          background: ${color}; color: #fff; font-size: 10px; padding: 0 4px;
          border-radius: 3px; white-space: nowrap;
        }
        .remote-selection-${cls} { background: ${color}33; }
      `;
    });
    styleEl.textContent = rules.join("\n");
  }, [remoteCursors]);

  useEffect(() => {
    const editorInstance = monacoEditorRef.current;
    const monaco = monacoRef.current;
    if (!editorInstance || !monaco) return;

    const activeIds = new Set(Object.keys(remoteCursors));
    // Clear decorations for anyone who's no longer present.
    Object.keys(cursorDecorationsRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        cursorDecorationsRef.current[id].clear();
        delete cursorDecorationsRef.current[id];
      }
    });

    Object.entries(remoteCursors).forEach(([socketId, info]) => {
      if (!info.position) return;
      const cls = info.color.replace("#", "c-");
      const decorations = [
        {
          range: new monaco.Range(
            info.position.lineNumber, info.position.column,
            info.position.lineNumber, info.position.column
          ),
          options: {
            className: `remote-cursor-${cls}`,
            beforeContentClassName: `remote-cursor-label-${cls}`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        },
      ];
      if (info.selection) {
        decorations.push({
          range: new monaco.Range(
            info.selection.startLineNumber, info.selection.startColumn,
            info.selection.endLineNumber, info.selection.endColumn
          ),
          options: { className: `remote-selection-${cls}` },
        });
      }
      if (!cursorDecorationsRef.current[socketId]) {
        cursorDecorationsRef.current[socketId] = editorInstance.createDecorationsCollection([]);
      }
      cursorDecorationsRef.current[socketId].set(decorations);
      // data-user attribute for the ::after label needs a real DOM node,
      // which Monaco's decoration API doesn't expose directly — the
      // beforeContentClassName covers the color-coded marker; the
      // participant list in the sidebar already shows who's who.
    });
  }, [remoteCursors]);

  // Java/Python get real compiler diagnostics too.
  useEffect(() => {
    clearTimeout(checkDebounceRef.current);
    const monaco = monacoRef.current;
    const editorInstance = monacoEditorRef.current;
    if (!monaco || !editorInstance) return;

    const model = editorInstance.getModel();
    if (!model) return;

    if (!code || !code.trim()) {
      monaco.editor.setModelMarkers(model, "codehive", []);
      setProblems([]);
      return;
    }

    checkDebounceRef.current = setTimeout(async () => {
      const requestId = ++checkRequestIdRef.current;
      try {
        const { data } = await axios.post("http://localhost:8086/api/execute/check", {
          language,
          code,
        });
        // Ignore this response if a newer keystroke already fired another check.
        if (requestId !== checkRequestIdRef.current) return;

        const currentModel = monacoEditorRef.current?.getModel();
        if (!currentModel) return;

        const lineCount = currentModel.getLineCount();
        const markers = (data?.diagnostics || []).map((d) => {
          const line = Math.min(Math.max(d.line, 1), lineCount);
          const lineLength = currentModel.getLineMaxColumn(line);
          return {
            severity: monaco.MarkerSeverity.Error,
            message: d.message,
            startLineNumber: line,
            startColumn: 1,
            endLineNumber: line,
            endColumn: lineLength,
          };
        });
        monaco.editor.setModelMarkers(currentModel, "codehive", markers);
        setProblems(
          (data?.diagnostics || []).map((d, i) => ({
            id: `${requestId}-${i}`,
            severity: "error",
            message: d.message,
            line: d.line,
            file: activeFileNode?.name,
          }))
        );
      } catch {
        // Best-effort — a failed check just means no red lines this round.
      }
    }, 900);

    return () => clearTimeout(checkDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language]);

  const handleEditorTyping = (e) => {
    setCode(e.target.value);
    if (!sessionToken || !socketRef.current) return;
    socketRef.current.emit("typing", { sessionToken, userName });
    clearTimeout(typingTimeoutRef.current);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveToServer(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, sessionToken, activeTab]);

  const handleSendChatMessage = () => {
    const message = chatInput.trim();
    if (!message || !sessionToken || !socketRef.current) return;
    socketRef.current.emit("chat_message", {
      sessionToken,
      senderName: userName,
      message,
    });
    setChatInput("");
  };

  const handleRunCode = async () => {
    setRunning(true);
    setActiveTermTab("Terminal");
    setShowTerminal(true);
    setExecMeta({ running: true });
    setTerminalOutput((prev) => [
      ...prev,
      { type: "path", text: `~/workspace/${language}Project`, tab: "Terminal" },
      { type: "prompt", text: `run ${language}`, tab: "Terminal" },
      { type: "output", text: "Compiling and running in Docker...", tab: "Terminal" },
    ]);
    try {
      const { data } = await axios.post("http://localhost:8086/api/execute", {
        language,
        code,
        sessionToken,
        participantSocketId: socketRef.current?.id,
      });
      setTerminalOutput((prev) => [
        ...prev,
        ...(data.stdout ? [{ type: "success", text: data.stdout, tab: "Output" }] : []),
        ...(data.stderr ? [{ type: data.success ? "output" : "error", text: data.stderr, tab: "Output" }] : []),
        {
          type: data.success ? "success" : "output",
          text: data.timedOut
            ? "Execution timed out."
            : `Finished in ${data.durationMs}ms — ${data.success ? "success" : "failed"}`,
          tab: "Terminal",
        },
      ]);
      setExecMeta({
        running: false,
        exitCode: data.exitCode,
        durationMs: data.durationMs,
        memoryUsageKb: data.memoryUsageKb,
        timedOut: data.timedOut,
      });
    } catch (err) {
      setTerminalOutput((prev) => [
        ...prev,
        { type: "output", text: `Execution request failed: ${err.message}`, tab: "Terminal" },
      ]);
      setExecMeta({ running: false });
    } finally {
      setRunning(false);
    }
  };

  // Pushes a line into the bottom panel and makes sure it's visible — this
  // is CodeHive's "toast", so every menu action gives visible feedback
  // instead of silently doing nothing.
  const log = (text, type = "output", tab = "Output") => {
    setTerminalOutput((prev) => [...prev, { type, text, tab }]);
    setShowTerminal(true);
    setActiveTermTab(tab);
  };

  // "✨ Explain" button on an error line / Problems row — sends the current
  // code + that error to the backend's /api/execute/explain endpoint
  // (Groq's free API under the hood) and prints the AI's explanation back
  // into the Output tab.
  const handleExplainError = async (errorText) => {
    if (explaining) return;
    setExplaining(true);
    setActiveTermTab("Output");
    setShowTerminal(true);
    log("✨ Asking AI to explain this error…", "ai", "Output");
    try {
      const { data } = await axios.post("http://localhost:8086/api/execute/explain", {
        code,
        language,
        errorText,
      });
      log(data.explanation, data.available ? "ai" : "output", "Output");
    } catch (err) {
      log(`Couldn't get an AI explanation: ${err.message}`, "output", "Output");
    } finally {
      setExplaining(false);
    }
  };

  const activeFile = tabs[activeTab]?.name || "file";

  // Persists the current buffer to the backend (coding_sessions.code) so it
  // survives a reload / reconnect, not just clearing the "unsaved" dot.
  const saveToServer = async (markAll) => {
    if (!sessionToken) return;
    setSaving(true);
    try {
      await axios.put(`http://localhost:8086/api/sessions/${sessionToken}/code`, { code });
      setTabs((prev) =>
        markAll
          ? prev.map((tb) => ({ ...tb, unsaved: false }))
          : prev.map((tb, i) => (i === activeTab ? { ...tb, unsaved: false } : tb))
      );
      log(markAll ? "Saved all files" : `Saved ${activeFile}`, "success");
      toast.success(markAll ? "All files saved" : `${activeFile} saved`);
    } catch (err) {
      log(`Save failed: ${err.message}`, "output");
      toast.error("Couldn't save — check that the backend is running.");
    } finally {
      setSaving(false);
    }
  };

  const handleMenuClick = (menu) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMenuItemClick = (label) => {
    setActiveMenu(null);
    const ed = monacoEditorRef.current;
    const monaco = monacoRef.current;

    switch (label) {
      // ── File ──
      case "New file": {
        const name = window.prompt("New file name:", `untitled-${tabs.length + 1}.${current.ext}`);
        if (!name) return;
        setTabs((prev) => [...prev, { name, color: t.accent, active: false, unsaved: true }]);
        setActiveTab(tabs.length);
        return;
      }
      case "Open folder":
        log(`Opened folder: ~/workspace/${language}Project`, "path");
        return;
      case "Save":
        saveToServer(false);
        return;
      case "Save all":
        saveToServer(true);
        return;
      case "Share workspace": {
        const url = window.location.href;
        navigator.clipboard?.writeText(url).catch(() => {});
        log(`Session link copied to clipboard: ${url}`, "success");
        return;
      }
      case "Export project": {
        const blob = new Blob([code], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = activeFile;
        a.click();
        URL.revokeObjectURL(a.href);
        log(`Exported ${activeFile}`, "success");
        return;
      }
      case "Close editor":
        closeTab(activeTab, { stopPropagation: () => {} });
        return;

      // ── Edit ──
      case "Undo":
        ed?.focus();
        ed?.trigger("menu", "undo");
        return;
      case "Redo":
        ed?.focus();
        ed?.trigger("menu", "redo");
        return;
      case "Cut":
        ed?.focus();
        document.execCommand("cut");
        return;
      case "Copy":
        ed?.focus();
        document.execCommand("copy");
        return;
      case "Paste":
        ed?.focus();
        navigator.clipboard?.readText().then((text) => {
          if (text == null || !ed) return;
          const sel = ed.getSelection();
          ed.executeEdits("menu-paste", [{ range: sel, text }]);
        }).catch(() => log("Clipboard access was blocked by the browser", "output"));
        return;
      case "Find":
        ed?.focus();
        ed?.getAction("actions.find")?.run();
        return;
      case "Replace":
        ed?.focus();
        ed?.getAction("editor.action.startFindReplaceAction")?.run();
        return;
      case "Format document": {
        if (ed) {
          ed.focus();
          const ranAction = ed.getAction("editor.action.formatDocument");
          if (ranAction) {
            ranAction.run();
            log(`Formatted ${activeFile}`, "success");
            return;
          }
        }
        const formatted = code.split("\n").map((line) => line.replace(/\s+$/, "")).join("\n");
        setCode(formatted);
        log(`Formatted ${activeFile}`, "success");
        return;
      }

      // ── Selection ──
      case "Select all":
        ed?.focus();
        ed?.trigger("menu", "editor.action.selectAll");
        return;
      case "Select line":
        ed?.focus();
        ed?.getAction("expandLineSelection")?.run();
        return;
      case "Add cursor above":
        ed?.getAction("editor.action.insertCursorAbove")?.run();
        return;
      case "Add cursor below":
        ed?.getAction("editor.action.insertCursorBelow")?.run();
        return;
      case "Select all occurrences":
        ed?.getAction("editor.action.selectHighlights")?.run();
        return;
      case "Expand selection":
        ed?.getAction("editor.action.smartSelect.expand")?.run();
        return;
      case "Shrink selection":
        ed?.getAction("editor.action.smartSelect.shrink")?.run();
        return;

      // ── View ──
      case "Explorer":
        setSidebarVisible((v) => !v);
        return;
      case "Search": {
        const query = window.prompt("Search across files:");
        if (!query) return;
        log(`Search "${query}": ${code.includes(query) ? "1 result in " + activeFile : "no results"}`, "output");
        return;
      }
      case "Source control":
        log("No source control provider configured for this workspace yet.", "output");
        return;
      case "Terminal":
        setShowTerminal((v) => !v);
        return;
      case "Output panel":
        setShowTerminal(true);
        setActiveTermTab("Output");
        return;
      case "Minimap":
        setShowMinimap((v) => !v);
        return;
      case "Zoom in":
        setEditorFontSize((s) => Math.min(s + 1, 28));
        return;
      case "Zoom out":
        setEditorFontSize((s) => Math.max(s - 1, 9));
        return;

      // ── Go ──
      case "Go to line": {
        const n = parseInt(window.prompt("Go to line:"), 10);
        if (!n || !ed) return;
        ed.revealLineInCenter(n);
        ed.setPosition({ lineNumber: n, column: 1 });
        ed.focus();
        return;
      }
      case "Go to symbol":
        ed?.getAction("editor.action.quickOutline")?.run();
        return;
      case "Go to file": {
        const name = window.prompt("Go to file:", tabs[0]?.name);
        const idx = tabs.findIndex((tb) => tb.name === name);
        if (idx >= 0) setActiveTab(idx);
        return;
      }
      case "Navigate back":
      case "Navigate forward":
      case "Go to definition":
      case "Go to references":
      case "Peek definition":
        log(`${label} needs a language server for ${language}, which isn't wired up yet — syntax highlighting works, but IntelliSense doesn't.`, "output");
        return;

      // ── Run ──
      case "Run":
      case "Run without debug":
        handleRunCode();
        return;
      case "Stop":
        setRunning(false);
        log("Execution stopped.", "output");
        return;
      case "Debug":
      case "Pause":
      case "Step into":
      case "Step over":
      case "Step out":
      case "Manage configurations":
        log(`${label}: step-debugging isn't available for browser-run code yet — Run executes the whole file.`, "output");
        return;

      // ── Terminal ──
      case "New terminal":
        setShowTerminal(true);
        setActiveTermTab("Terminal");
        return;
      case "Split terminal":
        log("Split terminal isn't available yet — one terminal per session for now.", "output");
        return;
      case "Clear terminal":
        setTerminalOutput([]);
        return;
      case "Kill terminal":
        setShowTerminal(false);
        return;
      case "Configure shell":
        log("Shell: bash (default)", "output");
        return;

      // ── Help ──
      case "Documentation":
        window.open("https://github.com", "_blank", "noopener,noreferrer");
        return;
      case "Keyboard shortcuts":
        log("⌘S Save · ⌘F Find · ⌘/ Comment · ⌘\\` Terminal · F5 Run", "output");
        return;
      case "Command palette": {
        const query = window.prompt("Command palette — type a command:");
        if (query) handleMenuItemClick(query);
        return;
      }
      case "AI assistant ✨": {
        const lastProblem = problems.find((p) => p.severity === "error");
        const lastErrorLine = [...terminalOutput].reverse().find((l) => l.type === "error");
        const errorText = lastProblem
          ? `${lastProblem.message}${lastProblem.line != null ? ` (line ${lastProblem.line})` : ""}`
          : lastErrorLine?.text;
        if (errorText) {
          handleExplainError(errorText);
        } else {
          log("No errors to explain right now — run your code or wait for a diagnostic, then try again.", "output");
        }
        return;
      }
      case "Community forum":
      case "Report an issue":
        window.open("https://github.com", "_blank", "noopener,noreferrer");
        return;
      case "About CodeHive":
        log(`CodeHive — collaborative ${language} workspace · ${current.version}`, "success");
        return;
      case "Extensions":
        log("The extensions marketplace isn't available in this workspace yet.", "output");
        return;
      case "Settings":
        log("⌘S Save · ⌘F Find · ⌘/ Comment · ⌘\\` Terminal · F5 Run — theme can be changed from the pill toggle in the top bar.", "output");
        return;

      default:
        return;
    }
  };

  const closeTab = (i, e) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((_, idx) => idx !== i);
    setTabs(newTabs);
    if (activeTab >= newTabs.length) setActiveTab(newTabs.length - 1);
    else if (activeTab > i) setActiveTab(activeTab - 1);
  };

  return (
    <div
      className={theme === "futuristic" ? "fx-grid-bg" : ""}
      style={{
        background: t.bg,
        color: t.text,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        fontSize: 13,
        overflow: "hidden",
        transition: "background 0.3s ease, color 0.3s ease",
        position: "relative",
        "--accent-1": t.accent,
        "--accent-2": t.accentStrong,
      }}
      onClick={() => setActiveMenu(null)}
    >
      {(joinStatus === "pending" || joinStatus === "denied") && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: `${t.bgDeep}ee`,
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 16,
            textAlign: "center",
            padding: 24,
          }}
        >
          {joinStatus === "pending" ? (
            <>
              <div
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  border: `3px solid ${t.border2}`,
                  borderTopColor: t.accent,
                  animation: "codehive-spin 0.8s linear infinite",
                }}
              />
              <div style={{ fontSize: 16, fontWeight: 600, color: t.text }}>
                Waiting for the host to let you in…
              </div>
              <div style={{ fontSize: 13, color: t.textDim, maxWidth: 340 }}>
                {userName}, you've requested to join this session. It'll open automatically once approved.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32 }}>🚫</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: t.text }}>
                Your request to join wasn't approved
              </div>
              <button
                onClick={() => window.history.back()}
                style={{
                  marginTop: 4, padding: "8px 18px", borderRadius: 6, border: "none",
                  background: t.accent, color: t.bgDeep, fontWeight: 600, cursor: "pointer",
                }}
              >
                Back to dashboard
              </button>
            </>
          )}
        </div>
      )}
      {/* ── TITLE BAR (CodePalate-style) ── */}
      <div
        style={{
          background: t.bgPanel,
          height: 60,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderBottom: `1px solid ${t.border}`,
          flexShrink: 0,
          gap: 18,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: `linear-gradient(135deg, ${t.accent}, ${t.accentStrong})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, color: "#fff", fontWeight: 800,
          }}>
            {"</>"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>
              Code<span style={{ color: t.accent }}>Hive</span>
            </div>
            <div style={{ fontSize: 10.5, color: t.textDim }}>Code • Build • Run • Debug</div>
          </div>
        </div>

        {/* Search bar (jumps between open tabs / files) */}
        <div
          style={{
            flex: 1,
            maxWidth: 460,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 10,
            border: `1px solid ${t.border2}`,
            background: t.bgDeep,
            color: t.textDim,
            fontSize: 12.5,
          }}
        >
          <span>🔍</span>
          <span style={{ flex: 1, textAlign: "left" }}>
            {sessionHostName ? `${sessionHostName === userName ? "You" : sessionHostName}${sessionHostName ? " · Host" : ""}` : "Search files, symbols..."}
          </span>
          <span style={{
            fontSize: 10.5, padding: "2px 6px", borderRadius: 5,
            border: `1px solid ${t.border2}`, color: t.muted,
          }}>
            Ctrl K
          </span>
        </div>

        {/* Light / Dark pill toggle */}
        <button
          title="Toggle theme"
          onClick={(e) => {
            e.stopPropagation();
            setTheme((cur) => {
              const next = THEME_ORDER[(THEME_ORDER.indexOf(cur) + 1) % THEME_ORDER.length];
              return next;
            });
          }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: t.bgDeep, border: `1px solid ${t.border2}`,
            borderRadius: 999, padding: "6px 12px", fontSize: 12,
            color: t.textDim, cursor: "pointer", flexShrink: 0,
            textShadow: theme === "futuristic" ? t.glow : "none",
          }}
        >
          {THEME_LABEL[theme]}
        </button>

        {/* Save lives in the toolbar row below now — avoids showing two Save buttons at once */}

        {/* Share — copies the session link, same as the dashboard's share action */}
        <button
          className="glow-btn"
          title="Copy session link"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              await navigator.clipboard.writeText(window.location.href);
              log("Session link copied to clipboard.", "success");
            } catch {
              log("Couldn't copy the link — copy it from the address bar.", "output");
            }
          }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "transparent", border: `1px solid ${t.border2}`,
            borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 600,
            color: t.textNormal, cursor: "pointer", flexShrink: 0,
          }}
        >
          🔗 Share
        </button>

        {/* Run and the language badge live in the toolbar row below now — avoids showing them twice */}
      </div>

      {/* ── MENU BAR + TOOLBAR (merged into one row — was two stacked rows with duplicate Save/Run/language controls) ── */}
      <div
        style={{
          background: t.bgPanel,
          height: 38,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          borderBottom: `1px solid ${t.border}`,
          flexShrink: 0,
          position: "relative",
          zIndex: 200,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {Object.keys(menuConfig).map((menu) => (
          <div key={menu} style={{ position: "relative" }}>
            <div
              onClick={() => handleMenuClick(menu)}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                cursor: "pointer",
                color: activeMenu === menu ? t.text : t.textNormal,
                fontSize: 12.5,
                background: activeMenu === menu ? t.border : "transparent",
                userSelect: "none",
                transition: "background 0.12s ease, color 0.12s ease",
              }}
              onMouseEnter={() => activeMenu && setActiveMenu(menu)}
            >
              {menu}
            </div>
            {activeMenu === menu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  background: t.dropdown,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 8,
                  minWidth: 220,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)",
                  padding: "6px 0",
                  animation: "codehive-menu-in 0.12s ease-out",
                }}
              >
                {menuConfig[menu].map((item, i) =>
                  item.type === "sep" ? (
                    <div
                      key={i}
                      style={{ height: 1, background: t.border, margin: "4px 8px" }}
                    />
                  ) : (
                    <div
                      key={i}
                      onClick={() => handleMenuItemClick(item.label)}
                      style={{
                        padding: "6px 16px",
                        cursor: "pointer",
                        color: t.textNormal,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        fontSize: 12.5,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.hover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {item.icon && <span style={{ fontSize: 13, width: 16 }}>{item.icon}</span>}
                        {item.label}
                      </span>
                      {item.shortcut && (
                        <span style={{ color: t.muted, fontSize: 11.5 }}>{item.shortcut}</span>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}

        <div style={toolSepStyle(t)} />
        {[
          { icon: "📄", title: "New file", action: "New file" },
          { icon: "📂", title: "Open", action: "Open folder" },
        ].map((b) => (
          <button key={b.title} title={b.title} style={toolBtnStyle(t)} onClick={() => handleMenuItemClick(b.action)}>
            {b.icon}
          </button>
        ))}
        <div style={toolSepStyle(t)} />
        {[
          { icon: "↩", title: "Undo", action: "Undo" },
          { icon: "↪", title: "Redo", action: "Redo" },
        ].map((b) => (
          <button key={b.title} title={b.title} style={toolBtnStyle(t)} onClick={() => handleMenuItemClick(b.action)}>
            {b.icon}
          </button>
        ))}
        <div style={toolSepStyle(t)} />
        {[
          { icon: "🔍", title: "Find", action: "Find" },
          { icon: "⬡", title: "Format", action: "Format document" },
          { icon: "🔀", title: "Git", action: "Source control" },
          { icon: "🐛", title: "Debug", action: "Debug" },
        ].map((b) => (
          <button key={b.title} title={b.title} style={toolBtnStyle(t)} onClick={() => handleMenuItemClick(b.action)}>
            {b.icon}
          </button>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Sync + language + Save + History + Run + User */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            style={{
              padding: "3px 10px",
              background: "transparent",
              border: `1px solid ${t.border2}`,
              borderRadius: 4,
              color: t.textDim,
              fontSize: 11.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ↑ Sync
          </button>

          {/* Language / version badge (host can change it via the select below) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: t.accentBg,
              border: `1px solid ${t.accentStrong}`,
              borderRadius: 5,
              padding: "4px 10px",
              color: t.accent,
              fontSize: 12,
            }}
          >
            <img src={current.logo} alt="" style={{ width: 13, height: 13 }} />
            {current.version}
          </div>

          {myRole === "HOST" && (
            <select
              value={language}
              onChange={(e) => {
                const newLang = e.target.value;
                setLanguage(newLang);
                socketRef.current?.emit("change_language", { sessionToken, language: newLang });
              }}
              title="Only the host can change the session language"
              style={{
                background: "transparent", border: `1px solid ${t.border}`, borderRadius: 5,
                color: t.textNormal, fontSize: 12, padding: "3px 8px", cursor: "pointer",
              }}
            >
              {Object.keys(languageInfo).map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          )}

          <button
            className="glow-btn"
            title="Save (Ctrl/Cmd+S)"
            onClick={() => saveToServer(false)}
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: t.border,
              border: `1px solid ${t.border2}`,
              borderRadius: 5,
              padding: "4px 10px",
              color: saving ? t.muted : t.textNormal,
              fontSize: 12.5,
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Saving…" : (tabs[activeTab]?.unsaved ? "● Save" : "💾 Save")}
          </button>

          <button
            onClick={async () => {
              setShowSnapshots((v) => !v);
              if (!showSnapshots && sessionToken) {
                try {
                  const { data } = await axios.get(`http://localhost:8086/api/sessions/${sessionToken}/snapshots`);
                  setSnapshots(data || []);
                } catch {
                  setSnapshots([]);
                }
              }
            }}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: "transparent",
              border: `1px solid ${t.border}`, borderRadius: 5, padding: "4px 12px",
              color: t.textNormal, fontSize: 12.5, fontWeight: 500, cursor: "pointer",
            }}
          >
            🕘 History
          </button>

          <button
            className="glow-btn"
            onClick={() => myRole !== "OBSERVER" && handleMenuItemClick("Run")}
            disabled={myRole === "OBSERVER"}
            title={myRole === "OBSERVER" ? "Observers are view-only" : "Run (Ctrl/Cmd+Enter)"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: myRole === "OBSERVER" ? "#4b5563" : `linear-gradient(90deg, ${t.accent}, ${t.accentStrong})`,
              border: "none",
              borderRadius: 8,
              padding: "6px 16px",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: myRole === "OBSERVER" ? "not-allowed" : "pointer",
              opacity: myRole === "OBSERVER" ? 0.6 : 1,
              boxShadow: myRole === "OBSERVER" ? "none" : `0 6px 16px ${t.accentBg}`,
            }}
          >
            ▶ Run
          </button>

          <div
            onClick={() => setProfileTarget(userName)}
            role="button"
            tabIndex={0}
            title="View your profile"
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setProfileTarget(userName); } }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: t.border,
              border: `1px solid ${t.border2}`,
              borderRadius: 20,
              padding: "3px 10px 3px 5px",
              cursor: "pointer",
              color: t.textNormal,
              fontSize: 12,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: t.avatarGradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 600,
                color: t.bg,
              }}
            >
              {initials}
            </div>
            {userName}
          </div>
        </div>
      </div>

      {/* FR-07 / AC-06: Code Snapshot History */}
      {showSnapshots && (
        <div
          style={{
            position: "absolute", top: 44, right: 250, width: 340, maxHeight: 420,
            background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 50, display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.textNormal }}>Snapshot History</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={async () => {
                  if (!sessionToken) return;
                  try {
                    const { data } = await axios.post(`http://localhost:8086/api/sessions/${sessionToken}/snapshots`, { code });
                    setSnapshots((prev) => [data, ...prev]);
                    toast.success("Snapshot saved");
                  } catch {
                    toast.error("Couldn't save a snapshot.");
                  }
                }}
                style={{ fontSize: 11, background: t.accent, border: "none", borderRadius: 4, padding: "3px 8px", color: "#fff", cursor: "pointer" }}
              >
                Snapshot now
              </button>
              <button onClick={() => setShowSnapshots(false)} style={{ background: "transparent", border: "none", color: t.textDim, cursor: "pointer" }}>✕</button>
            </div>
          </div>
          <div style={{ overflowY: "auto", padding: "6px 0" }}>
            {snapshots.length === 0 && (
              <div style={{ padding: 14, fontSize: 12, color: t.textDim }}>No snapshots yet — they're taken automatically every 5 minutes and on each run.</div>
            )}
            {snapshots.map((s) => (
              <div key={s.id} style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}`, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: t.textNormal }}>
                  <span>{new Date(s.createdAt).toLocaleString()}</span>
                  <span style={{ fontSize: 10, opacity: 0.6 }}>{s.trigger}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  {myRole === "HOST" ? (
                    <button
                      onClick={async () => {
                        if (!window.confirm("Restore this snapshot? Your current code will be replaced.")) return;
                        try {
                          const { data } = await axios.post(`http://localhost:8086/api/sessions/${sessionToken}/snapshots/${s.id}/restore`);
                          setCode(data.code || "");
                          if (socketRef.current) socketRef.current.emit("code_change", { sessionToken, code: data.code || "", userName });
                          toast.success("Snapshot restored");
                          setShowSnapshots(false);
                        } catch (err) {
                          toast.error(err?.response?.data?.message || "Only the host can restore a snapshot.");
                        }
                      }}
                      style={{ fontSize: 11, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 8px", color: t.textNormal, cursor: "pointer" }}
                    >
                      Restore
                    </button>
                  ) : (
                    <span style={{ fontSize: 10, color: t.textDim }}>Only the host can restore</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN BODY ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ACTIVITY BAR */}
        <div
          style={{
            width: 44,
            background: t.bgPanel,
            borderRight: `1px solid ${t.border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "6px 0",
            gap: 2,
            flexShrink: 0,
          }}
        >
          {[
            { icon: "📁", title: "Explorer", active: sidebarVisible, onClick: () => setSidebarVisible((v) => !v) },
            { icon: "🔍", title: "Search", onClick: () => handleMenuItemClick("Search") },
            { icon: "🌿", title: "Source control", badge: true, onClick: () => handleMenuItemClick("Source control") },
            { icon: "🐛", title: "Debug", onClick: () => handleMenuItemClick("Debug") },
            { icon: "🔌", title: "Extensions", onClick: () => handleMenuItemClick("Extensions") },
          ].map((b) => (
            <div
              key={b.title}
              title={b.title}
              onClick={b.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); b.onClick?.(); } }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                cursor: "pointer",
                color: b.active ? t.text : t.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
                background: b.active ? t.border : "transparent",
                position: "relative",
              }}
            >
              {b.icon}
              {b.badge && (
                <div
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 8,
                    height: 8,
                    background: t.danger,
                    borderRadius: "50%",
                    border: `1px solid ${t.bgPanel}`,
                  }}
                />
              )}
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div
            title="Settings"
            onClick={() => handleMenuItemClick("Settings")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleMenuItemClick("Settings"); } }}
            style={{
              width: 36, height: 36, borderRadius: 6, cursor: "pointer",
              color: t.muted, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 17,
            }}
          >
            ⚙️
          </div>
        </div>

        {/* SIDEBAR — FEATURE 1: Advanced File Explorer */}
        {sidebarVisible && (
          <FileExplorer
            sessionToken={sessionToken}
            activeFileId={activeFileNode?.id}
            theme={t}
            onOpenFile={handleOpenExplorerFile}
          />
        )}

        {/* CENTER PANEL */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* TABS */}
          <div
            style={{
              height: 36,
              background: t.bg,
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "flex-end",
              overflowX: "auto",
              flexShrink: 0,
            }}
          >
            {tabs.map((tab, i) => (
              <div
                key={tab.name}
                onClick={() => setActiveTab(i)}
                style={{
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "0 14px",
                  cursor: "pointer",
                  color: activeTab === i ? t.text : t.textDim,
                  fontSize: 12.5,
                  borderRight: `1px solid ${t.border}`,
                  borderTop: activeTab === i ? `1px solid ${t.accentStrong}` : "1px solid transparent",
                  background: activeTab === i ? t.bgPanel : "transparent",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <span style={{ color: tab.color, fontSize: 13 }}>⬡</span>
                {tab.name}
                {tab.unsaved && (
                  <div
                    style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: t.warning, flexShrink: 0,
                    }}
                  />
                )}
                <div
                  onClick={(e) => closeTab(i, e)}
                  style={{
                    width: 14, height: 14, borderRadius: 3,
                    display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 11,
                    color: t.muted, cursor: "pointer",
                  }}
                >
                  ×
                </div>
              </div>
            ))}
          </div>

          {/* EDITOR */}
          <div
            style={{
              flex: 1,
              background: t.bg,
              display: "flex",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Monaco editor — real syntax highlighting, gutter, minimap */}
            <MonacoEditor
              key={theme === "light" ? "light" : "dark"}
              language={current.monaco}
              value={code}
              theme={theme === "light" ? "vs" : "vs-dark"}
              onChange={(value) => {
                setCode(value ?? "");
                if (!sessionToken || !socketRef.current) return;
                socketRef.current.emit("typing", { sessionToken, userName });
              }}
              onMount={(editorInstance, monacoInstance) => {
                monacoEditorRef.current = editorInstance;
                monacoRef.current = monacoInstance;

                // FR-01: broadcast our cursor position + selection so
                // other participants can render a color-coded remote
                // cursor for us. Light debounce via a rAF-style timeout
                // to avoid flooding the socket on every keystroke.
                let pending = null;
                const emitCursor = () => {
                  if (pending) return;
                  pending = setTimeout(() => {
                    pending = null;
                    if (!sessionToken || !socketRef.current) return;
                    const pos = editorInstance.getPosition();
                    const sel = editorInstance.getSelection();
                    socketRef.current.emit("cursor_move", {
                      sessionToken,
                      userName,
                      socketId: socketRef.current.id,
                      position: pos ? { lineNumber: pos.lineNumber, column: pos.column } : null,
                      selection: sel && !sel.isEmpty()
                        ? {
                            startLineNumber: sel.startLineNumber,
                            startColumn: sel.startColumn,
                            endLineNumber: sel.endLineNumber,
                            endColumn: sel.endColumn,
                          }
                        : null,
                    });
                  }, 80);
                };
                editorInstance.onDidChangeCursorPosition(emitCursor);
                editorInstance.onDidChangeCursorSelection(emitCursor);
              }}
              options={{
                fontSize: editorFontSize,
                fontFamily: "Menlo, 'Courier New', monospace",
                lineHeight: 1.6,
                minimap: { enabled: showMinimap },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                padding: { top: 14 },
                readOnly: myRole === "OBSERVER",
              }}
            />
            {myRole === "OBSERVER" && (
              <div style={{
                position: "absolute", top: 8, right: 16, background: "rgba(250,204,21,0.15)",
                color: "#facc15", border: "1px solid rgba(250,204,21,0.4)", borderRadius: 6,
                padding: "3px 10px", fontSize: 11, fontWeight: 600,
              }}>
                Observer — view only
              </div>
            )}
          </div>

          {/* TERMINAL / OUTPUT — FEATURE 2: Professional Output Panel */}
          {showTerminal && (
            <OutputPanel
              entries={terminalOutput.map((line, i) => ({
                id: i,
                tab: line.tab || "Output",
                kind: line.type === "path" || line.type === "prompt" ? "prompt" : line.type,
                text: line.type === "path" ? `${line.text} \u276f` : line.text,
              }))}
              problems={problems}
              execMeta={execMeta}
              theme={t}
              defaultTab={activeTermTab}
              onClear={(tabId) =>
                setTerminalOutput((prev) => prev.filter((line) => (line.tab || "Output") !== tabId))
              }
              onClose={() => setShowTerminal(false)}
              onExplain={handleExplainError}
              explaining={explaining}
            />
          )}
        </div>

        {/* OUTPUT PANEL */}
        <div
          style={{
            width: 240,
            background: t.bgPanel,
            borderLeft: `1px solid ${t.border}`,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: `1px solid ${t.border}`,
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              onClick={() => setRightPanelTab("output")}
              style={{
                cursor: "pointer",
                color: rightPanelTab === "output" ? t.successText : t.textDim,
              }}
            >
              Output
            </span>
            <span
              onClick={() => setRightPanelTab("chat")}
              style={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: rightPanelTab === "chat" ? t.successText : t.textDim,
              }}
            >
              Chat
              {rightPanelTab !== "chat" && unreadChatCount > 0 && (
                <span
                  title={`${unreadChatCount} unread message${unreadChatCount === 1 ? "" : "s"}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 8,
                    background: t.danger || "#ef4444",
                    color: "#fff",
                    fontSize: 9.5,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {unreadChatCount > 99 ? "99+" : unreadChatCount}
                </span>
              )}
            </span>
          </div>

          {/* FEATURE 1: Host Controls — only rendered for the host */}
          <HostControlPanel
            t={t}
            isHost={isHost}
            locked={hostControls.locked}
            chatMuted={hostControls.chatMuted}
            stats={hostControls.stats}
            onStart={hostControls.startSession}
            onEnd={hostControls.endSession}
            onLock={hostControls.lockSession}
            onUnlock={hostControls.unlockSession}
            onCopyInviteLink={hostControls.copyInviteLink}
            onCopySessionToken={hostControls.copySessionToken}
            onOpenInviteModal={() => setShowInviteModal(true)}
            onOpenKickModal={() => setShowKickModal(true)}
            onOpenTransferModal={() => setShowTransferModal(true)}
            onMuteChat={hostControls.muteChat}
            onUnmuteChat={hostControls.unmuteChat}
            onRefreshStats={hostControls.refreshStats}
          />

          {/* FEATURE 2: Participant Panel — status, typing, cursor color, host dropdown */}
          <ParticipantPanel
            t={t}
            participants={onlineParticipants}
            participantRoles={participantRoles}
            sessionHostName={sessionHostName}
            userName={userName}
            isHost={isHost}
            statusFor={participantPresence.statusFor}
            isMuted={participantPresence.isMuted}
            typingUsers={typingUsers}
            cursorColorFor={(name) => Object.values(remoteCursors).find((c) => c.userName === name)?.color || null}
            onSetRole={(targetSocketId, role) => {
              getSocket().emit("set_participant_role", { sessionToken, targetSocketId, role });
            }}
            onViewProfile={(name) => setProfileTarget(name)}
            onKick={hostControls.kickParticipant}
            onTransferHost={hostControls.transferHost}
            onMuteUser={(socketId) => getSocket().emit("mute_user", { sessionToken, targetSocketId: socketId })}
            onUnmuteUser={(socketId) => getSocket().emit("unmute_user", { sessionToken, targetSocketId: socketId })}
          />

          {rightPanelTab === "output" ? (
            <div
              style={{
                flex: 1,
                padding: "10px 12px",
                fontFamily: "Menlo, monospace",
                fontSize: 12,
                lineHeight: 1.6,
                overflowY: "auto",
              }}
            >
              {terminalOutput.map((line, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 4,
                    color:
                      line.type === "success"
                        ? t.successText
                        : line.type === "path"
                        ? t.accent
                        : t.textDim,
                    fontSize: line.type === "path" ? 11 : 12,
                  }}
                >
                  {line.text}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontSize: 12,
                  lineHeight: 1.5,
                  overflowY: "auto",
                }}
              >
                {chatMessages.length === 0 && (
                  <div style={{ color: t.muted }}>No messages yet — say hi 👋</div>
                )}
                {chatMessages.map((m, i) =>
                  m.system ? (
                    <div key={i} style={{ color: t.muted, fontStyle: "italic", marginBottom: 6 }}>
                      {m.message}
                    </div>
                  ) : (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <span style={{ color: t.accent, fontWeight: 600 }}>
                        {m.senderName}:{" "}
                      </span>
                      <span style={{ color: t.textNormal }}>{m.message}</span>
                    </div>
                  )
                )}
              </div>
              <div
                style={{
                  borderTop: `1px solid ${t.border}`,
                  padding: 8,
                  display: "flex",
                  gap: 6,
                }}
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendChatMessage();
                  }}
                  placeholder="Message the room…"
                  style={{
                    flex: 1,
                    background: t.bgDeep,
                    border: `1px solid ${t.border2}`,
                    borderRadius: 4,
                    color: t.text,
                    padding: "6px 8px",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleSendChatMessage}
                  style={{
                    background: t.accent,
                    color: t.bgDeep,
                    border: "none",
                    borderRadius: 4,
                    padding: "0 12px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div
        style={{
          height: 24,
          background: t.statusBar,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          flexShrink: 0,
          color: "#fff",
          fontSize: 11.5,
        }}
      >
        {[
          { label: "🌿 main", onClick: () => handleMenuItemClick("Source control") },
          { label: "✕ 0", color: "#ff7b72", onClick: () => { setShowTerminal(true); setActiveTermTab("Problems"); } },
          { label: "⚠ 2", color: t.warning, onClick: () => { setShowTerminal(true); setActiveTermTab("Problems"); } },
        ].map((item) => (
          <div
            key={item.label}
            onClick={item.onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); item.onClick?.(); } }}
            style={{
              padding: "0 8px",
              cursor: "pointer",
              height: "100%",
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: item.color || "#fff",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        {[
          { label: "Ln 9, Col 42", onClick: () => handleMenuItemClick("Go to line") },
          { label: "UTF-8", onClick: () => log("Encoding: UTF-8", "output") },
          { label: "Spaces: 4", onClick: () => log("Indentation: 4 spaces", "output") },
          { label: current.version, onClick: () => handleMenuItemClick("About CodeHive") },
        ].map((s) => (
          <div
            key={s.label}
            onClick={s.onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); s.onClick?.(); } }}
            style={{
              padding: "0 8px",
              cursor: "pointer",
              height: "100%",
              display: "flex",
              alignItems: "center",
              whiteSpace: "nowrap",
            }}
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* FEATURE 1: Host Controls — modals (host-only; harmless to mount always, they render null when closed) */}
      <ParticipantPickerModal
        t={t}
        open={showKickModal}
        title="🚫 Kick a participant"
        actionLabel="Kick"
        danger
        participants={participantRoles}
        myUserName={userName}
        onPick={hostControls.kickParticipant}
        onClose={() => setShowKickModal(false)}
      />
      <ParticipantPickerModal
        t={t}
        open={showTransferModal}
        title="🔄 Transfer host to"
        actionLabel="Make Host"
        participants={participantRoles}
        myUserName={userName}
        onPick={hostControls.transferHost}
        onClose={() => setShowTransferModal(false)}
      />
      <InviteModal
        t={t}
        open={showInviteModal}
        sessionToken={sessionToken}
        onCopyLink={hostControls.copyInviteLink}
        onCopyToken={hostControls.copySessionToken}
        onClose={() => setShowInviteModal(false)}
      />
      <ProfileModal
        t={t}
        open={!!profileTarget}
        participantName={profileTarget}
        role={participantRoles.find((r) => r.userName === profileTarget)?.role || (profileTarget === sessionHostName ? "HOST" : "COLLABORATOR")}
        onClose={() => setProfileTarget(null)}
      />
    </div>
  );
}

// Shared micro styles (theme-aware — call with the active theme object)
const toolBtnStyle = (t) => ({
  width: 26,
  height: 26,
  borderRadius: 4,
  cursor: "pointer",
  color: t.textDim,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 15,
  border: "none",
  background: "transparent",
});

const toolSepStyle = (t) => ({
  width: 1,
  height: 16,
  background: t.border2,
  margin: "0 4px",
});