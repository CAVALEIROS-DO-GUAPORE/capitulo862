import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Adicione o hostname do seu Supabase Storage quando configurar:
  // images: { remotePatterns: [{ protocol: 'https', hostname: 'xxx.supabase.co', pathname: '/storage/**' }] },
};

export default nextConfig;
