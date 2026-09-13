export default function manifest() {
  return {
    name: "Iron Ledger",
    short_name: "IronLedger",
    description: "Progressive overload and nutrition tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#14171c",
    theme_color: "#14171c",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
