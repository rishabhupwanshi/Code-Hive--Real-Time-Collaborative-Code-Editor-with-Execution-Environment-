// FEATURE 2 — Participant Panel presence logic.
//
// Derives per-participant status (online/idle) from cursor-move activity
// already tracked by Editor.jsx's `remoteCursors` map, and listens for
// the `muted_users` broadcast added alongside the mute_user/unmute_user
// socket events. Pure derivation — no new socket connection here.
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

const IDLE_AFTER_MS = 30_000;

export function useParticipantPresence({ socket, remoteCursors, userName }) {
  const [now, setNow] = useState(Date.now());
  const [mutedUserIds, setMutedUserIds] = useState([]);

  // Tick every 5s so idle status re-evaluates without needing new socket events.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleMutedUsers = (ids) => setMutedUserIds(ids || []);
    const handleYouMuted = () => toast.error("You've been muted by the host.");
    const handleYouUnmuted = () => toast.success("You can chat again — host unmuted you.");
    socket.on("muted_users", handleMutedUsers);
    socket.on("you_were_muted", handleYouMuted);
    socket.on("you_were_unmuted", handleYouUnmuted);
    return () => {
      socket.off("muted_users", handleMutedUsers);
      socket.off("you_were_muted", handleYouMuted);
      socket.off("you_were_unmuted", handleYouUnmuted);
    };
  }, [socket]);

  /** "online" | "idle" for a given participant, by userName. Falls back to "online" (no data yet = just joined). */
  const statusFor = (name) => {
    const entry = Object.values(remoteCursors || {}).find((c) => c.userName === name);
    if (!entry) return "online"; // no cursor activity recorded yet — assume fresh join
    return now - entry.updatedAt > IDLE_AFTER_MS ? "idle" : "online";
  };

  const isMuted = (socketId) => mutedUserIds.includes(socketId);

  return { statusFor, isMuted };
}
