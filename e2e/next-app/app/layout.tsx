import type { ReactNode } from 'react';

export const metadata = {
  title: 'Monaco Loader Next.js E2E',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
