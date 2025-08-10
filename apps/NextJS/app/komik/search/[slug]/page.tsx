import SearchForm from '@/components/misc/SearchForm';
import CardA from '@features/anime/MediaCard';
import { Info } from 'lucide-react';

interface Genre {
  name: string;
  slug: string;
  otakudesu_url: string;
}
interface Anime {
  title: string;
  slug: string;
  poster: string;
  genres?: Genre[];
  status?: string;
  rating?: string;
  episode_count?: number;
  last_release_date?: string;
  url?: string;
}
interface SearchDetailData {
  status: string;
  data: Anime[];
}

async function fetchSearchResults(query: string): Promise<SearchDetailData> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/komik/search?query=${encodeURIComponent(query)}&page=1`
  );
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const result: SearchDetailData = await response.json();
  return result;
}

export default async function SearchPage({ params }: { params: { slug: string } }) {
  const query = decodeURIComponent(
    Array.isArray(params.slug) ? params.slug[0] : (params.slug ?? '')
  );

  let searchResults: SearchDetailData | undefined;
  let error = false;

  try {
    searchResults = await fetchSearchResults(query);
  } catch (e) {
    console.error('Error fetching search results:', e);
    error = true;
  }

  if (error || !searchResults) {
    return (
      <div className='min-h-screen p-6 bg-background dark:bg-dark flex items-center justify-center'>
        <div className='max-w-2xl text-center'>
          <div className='p-6 bg-red-100 dark:bg-red-900/30 rounded-2xl flex flex-col items-center gap-4'>
            <Info className='w-12 h-12 text-red-600 dark:text-red-400' />
            <h2 className='text-2xl font-bold text-red-800 dark:text-red-200'>
              Failed to load search results
            </h2>
            <p className='text-red-700 dark:text-red-300'>
              Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className='p-6'>
      <h1 className='text-2xl font-bold mb-4'>Search Results</h1>
      <SearchForm
        classname='w-full mb-8'
        initialQuery={query}
        baseUrl='/komik'
      />
      {searchResults.data.length > 0 ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-4'>
          {searchResults.data.map((anime) => (
            <CardA
              key={anime.slug}
              title={anime.title}
              description={`${anime.status || 'Unknown status'} • ⭐${anime.rating || 'N/A'}`}
              imageUrl={anime.poster}
              linkUrl={`/komik/detail/${anime.slug}`}
            />
          ))}
        </div>
      ) : (
        <div className='p-6 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center gap-4'>
          <Info className='w-8 h-8 text-blue-600 dark:text-blue-400' />
          <h2 className='text-xl font-medium text-blue-800 dark:text-blue-200'>
            No results found for &amp;quot;{query}&amp;quot;
          </h2>
        </div>
      )}
    </main>
  );
}
