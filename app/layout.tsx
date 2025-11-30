import "./../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Black Label Social",
  description: "Social media scheduling powered by Black Label Branding"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
