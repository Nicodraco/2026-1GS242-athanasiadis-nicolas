import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { isClerkConfigured } from "@/lib/env";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UrbanSprout | Kits de cultivo para apartamentos",
  description:
    "UrbanSprout: Sostenible sin salir de casa. Ecommerce B2C para vender kits pequeños de cultivos para hogares, apartamentos y zonas urbanas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkConfigured = isClerkConfigured();

  return (
    <html lang="es" className={`${fraunces.variable} ${sourceSans.variable}`}>
      <body>{clerkConfigured ? <ClerkProvider>{children}</ClerkProvider> : children}</body>
    </html>
  );
}
