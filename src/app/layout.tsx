import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Astral Chat",
  description: "A calm conversation space for questions and ideas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
