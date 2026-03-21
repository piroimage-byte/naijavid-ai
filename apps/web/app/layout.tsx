import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import SiteNavbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "NaijaVid AI",
  description: "Create short AI videos from images",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <SiteNavbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}