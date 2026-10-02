import "./globals.css";

export const metadata = {
  title: "SideEye — Worth the second look",
  description: "Funky anti-tarnish jewellery.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
