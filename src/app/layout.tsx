import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/styles.css";
import { PatientProvider } from "@/context/patient-context";
import { AppShell } from "@/components/layout/app-shell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#7b4fe0",
};

export const metadata: Metadata = {
  title: "SmrkoMed Patient Portal",
  description:
    "SmrkoMed Patient Portal — Manage appointments, doctor consultations, medical reports, prescriptions, and your personalized Care Loop.",
  manifest: "/manifest.json",
  icons: {
    icon: "/branding/favicon.png",
    apple: "/branding/favicon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-[100dvh] bg-background text-foreground font-sans antialiased selection:bg-brand/20 selection:text-brand-dark">
        <PatientProvider>
          <AppShell>{children}</AppShell>
        </PatientProvider>
      </body>
    </html>
  );
}
