import "./globals.css";

export const metadata = {
  title: { default: "Admin — Μάλαμας Frozen", template: "%s — Admin" },
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
