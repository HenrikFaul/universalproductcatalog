import './globals.css';
import './styles/design-system.css';
import Link from 'next/link';

export const metadata = {
  title: 'Universal Product Catalog',
  description: 'Universal Product Catalog EPC foundation',
};

export default function RootLayout({ children }) {
  return (
    <html lang="hu">
      <body>
        <div className="app-frame">
          <aside className="app-sidebar">
            <div className="app-brand">UPC</div>
            <nav className="app-nav">
              <Link href="/">Dashboard</Link>
              <Link href="/catalogs">Catalogs</Link>
              <Link href="/modules">Modules</Link>
              <Link href="/industries">Industries</Link>
            </nav>
          </aside>
          <div className="app-content">{children}</div>
        </div>
      </body>
    </html>
  );
}
