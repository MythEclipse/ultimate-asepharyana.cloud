import React, { memo } from 'react';
import Link from 'next/link';
import UnifiedGrid from 'components/UnifiedGrid';
import { BookOpen, AlertTriangle, Info, ArrowRight } from 'lucide-react';

export interface Komik {
  title: string;
  poster: string;
  chapter: string;
  score: string;
  type: string;
  date: string;
  slug: string;
}

interface KomikData {
  data: Komik[];
}

async function fetchKomikData(type: string): Promise<KomikData> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/komik/${type}?page=1&order=update`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${type} data`);
  }
  return res.json();
}

export default async function HomePage() {
  let manga: KomikData | undefined;
  let manhua: KomikData | undefined;
  let manhwa: KomikData | undefined;
  let error = false;

  try {
    manga = await fetchKomikData('manga');
    manhua = await fetchKomikData('manhua');
    manhwa = await fetchKomikData('manhwa');
  } catch (e) {
    console.error(e);
    error = true;
  }

  // const Skeleton = () => (
  //   <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
  //     {[...Array(40)].map((_, i) => (
  //       <div key={i} className="animate-pulse space-y-3">
  //         <div className="aspect-[2/3] w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
  //         <div className="space-y-2">
  //           <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
  //           <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
  //           <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
  //         </div>
  //       </div>
  //     ))}
  //   </div>
  // );
  return (
    <main className='min-h-screen p-4 md:p-8 lg:p-12 bg-background text-foreground'>
      <div className='max-w-7xl mx-auto space-y-12'>
        <div className='flex items-center gap-4'>
          <div className='p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl'>
            <BookOpen className='w-8 h-8 text-purple-600 dark:text-purple-400' />
          </div>
          <h1 className='text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent'>
            Komik Catalog
          </h1>
        </div>

        {error ? (
          <div className='p-4 sm:p-6 bg-red-100 dark:bg-red-900/30 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4'>
            <AlertTriangle className='w-8 h-8 text-red-600 dark:text-red-400' />
            <div>
              <h2 className='text-lg sm:text-xl font-medium text-red-800 dark:text-red-200 mb-1 sm:mb-2'>
                Error Loading Data
              </h2>
              <p className='text-red-700 dark:text-red-300'>
                Failed to fetch comic data. Please try again later.
              </p>
            </div>
          </div>
        ) : (
          <div className='space-y-12'>
            {['Manga', 'Manhua', 'Manhwa'].map((type) => {
              const komiks = {
                Manga: manga?.data,
                Manhua: manhua?.data,
                Manhwa: manhwa?.data,
              }[type];

              return (
                <section key={type} className='mb-12 space-y-6'>
                  <div className='flex items-center justify-between mb-6'>
                    <div className='flex items-center gap-3'>
                      <div className='p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl'>
                        <BookOpen className='w-6 h-6 text-blue-600 dark:text-blue-400' />
                      </div>
                      <h2 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                        {type}
                      </h2>
                    </div>
                    <Link
                      href={`/komik/${type.toLowerCase()}/page/1`}
                      className='flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors'
                    >
                      View All
                      <ArrowRight className='w-4 h-4' />
                    </Link>
                  </div>

                  {komiks ? (
                    komiks.length > 0 ? (
                      <UnifiedGrid
                        items={komiks.map((comic: Komik) => ({
                          ...comic,
                          poster: comic.poster,
                          slug: comic.slug,
                        }))}
                        itemType="komik"
                      />
                    ) : (
                      <div className='p-4 sm:p-6 bg-blue-100 dark:bg-blue-900/30 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4'>
                        <Info className='w-8 h-8 text-blue-600 dark:text-blue-400' />
                        <h3 className='text-base sm:text-lg font-medium text-blue-800 dark:text-blue-200'>
                          No {type} available at the moment
                        </h3>
                      </div>
                    )
                  ) : <UnifiedGrid loading={true} items={[]} itemType="komik" />}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
