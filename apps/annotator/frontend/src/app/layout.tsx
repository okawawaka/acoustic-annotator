import type { Metadata, Viewport } from "next";
import "./globals.css";

const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/acoustic-annotator" : "";

export const metadata: Metadata = {
  title: "Acoustic Annotator",
  description: "Acoustic Analysis & Praat TextGrid Annotator",
  manifest: `${basePath}/manifest.json`,
  icons: {
    icon: [
      { url: `${basePath}/favicon.ico`, sizes: "any" },
      { url: `${basePath}/favicon.svg`, type: "image/svg+xml" },
      { url: `${basePath}/icon-192.png`, type: "image/png", sizes: "192x192" },
    ],
    shortcut: `${basePath}/favicon.ico`,
    apple: [
      { url: `${basePath}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Annotator",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen bg-[#f9f9fb] text-[#111111] font-sans flex flex-col">
        {children}
      </body>
    </html>
  );
}