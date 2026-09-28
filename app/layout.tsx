import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Outfit, Inter, Manrope } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Behavioral ransomware detection",
  description:
    "Detect ransomware from the order of system calls, then alert and stop the program.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${inter.variable} ${manrope.variable} ${fraunces.variable} ${plexMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
