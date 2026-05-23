import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iasmin — Sua Assessora Virtual",
  description: "Iasmin, sua assistente pessoal via WhatsApp",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-dark-950 text-white antialiased">{children}</body>
    </html>
  );
}
