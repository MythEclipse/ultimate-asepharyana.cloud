'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import Image from 'next/image';
import { BackgroundGradient } from '@/components/background/background-gradient';
import CardA from '@/components/card/MediaCard';
import ButtonA from '@/components/button/ScrollButton';
import {
  ArrowRightIcon,
  BookmarkIcon,
  BookOpenIcon,
  CalendarIcon,
  CircleDot,
  FileTextIcon,
  StarIcon,
  TypeIcon,
  UserIcon,
} from 'lucide-react';
import { PRODUCTION } from '@/lib/url';
import { useTransitionRouter } from 'next-view-transitions';
import { useParams } from 'next/navigation';

interface Chapter {
  chapter: string;
  chapter_id: string;
  date: string;
}

interface Recommendation {
  slug: string;
  title: string;
  poster: string;
}

interface MangaData {
  title: string;
  alternativeTitle: string;
  score: string;
  poster: string;
  type: string;
  status: string;
  releaseDate: string;
  author: string;
  description: string;
  totalChapter: string;
  updatedOn: string;
  genres: string[];
  chapters: Chapter[];
  recommendations: Recommendation[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DetailMangaPage() {
  const router = useTransitionRouter();
  const { komikId } = useParams();

  const { data: manga, error } = useSWR<MangaData>(
    `/api/komik/detail?komik_id=${komikId}`,
    fetcher
  );

  const [bookmarked, setBookmarked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleBookmark = () => {
    let bookmarks = JSON.parse(localStorage.getItem('bookmarks-komik') || '[]');

    if (bookmarked) {
      bookmarks = bookmarks.filter(
        (item: { slug: string }) => item.slug !== komikId
      );
    } else {
      bookmarks.push({
        slug: komikId,
        title: manga?.title,
        poster: manga?.poster,
      });
    }

    localStorage.setItem('bookmarks-komik', JSON.stringify(bookmarks));
    setBookmarked(!bookmarked);
  };

  if (error)
    return (
      <p className='text-red-500 text-center'>Failed to load manga data</p>
    );
  if (!manga)
    return (
      <main className='p-4 md:p-8 bg-background dark:bg-dark min-h-screen'>
        <div className='max-w-6xl mx-auto bg-white dark:bg-dark-foreground rounded-3xl shadow-2xl dark:shadow-none'>
          <div className='rounded-[24px] p-6 md:p-10 bg-white dark:bg-zinc-900'>
            <div className='flex flex-col md:flex-row items-center md:items-start gap-8'>
              {/* Skeleton Cover Section */}
              <div className='w-full md:w-1/3 flex flex-col gap-4'>
                <div className='relative overflow-hidden rounded-2xl aspect-[2/3] animate-pulse bg-zinc-200 dark:bg-zinc-700' />

                <div className='h-12 rounded-full animate-pulse bg-zinc-200 dark:bg-zinc-700' />
              </div>

              {/* Skeleton Details Section */}
              <div className='w-full md:w-2/3 space-y-6'>
                {/* Title */}
                <div className='h-10 w-2/3 rounded-lg animate-pulse bg-zinc-200 dark:bg-zinc-700' />

                {/* Metadata Grid */}
                <div className='grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl'>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className='flex items-center gap-3'>
                      <div className='w-9 h-9 rounded-lg animate-pulse bg-zinc-200 dark:bg-zinc-700' />
                      <div className='space-y-2'>
                        <div className='h-4 w-16 rounded animate-pulse bg-zinc-200 dark:bg-zinc-700' />
                        <div className='h-4 w-24 rounded animate-pulse bg-zinc-200 dark:bg-zinc-700' />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Genres */}
                <div className='flex flex-wrap gap-2'>
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className='h-6 w-20 rounded-full animate-pulse bg-zinc-200 dark:bg-zinc-700'
                    />
                  ))}
                </div>

                {/* Description */}
                <div className='space-y-3'>
                  <div className='h-5 w-32 rounded animate-pulse bg-zinc-200 dark:bg-zinc-700' />
                  <div className='h-4 w-full rounded animate-pulse bg-zinc-200 dark:bg-zinc-700' />
                  <div className='h-4 w-5/6 rounded animate-pulse bg-zinc-200 dark:bg-zinc-700' />
                  <div className='h-4 w-2/3 rounded animate-pulse bg-zinc-200 dark:bg-zinc-700' />
                </div>

                {/* Chapters */}
                <div className='space-y-4'>
                  <div className='h-7 w-48 rounded animate-pulse bg-zinc-200 dark:bg-zinc-700' />
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className='h-16 rounded-xl animate-pulse bg-zinc-200 dark:bg-zinc-700'
                      />
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className='space-y-4'>
                  <div className='h-7 w-56 rounded animate-pulse bg-zinc-200 dark:bg-zinc-700' />
                  <div className='flex overflow-x-auto pb-4 gap-4'>
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className='flex-shrink-0 w-48 md:w-56 space-y-2'
                      >
                        <div className='aspect-[2/3] rounded-xl animate-pulse bg-zinc-200 dark:bg-zinc-700' />
                        <div className='h-4 w-3/4 rounded animate-pulse bg-zinc-200 dark:bg-zinc-700' />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  const fallback = 'https://asepharyana.cloud/default.png';
  const imageSources = [
    manga.poster && manga.poster.trim() ? manga.poster : fallback,
    manga.poster && manga.poster.trim()
      ? `https://imagecdn.app/v1/images/${encodeURIComponent(manga.poster)}`
      : null,
    manga.poster && manga.poster.trim()
      ? `${PRODUCTION}/api/imageproxy?url=${encodeURIComponent(manga.poster)}`
      : null,
  ].filter((src) => src && src.trim()) as string[];

  const handleError = () => {
    if (currentIndex < imageSources.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <main className='p-4 md:p-8 bg-background dark:bg-dark min-h-screen'>
      <div className='max-w-6xl mx-auto bg-white dark:bg-dark-foreground rounded-3xl shadow-2xl dark:shadow-none'>
        <BackgroundGradient className='rounded-[24px] p-6 md:p-10 bg-white dark:bg-zinc-900'>
          <div className='flex flex-col md:flex-row items-center md:items-start gap-8'>
            {/* Manga Cover Section */}
            <div className='w-full md:w-1/3 flex flex-col gap-4'>
              <div className='relative group overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300'>
                <Image
                  src={imageSources[currentIndex] || fallback}
                  alt={manga.title}
                  width={400}
                  height={600}
                  className='object-cover w-full aspect-[2/3] transform transition-transform hover:scale-105'
                  priority
                  onError={handleError}
                />
                <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity' />
              </div>

              <button
                onClick={handleBookmark}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  bookmarked
                    ? 'bg-red-500/90 hover:bg-red-600 text-white'
                    : 'bg-blue-500/90 hover:bg-blue-600 text-white'
                }`}
              >
                <BookmarkIcon className='w-5 h-5' />
                {bookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>
            </div>

            {/* Manga Details Section */}
            <div className='w-full md:w-2/3 space-y-6'>
              <h1 className='text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400'>
                {manga.title}
              </h1>

              {/* Metadata Grid */}
              <div className='grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl'>
                {[
                  {
                    label: 'Score',
                    value: manga.score,
                    icon: <StarIcon className='w-5 h-5 text-amber-500' />,
                  },
                  {
                    label: 'Type',
                    value: manga.type,
                    icon: <TypeIcon className='w-5 h-5 text-blue-500' />,
                  },
                  {
                    label: 'Status',
                    value: manga.status,
                    icon: <CircleDot className='w-5 h-5 text-green-500' />,
                  },
                  {
                    label: 'Released',
                    value: manga.releaseDate,
                    icon: <CalendarIcon className='w-5 h-5 text-red-500' />,
                  },
                  {
                    label: 'Author',
                    value: manga.author,
                    icon: <UserIcon className='w-5 h-5 text-purple-500' />,
                  },
                ].map((detail) => (
                  <div key={detail.label} className='flex items-center gap-3'>
                    <span className='p-2 bg-white dark:bg-zinc-700 rounded-lg'>
                      {detail.icon}
                    </span>
                    <div>
                      <p className='text-sm text-zinc-500'>{detail.label}</p>
                      <p className='font-medium dark:text-zinc-200'>
                        {detail.value || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Genres */}
              <div className='flex flex-wrap gap-2'>
                {manga.genres?.map((genre, index) => (
                  <span
                    key={index}
                    className='px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full'
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Description */}
              <div className='prose dark:prose-invert max-w-none'>
                <h3 className='text-xl font-semibold mb-2 text-zinc-800 dark:text-zinc-100'>
                  Synopsis
                </h3>
                <p className='text-zinc-600 dark:text-zinc-300 leading-relaxed'>
                  {manga.description || 'No description available.'}
                </p>
              </div>

              {/* Chapters Section */}
              <div className='space-y-4'>
                <h2 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                  Chapters
                </h2>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                  {manga.chapters?.length > 0 ? (
                    manga.chapters.map((chapter) => (
                      <ButtonA
                        key={chapter.chapter_id}
                        onClick={() =>
                          router.push(`/komik/chapter/${chapter.chapter_id}`)
                        }
                        className='group flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm'
                      >
                        <span className='font-medium text-zinc-700 dark:text-zinc-200'>
                          {chapter.chapter}
                        </span>
                        <ArrowRightIcon className='w-5 h-5 text-zinc-400 group-hover:text-blue-500 transition-colors' />
                      </ButtonA>
                    ))
                  ) : (
                    <div className='col-span-full py-6 text-center text-zinc-500 dark:text-zinc-400'>
                      <FileTextIcon className='mx-auto h-12 w-12 mb-3' />
                      No chapters available
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations Section */}
              <div className='space-y-4'>
                <h2 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                  You Might Also Like
                </h2>
                <div className='flex overflow-x-auto pb-4 gap-4 scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent dark:scrollbar-thumb-zinc-600'>
                  {manga.recommendations?.length > 0 ? (
                    manga.recommendations.map((recommendation) => (
                      <div
                        key={recommendation.slug}
                        className='flex-shrink-0 w-48 md:w-56'
                      >
                        <CardA
                          title={recommendation.title}
                          imageUrl={recommendation.poster}
                          linkUrl={`/komik/detail/${recommendation.slug}`}
                        />
                      </div>
                    ))
                  ) : (
                    <div className='w-full py-6 text-center text-zinc-500 dark:text-zinc-400'>
                      <BookOpenIcon className='mx-auto h-12 w-12 mb-3' />
                      No recommendations available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </BackgroundGradient>
      </div>
    </main>
  );
}
