import * as cheerio from 'cheerio';
import { NextRequest, NextResponse } from 'next/server';
import { fetchWithProxy } from '@/lib/fetchWithProxy';
import logger from '@/lib/logger';
import { corsHeaders } from '@/lib/corsHeaders';

async function fetchHtml(url: string): Promise<string> {
  const response = await fetchWithProxy(url);

  if (!response.data) {
    throw new Error(`Failed to fetch data from ${url}`);
  }

  if (typeof response.data !== 'string') {
    throw new Error(
      `Expected response data to be a string but got ${typeof response.data}`
    );
  }
  return response.data;
}

function parseOngoingAnime(html: string) {
  const $ = cheerio.load(html);
  const ongoingAnime: {
    title: string;
    slug: string;
    poster: string;
    current_episode: string;
    anime_url: string;
  }[] = [];

  $('.listupd .bs').each((index, element) => {
    const title = $(element).find('.ntitle').text().trim() || '';
    const slug = $(element).find('a').attr('href')?.split('/')[3] || '';
    const poster = $(element).find('img').attr('data-src') || '';
    const current_episode = $(element).find('.epx').text().trim() || 'N/A';
    const anime_url = $(element).find('a').attr('href') || '';

    ongoingAnime.push({
      title,
      slug,
      poster,
      current_episode,
      anime_url,
    });
  });

  return ongoingAnime;
}

function parseCompleteAnime(html: string) {
  const $ = cheerio.load(html);
  const completeAnime: {
    title: string;
    slug: string;
    poster: string;
    episode_count: string;
    anime_url: string;
  }[] = [];

  $('.listupd .bs').each((index, element) => {
    const title = $(element).find('.ntitle').text().trim() || '';
    const slug = $(element).find('a').attr('href')?.split('/')[3] || '';
    const poster = $(element).find('img').attr('data-src') || '';
    const episode_count = $(element).find('.epx').text().trim() || 'N/A';
    const anime_url = $(element).find('a').attr('href') || '';

    completeAnime.push({
      title,
      slug,
      poster,
      episode_count,
      anime_url,
    });
  });

  return completeAnime;
}

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for') ||
    req.headers.get('remote-addr') ||
    'unknown';
  const url = req.url;

  try {
    const ongoingHtml = await fetchHtml(
      'https://alqanime.net/advanced-search/?status=ongoing&order=update'
    );
    const completeHtml = await fetchHtml(
      'https://alqanime.net/advanced-search/?status=completed&order=update'
    );

    const ongoingAnime = parseOngoingAnime(ongoingHtml);
    const completeAnime = parseCompleteAnime(completeHtml);

    logger.info('Request processed', {
      ip,
      url,
      ongoingAnimeCount: ongoingAnime.length,
      completeAnimeCount: completeAnime.length,
    });

    return NextResponse.json(
      {
        status: 'Ok',
        data: {
          ongoing_anime: ongoingAnime,
          complete_anime: completeAnime,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Failed to scrape data', { error, url });
    return NextResponse.json(
      { message: 'Failed to scrape data' },
      { status: 500, headers: corsHeaders }
    );
  }
}
