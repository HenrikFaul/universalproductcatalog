import './globals.css';
import './styles/design-system.css';
import Link from 'next/link';
import AppNav from './components/AppNav';

export const metadata = {
  title: 'Universal Product Catalog',
  description: 'Universal Product Catalog EPC foundation',
};

function UpcLogoMark({ compact = false }) {
  return (
    <span className={compact ? 'upc-logo-mark upc-logo-mark--compact' : 'upc-logo-mark'} aria-hidden="true">
      <span className="upc-logo-diamond" />
      <span className="upc-logo-core">UPC</span>
    </span>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-frame">
          <aside className="app-sidebar">
            <Link href="/" className="app-brand" aria-label="Universal Product Catalog home">
              <UpcLogoMark />
              <span className="app-brand-text"><strong>UPC</strong><small>Product Catalog</small></span>
            </Link>
            <AppNav />
            <div className="app-sidebar-panel">
              <span className="sidebar-panel-label">Intelligent Product Management</span>
              <strong>Configure. Govern. Orchestrate.</strong>
            </div>
          </aside>
          <div className="app-content">
            <header className="app-topbar">
              <div className="topbar-title">
                <UpcLogoMark compact />
                <div><span>Universal Product Catalog</span><strong>Enterprise catalog brain for configurable products</strong></div>
              </div>
              <div className="topbar-actions"><span className="topbar-chip topbar-chip--blue">TMF 620</span><span className="topbar-chip topbar-chip--emerald">EPC compliant</span></div>
            </header>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
