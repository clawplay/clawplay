import { Orbitron, Share_Tech_Mono } from 'next/font/google';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
});

const shareTechMono = Share_Tech_Mono({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-share-tech-mono',
  display: 'swap',
});

export default function XtradeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${orbitron.variable} ${shareTechMono.variable}`}>
      {children}
    </div>
  );
}
