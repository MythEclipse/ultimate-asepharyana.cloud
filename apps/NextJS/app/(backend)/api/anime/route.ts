import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';
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

  $('.venz ul li').each((index, element) => {
    const title = $(element).find('.thumbz h2.jdlflm').text().trim() || '';
    const slug = $(element).find('a').attr('href')?.split('/')[4] || '';
    const poster = $(element).find('img').attr('src') || '';
    const current_episode = $(element).find('.epz').text().trim() || 'N/A';
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

  $('.venz ul li').each((index, element) => {
    const title = $(element).find('.thumbz h2.jdlflm').text().trim() || '';
    const slug = $(element).find('a').attr('href')?.split('/')[4] || '';
    const poster = $(element).find('img').attr('src') || '';
    const episode_count = $(element).find('.epz').text().trim() || 'N/A';
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

export async function GET(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('remote-addr') ||
    'unknown';
  const url = request.url;

  try {
    const ongoingHtml = await fetchHtml(
      'https://otakudesu.cloud/ongoing-anime/'
    );
    const completeHtml = await fetchHtml(
      'https://otakudesu.cloud/complete-anime/'
    );

    const ongoingAnime = parseOngoingAnime(ongoingHtml);
    const completeAnime = parseCompleteAnime(completeHtml);

    logger.info('Request processed', {
      ip,
      url,
      ongoingAnimeCount: ongoingAnime.length,
      completeAnimeCount: completeAnime.length,
    });

    const response = NextResponse.json({
      status: 'Ok',
      data: {
        ongoing_anime: ongoingAnime,
        complete_anime: completeAnime,
      },
    });

    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    logger.error('Failed to scrape data', { error, url });
    const response = NextResponse.json(
      { message: 'Failed to scrape data' },
      { status: 500 }
    );

    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}
