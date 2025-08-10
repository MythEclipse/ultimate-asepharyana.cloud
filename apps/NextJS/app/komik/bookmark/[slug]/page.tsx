import React from 'react';
import UnifiedGrid from 'components/UnifiedGrid';
import BookmarkPagination from 'components/komik/BookmarkPagination';
import { Bookmark, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';

interface BookmarkItem {
  title: string;
  poster: string;
  chapter: string;
  score: string;
  slug: string;
  date: string;
  type: string;
  komik_id: string;
}

interface Pagination {
  current_page: number;
  last_visible_page: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

const ITEMS_PER_PAGE = 25;

function getBookmarksFromLocalStorage(): BookmarkItem[] {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem('bookmarks-komik') || '[]');
  }
  return [];
}

export default async function BookmarkPage({ params }: { params: { slug: string } }) {
  const page = parseInt(params.slug, 10) || 1;

  // On the server, bookmarks will be empty initially. They will load on the client.
  const bookmarks: BookmarkItem[] = getBookmarksFromLocalStorage();

  const totalPages = Math.ceil(bookmarks.length / ITEMS_PER_PAGE);
  const currentPage = Math.min(page, totalPages || 1);

  const pagination: Pagination = {
    current_page: currentPage,
    last_visible_page: totalPages,
    has_next_page: currentPage < totalPages,
    has_previous_page: currentPage > 1,
  };

  const getPaginatedBookmarks = () => {
    const start = (pagination.current_page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return bookmarks.slice(start, end);
  };

  // On server render, bookmarks.length will be 0, so it will show loading or empty message.
  // On client hydration, it will re-render with actual bookmarks.
  if (bookmarks.length === 0 && typeof window !== 'undefined') {
    return (
      <main className='min-h-screen p-6 bg-background text-foreground'>
        <div className='max-w-7xl mx-auto space-y-8'>
          <div className='flex items-center gap-4'>
            <div className='p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl'>
              <Bookmark className='w-8 h-8 text-purple-600 dark:text-purple-400' />
            </div>
            <h1 className='text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent'>
              My Bookmarks (0)
            </h1>
          </div>
          <div className='p-4 sm:p-6 bg-blue-100 dark:bg-blue-900/30 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4'>
            <Info className='w-8 h-8 text-blue-600 dark:text-blue-400' />
            <h3 className='text-base sm:text-lg font-medium text-blue-800 dark:text-blue-200'>
              No Bookmarked Comic yet.
            </h3>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className='min-h-screen p-6 bg-background text-foreground'>
      <div className='max-w-7xl mx-auto space-y-8'>
        <div className='flex items-center gap-4'>
          <div className='p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl'>
            <Bookmark className='w-8 h-8 text-purple-600 dark:text-purple-400' />
          </div>
          <h1 className='text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent'>
            My Bookmarks ({bookmarks.length})
          </h1>
        </div>

        {bookmarks.length > 0 ? (
          <>
            <UnifiedGrid items={getPaginatedBookmarks()} itemType="komik" />
            <BookmarkPagination pagination={pagination} baseUrl="/komik/bookmark" />
          </>
        ) : (
          <div className='p-4 sm:p-6 bg-blue-100 dark:bg-blue-900/30 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4'>
            <Info className='w-8 h-8 text-blue-600 dark:text-blue-400' />
            <h3 className='text-base sm:text-lg font-medium text-blue-800 dark:text-blue-200'>
              No Bookmarked Comic yet.
            </h3>
          </div>
        )}
      </div>
    </main>
  );
}
