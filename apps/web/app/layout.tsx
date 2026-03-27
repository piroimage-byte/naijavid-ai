import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NaijaVid AI",
  description: "Create short AI videos from images",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}