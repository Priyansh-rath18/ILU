"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "iron-ledger-music-url";

// Turns a normal YouTube link into its official no-cookie embed URL.
// Returns null for anything that doesn't match a known, trusted pattern —
// callers must never fall back to rendering the raw input as an iframe src.
// (Spotify support is planned as a separate OAuth-based feature later.)
function toEmbedUrl(raw) {
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "youtube.com" && host !== "youtu.be" && host !== "music.youtube.com") {
    return null;
  }

  const listId = url.searchParams.get("list");
  if (listId) {
    return { src: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(listId)}` };
  }
  let videoId = url.searchParams.get("v");
  if (!videoId && host === "youtu.be") videoId = url.pathname.slice(1);
  if (videoId) {
    return { src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` };
  }
  return null;
}

export default function MusicPlayer() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [embed, setEmbed] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      const parsed = toEmbedUrl(saved);
      if (parsed) {
        setEmbed(parsed);
        setInput(saved);
      }
    }
  }, []);

  function handleLoad() {
    const parsed = toEmbedUrl(input);
    if (!parsed) {
      setError("Paste a YouTube video or playlist link.");
      return;
    }
    setError("");
    setEmbed(parsed);
    window.localStorage.setItem(STORAGE_KEY, input.trim());
  }

  function handleClear() {
    setEmbed(null);
    setInput("");
    setError("");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="music-bar">
      <button className="music-toggle" onClick={() => setOpen((o) => !o)}>
        🎵 {embed ? "Now playing" : "Add music"}
        <span className="chev">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="music-panel">
          <div className="music-input-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a YouTube video or playlist link"
            />
            <button className="addset" style={{ width: "auto", padding: "8px 14px" }} onClick={handleLoad}>
              Load
            </button>
          </div>
          {error && <div className="music-error">{error}</div>}
          {embed && (
            <>
              <iframe
                key={embed.src}
                src={embed.src}
                title="Music player"
                width="100%"
                height={200}
                frameBorder="0"
                allow="autoplay; encrypted-media; fullscreen; clipboard-write"
                loading="lazy"
              />
              <button className="music-clear" onClick={handleClear}>
                Remove player
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}