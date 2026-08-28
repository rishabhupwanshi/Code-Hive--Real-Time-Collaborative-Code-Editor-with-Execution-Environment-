// FEATURE 2 — Professional Output Panel: ANSI SGR (\x1b[...m) → styled spans.
// Self-contained so OutputPanel can be dropped into any screen without
// depending on Editor.jsx internals.

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

export function ansiToSpans(raw, defaultColor) {
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

// Strips ANSI codes for the plain-text download (a saved log file with raw
// escape bytes in it is unreadable in most text editors).
export function stripAnsi(raw) {
  if (typeof raw !== "string") return raw ?? "";
  return raw.replace(/\x1b\[[0-9;]*m/g, "");
}
