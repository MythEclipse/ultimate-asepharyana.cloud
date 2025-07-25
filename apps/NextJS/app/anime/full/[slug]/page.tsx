'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import ClientPlayer from '@/components/misc/ClientPlayer';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Server,
  AlertTriangle,
} from 'lucide-react';

// --- INTERFACES ---
interface AnimeResponse {
  status: string;
  data: AnimeData;
}
interface AnimeData {
  episode: string;
  stream_url: string;
  download_urls: Record<string, DownloadLink[]>;
  has_next_episode: boolean;
  next_episode: EpisodeInfo | null;
  has_previous_episode: boolean;
  previous_episode: EpisodeInfo | null;
}
interface DownloadLink {
  server: string;
  url: string;
}
interface EpisodeInfo {
  slug: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- SKELETON COMPONENT ---
const PlayerPageSkeleton = () => (
  <main className='p-4 md:p-8'>
    <div className='max-w-6xl mx-auto space-y-8'>
      <div className='text-center space-y-4'>
        <Skeleton className='h-12 w-3/4 mx-auto rounded-lg' />
      </div>
      <Skeleton className='aspect-video w-full rounded-xl' />
      <div className='flex justify-between gap-4'>
        <Skeleton className='h-12 flex-1 rounded-lg' />
        <Skeleton className='h-12 flex-1 rounded-lg' />
      </div>
      <Card>
        <CardHeader className='items-center'>
          <Skeleton className='h-8 w-1/3 rounded-lg' />
        </CardHeader>
        <CardContent className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className='h-6 w-1/2 rounded-md' />
              </CardHeader>
              <CardContent className='space-y-2'>
                <Skeleton className='h-10 w-full rounded-md' />
                <Skeleton className='h-10 w-full rounded-md' />
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  </main>
);

// --- MAIN COMPONENT ---
export default function WatchAnimePage() {
  const params = useParams();
  const slug = params.slug as string;

  // --- Menggunakan kembali cara fetch SWR yang lama ---
  const { data, error, isLoading } = useSWR<AnimeResponse | null>(
    `/api/anime/full/${slug}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  if (isLoading) return <PlayerPageSkeleton />;
  if (error || !data || data.status !== 'Ok') {
    return (
      <main className='p-4 md:p-8 flex items-center justify-center min-h-[70vh]'>
        <Alert variant='destructive' className='max-w-lg'>
          <AlertTriangle className='h-4 w-4' />
          <AlertTitle>Gagal Memuat Episode</AlertTitle>
          <AlertDescription>
            Terjadi kesalahan saat mengambil data. Episode mungkin tidak ada
            atau link rusak.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const animeData = data.data;

  return (
    <main className='p-4 md:p-8'>
      <div className='space-y-6'>
        <div className='text-center space-y-2'>
          <h1 className='text-3xl md:text-4xl font-bold tracking-tight'>
            {animeData.episode}
          </h1>
          <div className='h-0.5 w-32 mx-auto bg-gradient-to-r from-transparent via-primary to-transparent' />
        </div>

        <Card className='overflow-hidden shadow-lg'>
          <CardContent className='p-0 aspect-video'>
            {animeData.stream_url ? (
              <ClientPlayer url={animeData.stream_url} />
            ) : (
              <div className='w-full h-full flex items-center justify-center bg-muted'>
                <p className='text-muted-foreground'>
                  Link streaming tidak tersedia.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className='flex justify-between items-center gap-2 sm:gap-4'>
          {animeData.has_previous_episode && animeData.previous_episode ? (
            <Button asChild className='flex-1' variant='outline'>
              <Link
                href={`/anime/full/${animeData.previous_episode.slug}`}
                scroll={false}
              >
                <ArrowLeft className='w-4 h-4 mr-2' />
                Episode Sebelumnya
              </Link>
            </Button>
          ) : (
            <div className='flex-1' />
          )}
          {animeData.has_next_episode && animeData.next_episode ? (
            <Button asChild className='flex-1'>
              <Link
                href={`/anime/full/${animeData.next_episode.slug}`}
                scroll={false}
              >
                Episode Selanjutnya
                <ArrowRight className='w-4 h-4 ml-2' />
              </Link>
            </Button>
          ) : (
            <div className='flex-1' />
          )}
        </div>

        <Card>
          <CardHeader className='items-center'>
            <CardTitle>Unduh Episode</CardTitle>
            <CardDescription>
              Pilih resolusi dan server yang tersedia.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
            {Object.entries(animeData.download_urls).map(
              ([resolution, links]) => (
                <Card key={resolution} className='bg-background/50'>
                  <CardHeader>
                    <CardTitle className='text-lg'>{resolution}</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-2'>
                    {links.map((link, index) => (
                      <Button
                        asChild
                        key={index}
                        variant='secondary'
                        className='w-full justify-start'
                      >
                        <a
                          href={link.url}
                          target='_blank'
                          rel='noopener noreferrer'
                        >
                          <Server className='w-4 h-4 mr-2' />
                          {link.server}
                          <Download className='w-4 h-4 ml-auto' />
                        </a>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
