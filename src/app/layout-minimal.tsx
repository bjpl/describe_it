import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Describe It - Spanish Learning App",
  description: "Learn Spanish through images",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
