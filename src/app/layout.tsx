import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KAMPAIGN By Kai — Fashion Campaign Studio",
  description:
    "Build thoughtful fashion campaigns for your clothing brand, from the first idea to the final visual.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
