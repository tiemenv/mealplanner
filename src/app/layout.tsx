import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Weekly Plate",
  description:
    "Build your meal library and auto-generate a varied, balanced weekly meal plan.",
  appleWebApp: {
    capable: true,
    title: "Weekly Plate",
    statusBarStyle: "default",
  },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#171717",
  // Lets the planner reach the edges on notched phones.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html
        lang="en"
        className={`${jakartaSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-background text-foreground">
          {children}
          <Toaster richColors position="top-center" />
          <ServiceWorker />
        </body>
      </html>
    </ClerkProvider>
  );
}
