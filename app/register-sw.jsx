"use client";
import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal — the app works fine without offline support.
      });
    }
  }, []);
  return null;
}
