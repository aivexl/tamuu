import type { Metadata } from 'next';
import { Inter, Playfair_Display, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const playfair = Playfair_Display({
    subsets: ['latin'],
    variable: '--font-playfair',
    display: 'swap',
});

const cormorant = Cormorant_Garamond({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-cormorant',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Digital Invitation Platform - Buat Undangan Online',
    description: 'Platform undangan digital untuk pernikahan, ulang tahun, dan acara spesial lainnya. Mudah, cepat, dan profesional.',
    keywords: 'undangan digital, undangan online, undangan pernikahan, wedding invitation',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="id" className={`${inter.variable} ${playfair.variable} ${cormorant.variable}`}>
            <body>{children}</body>
        </html>
    );
}
