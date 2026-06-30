import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HR Dashboard - 组织数据看板',
  description: '自动化组织数据分析和可视化看板',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
