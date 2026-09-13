import "./globals.css";
import Providers from "./providers";
import RegisterSW from "./register-sw";

export const metadata = {
  title: "Iron Ledger",
  description: "Progressive overload and nutrition tracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Iron Ledger",
  },
};

export const viewport = {
  themeColor: "#14171c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <RegisterSW />
      </body>
    </html>
  );
}