import * as cheerio from 'cheerio';
import { NextRequest, NextResponse } from 'next/server';
import { fetchWithProxy } from '@/lib/fetchWithProxy';
import logger from '@/lib/logger'; // Make sure to import your logger
import { corsHeaders } from '@/lib/corsHeaders'; // Import corsHeaders

async function fetchAnimePage(slug: string): Promise<string> {
  const { data, contentType } = await fetchWithProxy(
    `https://alqanime.net/advanced-search/page/${slug}/?status=completed&order=update`
  );

  if (!data) {
    throw new Error('Failed to fetch data');
  }

  if (contentType && contentType.includes('application/json')) {
    throw new Error('Expected HTML but received JSON');
  }

  if (typeof data !== 'string') {
    throw new Error('Expected HTML but received non-string data');
  }
  return data;
}

function parseAnimePage(html: string, slug: string) {
  const $ = cheerio.load(html);

  const animeList: {
    title: string;
    slug: string;
    poster: string;
    episode: string;
    anime_url: string;
  }[] = [];

  const pagination = {
    current_page: parseInt(slug, 10) || 1,
    last_visible_page:
      parseInt($('.pagination .page-numbers:not(.next):last').last().text()) ||
      1,
    has_next_page: $('.pagination .next.page-numbers').length > 0,
    next_page:
      $('.pagination .next.page-numbers').length > 0
        ? parseInt(slug, 10) + 1
        : null,
    has_previous_page: parseInt(slug, 10) > 1,
    previous_page: parseInt(slug, 10) > 1 ? parseInt(slug, 10) - 1 : null,
  };

  $('.listupd article.bs').each((index, element) => {
    const title = $(element).find('.ntitle').text().trim() || '';
    const slug = $(element).find('a').attr('href')?.split('/')[3] || '';
    const poster = $(element).find('img').attr('data-src') || '';
    const episode = $(element).find('.epx').text().trim() || 'N/A';
    const anime_url = $(element).find('a').attr('href') || '';

    animeList.push({
      title,
      slug,
      poster,
      episode,
      anime_url,
    });
  });

  return { animeList, pagination };
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const { slug } = params;

  const ip =
    req.headers.get('x-forwarded-for') ||
    req.headers.get('remote-addr') ||
    'unknown';
  const url = req.url;

  try {
    const html = await fetchAnimePage(slug);
    const { animeList, pagination } = parseAnimePage(html, slug);

    logger.info('Request processed', {
      ip,
      url,
      completeAnimeCount: animeList.length,
      pagination,
    });

    return NextResponse.json(
      {
        status: 'Ok',
        data: animeList,
        pagination,
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Failed to scrape data' },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
