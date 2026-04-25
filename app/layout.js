import "./globals.css";

export const metadata = {
  title: "Universal Product Catalog",
  description: "Universal Product Catalog EPC foundation"
};

export default function RootLayout({ children }) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
