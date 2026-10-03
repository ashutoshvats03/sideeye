/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Dev over the local network (phone/laptop on the same Wi-Fi) loads the
  // page from a non-localhost origin. Next.js 16 blocks cross-origin access
  // to dev resources (/_next/*, HMR websocket) by default, which leaves the
  // page as dead server HTML — buttons do nothing, cart spins forever.
  // Dev-only; production builds are unaffected.
  allowedDevOrigins: ["192.168.1.15"],
  // Admin product-image uploads ride in a server-action FormData body.
  // Next caps action bodies at 1MB by default; product photos need more.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

module.exports = nextConfig;
