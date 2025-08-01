'use client';
import React, { useEffect, useState } from 'react';
import KomikGrid from '@features/komik/ComicGrid';
import ButtonA from '@core/ui/ScrollButton';

interface Bookmark {
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

export default function BookmarkPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    last_visible_page: 1,
    has_next_page: false,
    has_previous_page: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const ITEMS_PER_PAGE = 25;

  useEffect(() => {
    const storedBookmarks = JSON.parse(
      localStorage.getItem('bookmarks-komik') || '[]'
    );
    setBookmarks(storedBookmarks);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const totalPages = Math.ceil(bookmarks.length / ITEMS_PER_PAGE);
    const currentPage = Math.min(pagination.current_page, totalPages || 1);

    setPagination({
      current_page: currentPage,
      last_visible_page: totalPages,
      has_next_page: currentPage < totalPages,
      has_previous_page: currentPage > 1,
    });
  }, [bookmarks, pagination.current_page]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({
      ...prev,
      current_page: Math.max(1, Math.min(newPage, prev.last_visible_page)),
    }));
  };

  const getPaginatedBookmarks = () => {
    const start = (pagination.current_page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return bookmarks.slice(start, end);
  };

  if (isLoading) {
    return (
      <main className='p-6'>
        <h1 className='dark:text-lighta text-2xl font-bold mt-8 mb-4'>
          Bookmarked Comic ({bookmarks.length})
        </h1>
        <KomikGrid loading={true} komiks={[]} />
        <div className='flex flex-wrap gap-4 justify-between items-center mt-8 animate-pulse'>
          <div className='flex gap-4'>
            <div className='w-24 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg' />
            <div className='w-24 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg' />
          </div>
          <div className='w-32 h-4 bg-zinc-200 dark:bg-zinc-700 rounded-full' />
        </div>
      </main>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <main className='p-6'>
        <h1 className='text-2xl font-bold mt-8 mb-4'>No Bookmarked Comic</h1>
        <p>You have not bookmarked any Comic yet.</p>
      </main>
    );
  }

  return (
    <main className='p-6'>
      <h1 className='dark:text-lighta text-2xl font-bold mt-8 mb-4'>
        Bookmarked Comic ({bookmarks.length})
      </h1>
      <KomikGrid komiks={getPaginatedBookmarks()} />
      <PaginationComponent
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </main>
  );
}

const PaginationComponent = ({
  pagination,
  onPageChange,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}) => {
  return (
    <div className='flex justify-between mt-8'>
      <div className='flex gap-4'>
        {pagination.has_previous_page && (
          <ButtonA onClick={() => onPageChange(pagination.current_page - 1)}>
            Previous
          </ButtonA>
        )}

        {pagination.has_next_page && (
          <ButtonA onClick={() => onPageChange(pagination.current_page + 1)}>
            Next
          </ButtonA>
        )}
      </div>

      <div className='text-gray-600 dark:text-gray-400'>
        Page {pagination.current_page} of {pagination.last_visible_page}
      </div>
    </div>
  );
};
