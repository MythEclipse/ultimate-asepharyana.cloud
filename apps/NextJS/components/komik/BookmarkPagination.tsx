'use client';
import React from 'react';
import ButtonA from '@core/ui/ScrollButton';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Pagination {
  current_page: number;
  last_visible_page: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

interface PaginationComponentProps {
  pagination: Pagination;
  baseUrl: string; // e.g., "/komik/bookmark"
}

export default function BookmarkPagination({ pagination, baseUrl }: PaginationComponentProps) {
  return (
    <div className='flex flex-wrap gap-4 justify-between items-center mt-8'>
      <div className='flex gap-4'>
        {pagination.has_previous_page && (
          <Link href={`${baseUrl}/${pagination.current_page - 1}`}>
            <button
              className='px-6 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2'
            >
              <ChevronLeft className='w-5 h-5' />
              Previous
            </button>
          </Link>
        )}

        {pagination.has_next_page && (
          <Link href={`${baseUrl}/${pagination.current_page + 1}`}>
            <button
              className='px-6 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2'
            >
              Next
              <ChevronRight className='w-5 h-5' />
            </button>
          </Link>
        )}
      </div>

      <span className='text-sm font-medium text-zinc-600 dark:text-zinc-400 mx-4'>
        Page {pagination.current_page} of {pagination.last_visible_page}
      </span>
    </div>
  );
}