import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ATS Resume Optimizer — Land More Interviews",
  description:
    "AI-powered resume optimizer that tailors your resume to any job description, boosting ATS scores and keyword match rates for better interview chances.",
  keywords: ["ATS resume", "resume optimizer", "job application", "resume builder", "ATS score"],
  authors: [{ name: "Resume Optimizer" }],
  openGraph: {
    title: "ATS Resume Optimizer",
    description: "AI-powered resume optimizer. Beat ATS filters, land more interviews.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080808",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

