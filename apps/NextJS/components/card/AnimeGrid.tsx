// components/AnimeGrid.tsx
import React from 'react';
import MediaCard from './MediaCard';

interface Anime {
  title: string;
  slug: string;
  rating?: string;
  poster?: string;
  release_day?: string;
  newest_release_date?: string;
  anime_url?: string;
  current_episode?: string;
  episode?: string;
  episode_count?: string;
}

interface AnimeGridProps {
  animes?: Anime[];
  loading?: boolean;
}

// components/AnimeGrid.tsx
// components/AnimeGrid.tsx
const AnimeGrid: React.FC<AnimeGridProps> = ({ animes, loading = false }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center p-4">
        <div className="grid grid-cols-5 gap-4 w-full">
          {Array(25).fill(0).map((_, index) => (
            <Skeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4">
      <div className="grid grid-cols-5 gap-4 w-full">
        {animes?.map((anime) => (
          <MediaCard
            key={anime.slug}
            title={anime.title}
            description={
              anime.current_episode ||
              anime.episode ||
              anime.episode_count ||
              ''
            }
            imageUrl={anime.poster || ''}
            linkUrl={`/anime/detail/${anime.slug}`}
          />
        ))}
      </div>
    </div>
  );
};

const Skeleton = () => {
  return (
    <div className="h-64 w-full bg-gray-800 dark:bg-gray-700 rounded-lg overflow-hidden animate-pulse">
      <div className="h-full w-full flex items-center justify-center">
        <div className="h-48 w-full bg-gray-700 rounded-t-lg animate-pulse">
          <div className="p-4">
            <div className="w-full h-4 bg-gray-600 rounded mb-2 animate-pulse"></div>
            <div className="w-3/4 h-3 bg-gray-600 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default AnimeGrid;
