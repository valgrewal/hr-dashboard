/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  transpilePackages: ['echarts', 'echarts-for-react'],
}
module.exports = nextConfig
