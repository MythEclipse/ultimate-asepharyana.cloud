import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import logger from '@/lib/logger';
import https from 'https';
import { DEFAULT_HEADERS } from '@/lib/DHead';
import { scrapeCroxyProxy } from './scrapeCroxyProxy';
import { redis } from '@/lib/redis';

const DEFAULT_PROXY_LIST_URL =
  'https://www.proxy-list.download/api/v1/get?type=https';

function getProxyListUrl(): string {
  return process.env.PROXY_LIST_URL || DEFAULT_PROXY_LIST_URL;
}

function parseProxyLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (/^(http|https|socks4|socks5):\/\//.test(trimmed)) return trimmed;
  if (/^[^:]+:\d+$/.test(trimmed)) return `https://${trimmed}`;
  return null;
}

async function getProxies(): Promise<string[]> {
  try {
    const res = await fetch(getProxyListUrl());
    if (!res.ok) {
      const error = new Error(`Failed to fetch proxy list: ${res.statusText}`);
      logger.error('Error fetching proxy list:', error);
      throw error;
    }
    const data = await res.text();
    return data
      .split('\n')
      .map(parseProxyLine)
      .filter((proxy): proxy is string => !!proxy)
      .slice(0, 10); // Only use the first 10 proxies
  } catch (error) {
    logger.error(
      'Network or unexpected error while fetching proxy list:',
      error
    );
    throw error;
  }
}

let cachedProxies: string[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 6 * 60 * 1000;

async function getCachedProxies(): Promise<string[]> {
  const now = Date.now();
  if (!cachedProxies || now - cacheTimestamp > CACHE_DURATION) {
    cachedProxies = await getProxies();
    cacheTimestamp = now;
  }
  return cachedProxies;
}

function isInternetBaikBlockPage(data: string | object): boolean {
  if (typeof data !== 'string') return false;
  return (
    data.includes('internetbaik.telkomsel.com') ||
    data.includes('VmaxAdManager.js') ||
    data.includes('VmaxAdHelper')
  );
}

// --- REDIS CACHE WRAPPER START ---
function getFetchCacheKey(slug: string): string {
  return `fetch:proxy:${slug}`;
}

async function getCachedFetch(
  slug: string
): Promise<{ data: string | object; contentType: string | null } | null> {
  const key = getFetchCacheKey(slug);
  const cached = await redis.get(key);
  if (cached) {
    try {
      const parsed = JSON.parse(
        typeof cached === 'string' ? cached : JSON.stringify(cached)
      );
      logger.info(`[fetchWithProxy] Returning cached response for ${slug}`);
      return parsed;
    } catch {
      // ignore parse error, fallback to fetch
    }
  }
  return null;
}

async function setCachedFetch(
  slug: string,
  value: { data: string | object; contentType: string | null }
) {
  const key = getFetchCacheKey(slug);
  await redis.set(key, JSON.stringify(value), { ex: 120 });
}
// --- REDIS CACHE WRAPPER END ---

export async function fetchWithProxy(
  slug: string
): Promise<{ data: string | object; contentType: string | null }> {
  // Try Redis cache first
  const cached = await getCachedFetch(slug);
  if (cached) return cached;

  try {
    const res = await fetch(slug, {
      headers: DEFAULT_HEADERS,
      cache: 'no-store',
    });
    logger.info(`[fetchWithProxy] Direct fetch response:`, {
      url: slug,
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const jsonData = await res.json();
        if (isInternetBaikBlockPage(JSON.stringify(jsonData))) {
          logger.warn('Blocked by internetbaik (direct fetch), trying proxies');
          const proxyResult = await fetchFromProxies(slug);
          await setCachedFetch(slug, proxyResult);
          return proxyResult;
        }
        const result = { data: jsonData, contentType };
        await setCachedFetch(slug, result);
        return result;
      }
      const textData = await res.text();
      if (isInternetBaikBlockPage(textData)) {
        logger.warn('Blocked by internetbaik (direct fetch), trying proxies');
        const proxyResult = await fetchFromProxies(slug);
        await setCachedFetch(slug, proxyResult);
        return proxyResult;
      }
      const result = { data: textData, contentType };
      await setCachedFetch(slug, result);
      return result;
    }
    const error = new Error(`Direct fetch failed with status ${res.status}`);
    logger.error(
      `Direct fetch failed for ${slug}: Status ${res.status}`,
      error
    );
    logger.error('Direct fetch failed, trying proxies');
    const proxyResult = await fetchFromProxies(slug);
    await setCachedFetch(slug, proxyResult);
    return proxyResult;
  } catch (error) {
    logger.warn(`Direct fetch failed for ${slug}:`, error);
    logger.error('Direct fetch failed, trying proxies');
    const proxyResult = await fetchFromProxies(slug);
    await setCachedFetch(slug, proxyResult);
    return proxyResult;
  }
}

export async function fetchWithProxyOnly(
  slug: string
): Promise<{ data: string | object; contentType: string | null }> {
  // Try Redis cache first
  const cached = await getCachedFetch(slug);
  if (cached) return cached;

  const proxyResult = await fetchFromProxies(slug);
  await setCachedFetch(slug, proxyResult);
  return proxyResult;
}

function getAgent(proxyUrl: string) {
  if (proxyUrl.startsWith('socks4://') || proxyUrl.startsWith('socks5://')) {
    return new SocksProxyAgent(proxyUrl);
  }
  return new HttpsProxyAgent(proxyUrl);
}

async function fetchFromProxies(
  slug: string
): Promise<{ data: string | object; contentType: string | null }> {
  let lastError: Error | null = null;
  const proxies = await getCachedProxies();
  for (const proxyUrl of proxies) {
    // LOG: Starting proxy attempt for ${proxyUrl}
    logger.info(`[DEBUG] Proxy loop: Trying proxy ${proxyUrl}`);
    try {
      const agent = getAgent(proxyUrl);
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
      const axiosConfig = {
        headers: DEFAULT_HEADERS,
        httpsAgent,
        httpAgent: agent,
        timeout: 6000,
      };
      const response = await axios.get(slug, axiosConfig);
      logger.info(`[ProxyListOnly] Proxy fetch request: ${proxyUrl}`, {
        url: slug,
        proxy: proxyUrl,
        headers: JSON.stringify(axiosConfig.headers),
        payload: JSON.stringify({
          httpsAgent: !!axiosConfig.httpsAgent,
          httpAgent: !!axiosConfig.httpAgent,
          timeout: axiosConfig.timeout,
        }),
      });
      logger.info(`[fetchWithProxy] Proxy fetch response:`, {
        url: slug,
        proxy: proxyUrl,
        status: response.status,
        headers: JSON.stringify(response.headers),
      });
      if (response.status === 200) {
        const contentType = response.headers['content-type'] || null;
        if (typeof response.data === 'string') {
          logger.info('[DEBUG] response.data is string');
          if (isInternetBaikBlockPage(response.data)) {
            logger.info('[DEBUG] continue: block page detected for string');
            logger.warn(
              `Blocked by internetbaik (proxy ${proxyUrl}), trying next proxy`
            );
            continue;
          }
        } else if (isInternetBaikBlockPage(JSON.stringify(response.data))) {
          logger.info('[DEBUG] response.data is NOT string');
          logger.info('[DEBUG] continue: block page detected for object');
          logger.warn(
            `Blocked by internetbaik (proxy ${proxyUrl}), trying next proxy`
          );
          continue;
        }
        return { data: response.data, contentType };
      }
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Proxy fetch failed for ${slug} via ${proxyUrl}:`, error);
    }
  }
  logger.error(`Failed to fetch from all proxies for ${slug}:`, lastError);

  // Fallback: try scrapeCroxyProxy as last resort
  try {
    logger.warn('Trying scrapeCroxyProxy fallback...');
    const html = await scrapeCroxyProxy(slug);
    return { data: html, contentType: 'text/html' };
  } catch (scrapeError) {
    logger.error('scrapeCroxyProxy fallback failed:', scrapeError);
    throw new Error(
      lastError?.message ||
        'Failed to fetch from all proxies and scrapeCroxyProxy'
    );
  }
}

// --- CroxyProxyOnly Export ---
export async function CroxyProxyOnly(
  slug: string
): Promise<{ data: string | object; contentType: string | null }> {
  try {
    logger.info(`[CroxyProxyOnly] Using scrapeCroxyProxy for ${slug}`);
    const html = await scrapeCroxyProxy(slug);
    return { data: html, contentType: 'text/html' };
  } catch (error) {
    logger.error('[CroxyProxyOnly] scrapeCroxyProxy failed:', error);
    throw new Error('CroxyProxyOnly failed: ' + (error as Error).message);
  }
}

// --- ProxyListOnly Export ---
export async function ProxyListOnly(
  slug: string,
  limit: number = 10
): Promise<{ data: string | object; contentType: string | null }> {
  let lastError: Error | null = null;
  const proxies = (await getCachedProxies()).slice(0, limit);
  for (const proxyUrl of proxies) {
    logger.info(`[ProxyListOnly] Trying proxy ${proxyUrl}`);
    try {
      const agent = getAgent(proxyUrl);
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
      const axiosConfig = {
        headers: DEFAULT_HEADERS,
        httpsAgent,
        httpAgent: agent,
        timeout: 6000,
      };
      const response = await axios.get(slug, axiosConfig);
      logger.info(`[ProxyListOnly] Proxy fetch request: ${proxyUrl}`, {
        url: slug,
        proxy: proxyUrl,
        headers: JSON.stringify(axiosConfig.headers),
        payload: JSON.stringify({
          httpsAgent: !!axiosConfig.httpsAgent,
          httpAgent: !!axiosConfig.httpAgent,
          timeout: axiosConfig.timeout,
        }),
      });
      logger.info(`[ProxyListOnly] Proxy fetch response:`, {
        url: slug,
        proxy: proxyUrl,
        status: response.status,
        headers: JSON.stringify(response.headers),
      });

      if (response.status === 200) {
        const contentType = response.headers['content-type'] || null;
        let data: string | object = response.data;
        if (contentType?.includes('application/json')) {
          try {
            data = JSON.parse(response.data);
          } catch {
            // fallback to plain text if JSON parse fails
            data = response.data;
          }
        }
        if (typeof data === 'string') {
          if (isInternetBaikBlockPage(data)) {
            logger.warn(
              `[ProxyListOnly] Blocked by internetbaik (proxy ${proxyUrl}), trying next proxy`
            );
            continue;
          }
        } else if (isInternetBaikBlockPage(JSON.stringify(data))) {
          logger.warn(
            `[ProxyListOnly] Blocked by internetbaik (proxy ${proxyUrl}), trying next proxy`
          );
          continue;
        }
        return { data, contentType };
      }
    } catch (error) {
      lastError = error as Error;
      logger.warn(
        `[ProxyListOnly] Proxy fetch failed for ${slug} via ${proxyUrl}:`,
        error
      );
    }
  }
  logger.error(
    `[ProxyListOnly] Failed to fetch from all proxies for ${slug}:`,
    lastError
  );
  throw new Error(
    lastError?.message || '[ProxyListOnly] Failed to fetch from all proxies'
  );
}
