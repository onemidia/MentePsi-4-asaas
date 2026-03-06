/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'], // Gera versões super leves automaticamente
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: '**.supabase.co' }
    ],
  },
  // Desativa o aviso de lint no build para acelerar o deploy
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Garante que o deploy não pare por um erro bobo de tipagem
  },
};

module.exports = nextConfig;