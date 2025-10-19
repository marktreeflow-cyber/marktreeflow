/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 🧭 Redirect otomatis dari /all-updates → /timeline
  async redirects() {
    return [
      {
        source: "/all-updates",
        destination: "/timeline",
        permanent: true, // pakai true biar SEO & cache-nya permanen
      },
    ];
  },

  // (opsional) kalau lu butuh environment public
  env: {
    NEXT_PUBLIC_APP_NAME: "MPLAN Dashboard",
  },
};

module.exports = nextConfig;
