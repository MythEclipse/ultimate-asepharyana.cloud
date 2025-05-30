import { NextResponse, NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { BaseUrl } from '@/lib/url';

declare global {
  interface RequestInit {
    duplex?: 'half' | 'full';
  }
}

const constructUrl = (base: string, path: string) =>
  new URL(path, base.endsWith('/') ? base.slice(0, -1) : base).toString();

const ALLOWED_HEADERS = ['content-type', 'content-length'];

async function compressImageFromBody(
  body: ReadableStream<Uint8Array> | null,
  headers: HeadersInit
) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 10000);

  try {
    const apiUrl = 'https://staging.kecilin.id/api/upload_compress';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body,
      duplex: 'half',
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(`API Error ${response.status}: ${errorBody}`);
      throw new Error(`API request failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format');
    }

    const responseData = await response.json();

    if (!responseData.data?.filename) {
      throw new Error('Invalid response structure');
    }

    return {
      status: responseData.status,
      message: responseData.message,
      data: {
        size_ori: responseData.data.size_ori,
        compress_size: responseData.data.compress_size,
        filename: responseData.data.filename,
        link: constructUrl(
          BaseUrl,
          `/api/img_compress?url=${encodeURIComponent(responseData.data.filename)}`
        ),
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    logger.error('Compress Image Error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const headers = new Headers();
    ALLOWED_HEADERS.forEach((header) => {
      const value = request.headers.get(header);
      if (value) headers.set(header, value);
    });

    const result = await compressImageFromBody(request.body, headers);
    return NextResponse.json(result);
  } catch (error) {
    const status =
      error instanceof Error && error.message.includes('API request failed')
        ? Number(error.message.split(': ')[1]) || 500
        : 500;

    return NextResponse.json(
      { status, message: 'Proxy error occurred' },
      { status }
    );
  }
}

export async function GET(request: NextRequest) {
  const kecilin = 'https://backdoor.kecilin.id';
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json(
        { status: 400, message: 'Missing url parameter' },
        { status: 400 }
      );
    }

    try {
      new URL(fileUrl);
    } catch {
      return NextResponse.json(
        { status: 400, message: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const fetchImage = await fetch(fileUrl);
    if (!fetchImage.ok) {
      throw new Error(`Failed to fetch image from url: ${fetchImage.status}`);
    }

    const arrayBuffer = await fetchImage.arrayBuffer();
    const blob = new Blob([arrayBuffer], {
      type:
        fetchImage.headers.get('content-type') || 'application/octet-stream',
    });
    const formData = new FormData();
    formData.append('file', blob, 'image.jpg');

    const apiUrl = 'https://backdoor.kecilin.id/api/post/compress';

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(`API Error ${response.status}: ${errorBody}`);
      throw new Error(`API request failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const responseData = await response.json();

      if (!responseData.data?.filename) {
        throw new Error('Invalid response structure');
      }

      const downloadLink = constructUrl(
        kecilin,
        `/api/upload_compress/${encodeURIComponent(responseData.data.filename)}`
      );
      const imagefinal = await fetch(downloadLink);
      if (imagefinal.status === 200) {
        const imageBuffer = await imagefinal.arrayBuffer();
        return new Response(imageBuffer, {
          headers: {
            'Content-Type':
              imagefinal.headers.get('content-type') ||
              'application/octet-stream',
            'Content-Disposition': 'inline',
          },
        });
      } else {
        return NextResponse.json({
          status: responseData.status,
          message: responseData.message,
          data: {
            size_ori: responseData.data.size_ori,
            compress_size: responseData.data.compress_size,
            filename: responseData.data.filename,
            link: downloadLink,
          },
        });
      }
    } else if (contentType?.startsWith('image/')) {
      const imageBuffer = await response.arrayBuffer();
      return new Response(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': 'inline',
        },
      });
    } else {
      const errorBody = await response.text();
      logger.error('Unexpected response format:', errorBody);
      throw new Error('Unexpected response format');
    }
  } catch (error) {
    logger.error('GET Compress Error:', error);
    return NextResponse.json(
      { status: 500, message: 'Error processing image URL' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
