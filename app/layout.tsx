import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css'


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Spend Tracker - Track, Control & Optimize Your AI Spending",
  description: "Unified dashboard for monitoring AI API usage across OpenAI, Anthropic, AWS Bedrock, GCP Vertex and more. Track tokens, costs, budgets in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-[#353535] text-white flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
