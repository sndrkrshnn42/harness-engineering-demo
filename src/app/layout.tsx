import type { Metadata } from 'next';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Autonomous Harness Engineer',
  description: 'AI agent autonomously executing a 7-stage harness engineering pipeline',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
