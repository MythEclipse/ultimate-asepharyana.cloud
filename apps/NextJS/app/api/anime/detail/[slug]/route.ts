import * as cheerio from 'cheerio';
import { NextRequest, NextResponse } from 'next/server';
import { fetchWithProxy } from '@/lib/fetchWithProxy';
import { corsHeaders } from '@/lib/corsHeaders';
import { withLogging } from '@/lib/api-wrapper';

const fetchAnimePage = async (slug: string) => {
  const { data, contentType } = await fetchWithProxy(
    `https://otakudesu.cloud/anime/${slug}`
  );

  if (!contentType || !contentType.includes('text/html')) {
    throw new Error('Failed to fetch anime detail data: Invalid content type');
  }

  return data;
};

const parseAnimeData = (html: string) => {
  const $ = cheerio.load(html);

  const extractText = (selector: string, prefix: string = '') =>
    $(selector).text().replace(prefix, '').trim();

  const title = extractText('.infozingle p:contains("Judul")', 'Judul: ');
  const alternative_title = extractText(
    '.infozingle p:contains("Japanese")',
    'Japanese: '
  );
  const poster = $('.fotoanime img').attr('src') || '';
  const type = extractText('.infozingle p:contains("Tipe")', 'Tipe: ');
  const release_date = extractText(
    '.infozingle p:contains("Tanggal Rilis")',
    'Tanggal Rilis: '
  );
  const status = extractText('.infozingle p:contains("Status")', 'Status: ');
  const synopsis = $('.sinopc').text().trim();
  const studio = extractText('.infozingle p:contains("Studio")', 'Studio: ');

  const genres: { name: string; slug: string; anime_url: string }[] = [];
  $('.infozingle p:contains("Genre") a').each((_, element) => {
    const name = $(element).text().trim();
    const genreSlug = $(element).attr('href')?.split('/')[4] || '';
    const anime_url = $(element).attr('href') || '';
    genres.push({ name, slug: genreSlug, anime_url });
  });

  const episode_lists: { episode: string; slug: string }[] = [];
  const batch: { episode: string; slug: string }[] = [];
  $('.episodelist ul li span a').each((_, element) => {
    const episode = $(element).text().trim();
    const href = $(element).attr('href'); // Ambil atribut href
    let episodeSlug = '';
    if (href) {
      const segments = href.split('/');
      episodeSlug = segments.pop() || segments[segments.length - 1] || ''; // Ambil slug dari URL
    }

    if (episode.toLowerCase().includes('batch')) {
      batch.push({ episode, slug: episodeSlug });
    } else {
      episode_lists.push({ episode, slug: episodeSlug });
    }
  });

  const producers: string[] = extractText(
    '.infozingle p:contains("Produser")',
    'Produser: '
  )
    .split(',')
    .map((producer) => producer.trim());

  const recommendations: {
    title: string;
    slug: string;
    poster: string;
    status: string;
    type: string;
  }[] = [];
  $('#recommend-anime-series .isi-anime').each((_, element) => {
    const title = $(element).find('.judul-anime a').text().trim();
    const url = $(element).find('a').attr('href') || '';
    const poster = $(element).find('img').attr('src') || '';
    const slug = url.split('/')[4] || '';
    recommendations.push({ title, slug, poster, status: '', type: '' });
  });

  return {
    title,
    alternative_title,
    poster,
    type,
    release_date,
    status,
    synopsis,
    studio,
    genres,
    producers,
    recommendations,
    batch, // Batch data terpisah
    episode_lists, // Episode reguler
  };
};

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await params;
  const html = (await fetchAnimePage(slug)) as string;
  const animeData = parseAnimeData(html);

  const response = NextResponse.json({ status: 'Ok', data: animeData });
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const GET = withLogging(handler);
