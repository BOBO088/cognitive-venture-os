import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 显式声明 workspace root，避免 Next 找到上层目录的 lockfile
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
