import React from 'react';
import CardA from './MediaCard';
import { BaseUrl } from '@/lib/url';

interface MangaData {
  title: string;
  image: string;
  chapter: string;
  date: string;
  score: string;
  type: string;
  komik_id: string;
}

// ComicCard component
export const ComicCard = ({ comic }: { comic: MangaData }) => (
  <div key={comic.komik_id}>
    <CardA
      title={comic.title}
      description={`Chapter ${comic.chapter} | ${comic.date}`}
      imageUrl={
        comic.image
          ? `${BaseUrl}/api/imageproxy?url=${encodeURIComponent(comic.image)}`
          : ''
      }
      linkUrl={`/komik/detail/${comic.komik_id}`}
      type={comic.type}
    />
  </div>
);
