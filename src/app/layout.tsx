import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inco Grove — Private RPG",
  description:
    "Top-down pixel RPG with encrypted inventory & stats on Inco Lightning (Base Sepolia).",
};

export const viewport: Viewport = {
  themeColor: "#081428",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#081428" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
