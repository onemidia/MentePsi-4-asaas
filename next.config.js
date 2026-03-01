/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignora erros de TS no build para evitar falhas com arquivos externos (ex: supabase functions)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignora erros de ESLint no build
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;