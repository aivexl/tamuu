import type { Metadata } from 'next';
import { Inter, Playfair_Display, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';
import { ClientOnly } from '@/components/ClientOnly';

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
        <html lang="id" className={`${inter.variable} ${playfair.variable} ${cormorant.variable}`} suppressHydrationWarning>
            <head>
                {/* Google Fonts for cursive/handwriting fonts */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                <link
                    href="https://fonts.googleapis.com/css2?family=Amatic+SC:wght@400;700&family=Alex+Brush&family=Allura&family=Caveat:wght@400;700&family=Clicker+Script&family=Cookie&family=Covered+By+Your+Grace&family=Croissant+One&family=Dancing+Script:wght@400;700&family=Euphoria+Script&family=Gloria+Hallelujah&family=Great+Vibes&family=Indie+Flower&family=Italianno&family=Kalam:wght@400;700&family=Lavishly+Yours&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,700;1,400&family=Marck+Script&family=Meddon&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;500;600;700&family=Mr+De+Haviland&family=Niconne&family=Open+Sans:wght@400;500;600;700&family=Pacifico&family=Patrick+Hand&family=Permanent+Marker&family=Petit+Formal+Script&family=Pinyon+Script&family=Poppins:wght@400;500;600;700&family=Qwigley&family=Roboto:wght@400;500;700&family=Rock+Salt&family=Rouge+Script&family=Sacramento&family=Satisfy&family=Shadows+Into+Light&family=Tangerine:wght@400;700&family=Yellowtail&family=Yesteryear&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body suppressHydrationWarning>
                {children}
                <ClientOnly>
                    <Toaster />
                </ClientOnly>
            </body>
        </html>
    );
}
