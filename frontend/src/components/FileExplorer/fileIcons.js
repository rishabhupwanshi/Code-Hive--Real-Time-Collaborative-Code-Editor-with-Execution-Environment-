// FEATURE 1 — Advanced File Explorer: icon + accent color per file type.
// Kept as plain emoji/glyphs (no icon font dependency) so this drops into
// any project without extra installs.

const ICONS = {
  java: { icon: "☕", color: "#f89820" },
  js: { icon: "JS", color: "#f7df1e" },
  jsx: { icon: "⚛", color: "#61dafb" },
  ts: { icon: "TS", color: "#3178c6" },
  tsx: { icon: "⚛", color: "#61dafb" },
  html: { icon: "🌐", color: "#e34c26" },
  css: { icon: "🎨", color: "#2965f1" },
  json: { icon: "{}", color: "#cbcb41" },
  xml: { icon: "</>", color: "#e37933" },
  properties: { icon: "⚙", color: "#8bc34a" },
  md: { icon: "📝", color: "#a0a0a0" },
  py: { icon: "🐍", color: "#3572A5" },
  c: { icon: "C", color: "#5c6bc0" },
  cpp: { icon: "C++", color: "#00599c" },
  rb: { icon: "💎", color: "#cc342d" },
  php: { icon: "🐘", color: "#8993be" },
  yml: { icon: "⚙", color: "#8bc34a" },
  yaml: { icon: "⚙", color: "#8bc34a" },
  gitignore: { icon: "🚫", color: "#888" },
  txt: { icon: "📄", color: "#a0a0a0" },
};

const DEFAULT_FILE_ICON = { icon: "📄", color: "#a0a0a0" };
export const FOLDER_ICON_CLOSED = "📁";
export const FOLDER_ICON_OPEN = "📂";

export function iconForFile(name) {
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  return ICONS[ext] || DEFAULT_FILE_ICON;
}

export function languageForFile(name) {
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  const map = {
    java: "java", js: "javascript", jsx: "javascript", ts: "typescript",
    tsx: "typescript", html: "html", css: "css", json: "json", xml: "xml",
    properties: "ini", md: "markdown", py: "python", c: "c", cpp: "cpp",
    rb: "ruby", php: "php", yml: "yaml", yaml: "yaml", txt: "plaintext",
  };
  return map[ext] || "plaintext";
}
