import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Personal OS",
  description: "Your life, optimized. Health, training, nutrition, goals, finance — all in one.",
  appleWebApp: {
    capable: true,
    title: "Personal OS",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Personal OS",
    "application-name": "Personal OS",
    "msapplication-TileColor": "#050506",
    "theme-color": "#050506",
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon.svg" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon.svg" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body>
        <ServiceWorkerRegister />
        <Navigation />
        <main className="relative z-10 min-h-screen" style={{ paddingBottom: "80px" }}>
          <div className="lg:pl-[220px]" style={{ minHeight: "100vh" }}>
            <div className="max-w-[1100px] mx-auto px-5 py-6 lg:py-8">
              {children}
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
