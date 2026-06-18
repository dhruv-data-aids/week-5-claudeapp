/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist', 'mammoth', '@azure/msal-node'],
  },
}

export default nextConfig
