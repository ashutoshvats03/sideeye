import "./globals.css";
import SiteHeader from "../components/site-header.jsx";
import SiteFooter from "../components/site-footer.jsx";

export const metadata = {
  title: "SideEye — Worth the second look",
  description: "Funky anti-tarnish jewellery.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-white text-neutral-900 antialiased">
        {/* Skip link: keyboard users bypass the nav on every page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-neutral-900 focus:px-4 focus:py-2 focus:font-bold focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
