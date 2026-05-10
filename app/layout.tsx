import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Personal OS",
  description: "Your life, optimized. Health, training, nutrition, goals, finance — all in one.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <main
          className="relative z-10 min-h-screen"
          style={{
            paddingLeft: "0px",
            paddingBottom: "80px",
          }}
        >
          <div
            className="lg:pl-[220px]"
            style={{ minHeight: "100vh" }}
          >
            <div className="max-w-[1100px] mx-auto px-5 py-6 lg:py-8">
              {children}
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
