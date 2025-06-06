import React from 'react';
import type { Metadata } from 'next';
// import { Inter } from 'next/font/google';
// import { Flowbite } from 'flowbite-react';
import './globals.css';
import NavbarWrapper from '@/components/navbar/NavbarWrapper';
import SessionWrapper from '@/components/misc/SessionWrapper';
// import ContextAppProvider from '@/components/ContextApp';
// import { ThemeModeScript } from "flowbite-react";
// import { ViewTransitions } from 'next-view-transitions';
import { PRODUCTION } from '@/lib/url';
import { ThemeProvider } from '@/components/misc/theme-provider';
import DarkThemeToggle from '@/components/button/DarkThemeToggle';
// Google font setup
// const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// Metadata configuration for the page
export const metadata: Metadata = {
  metadataBase: new URL(`${PRODUCTION}`),
  title: 'Asep Haryana Saputra',
  description:
    'Website pribadi milik Asep Haryana Saputra, ini adalah halaman utama pada website ini',
  keywords:
    'portfolio, nextjs, api, free, anime, manga, asep, haryana, saputra, asep haryana, asep haryana saputra',
  openGraph: {
    title: 'Website pribadi milik Asep Haryana Saputra',
    description:
      'Website pribadi milik Asep Haryana Saputra, ini adalah halaman utama pada website ini',
    images: [
      { url: '/logo.png', width: 800, height: 600 },
      { url: '/logo.png', width: 1800, height: 1600, alt: 'My custom alt' },
    ],
    type: 'article',
    url: `${PRODUCTION}`,
    siteName: 'Website pribadi milik Asep Haryana Saputra',
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary',
    site: '@asepharyana',
    title: 'Website pribadi milik Asep Haryana Saputra',
    description:
      'Website pribadi milik Asep Haryana Saputra, berisi berbagai project seperti API, Anime, Manga, dan lainnya',
    images: [
      { url: '/logo.png', width: 800, height: 600 },
      { url: '/logo.png', width: 1800, height: 1600, alt: 'My custom alt' },
    ],
    creator: '@asepharyana71',
  },
};

// RootLayout component
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionWrapper>
      {/* <ViewTransitions> */}
        <html
          lang='id'
          // className={inter.className}
          suppressHydrationWarning
        >
          <head>
            <link rel='canonical' href={`${PRODUCTION}`} />
            <link rel='manifest' href='/manifest.json' />
            <link rel='icon' href='/favicon.ico' />
            <link rel='apple-touch-icon' href='/logo.png' />
            <meta name='theme-color' content='#000000' />
            {/* <ThemeModeScript /> */}
          </head>
          <body className='h-screen'>
            <ThemeProvider
              attribute='class'
              defaultTheme='system'
              enableSystem
              // disableTransitionOnChange
            >
              <NavbarWrapper />
              <div className='mt-8 max-w-full px-0.5 pb-24 pt-12 sm:px-6 lg:px-8'>
                {children}
                <DarkThemeToggle
                  className='fixed bottom-0 left-0 z-10 m-4'
                  aria-label='Toggle Dark Mode'
                />
              </div>
            </ThemeProvider>
          </body>
        </html>
      {/* </ViewTransitions> */}
    </SessionWrapper>
  );
}
