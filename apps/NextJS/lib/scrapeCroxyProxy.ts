/**
// Bun support: Run with
//   bun run apps/NextJS/lib/scrapeCroxyProxy.ts "https://example.com/"
 * Usage (from project root):
 *   bun run apps/NextJS/lib/scrapeCroxyProxy.ts "https://asepharyana.tech/"
 *
 * This will fill the input, submit the form, and print the resulting HTML.
 */
// Scrape https://www.croxyproxy.com/ using Puppeteer with CLI supportimport puppeteer, { Browser, Page } from 'puppeteer';
import puppeteer, { Browser, Page } from 'puppeteer';
import logger from './logger';
import { performance } from 'perf_hooks';

const CROXY_PROXY_URL = 'https://www.croxyproxy.com/';
const URL_INPUT_SELECTOR = 'input#url';
const SUBMIT_BUTTON_SELECTOR = '#requestSubmit';
const MAX_RETRIES = 1;

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-blink-features=AutomationControlled',
  '--disable-dev-shm-usage',
  '--disable-infobars',
  '--window-size=1280,800',
  '--disable-gpu',
  '--disable-extensions',
  '--mute-audio',
];

function getRandomUserAgent(): string {
  const versions = ['115.0.0.0', '116.0.0.0', '117.0.0.0', '118.0.0.0'];
  const os = [
    'Windows NT 10.0; Win64; x64',
    'Macintosh; Intel Mac OS X 10_15_7',
  ];
  const randomOS = os[Math.floor(Math.random() * os.length)];
  const randomVersion = versions[Math.floor(Math.random() * versions.length)];
  return `Mozilla/5.0 (${randomOS}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${randomVersion} Safari/537.36`;
}

async function initializeBrowser(): Promise<{ browser: Browser; page: Page }> {
  const browser = await puppeteer.launch({
    headless: true,
    args: BROWSER_ARGS,
    defaultViewport: { width: 1280, height: 800 },
  });
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const resourceType = request.resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      request.abort();
    } else {
      request.continue();
    }
  });

  await page.setUserAgent(getRandomUserAgent());
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  return { browser, page };
}

export async function scrapeCroxyProxy(targetUrl: string): Promise<string> {
  const startTime = performance.now();
  logger.info(`Scraping ${targetUrl} with CroxyProxy`);
  const { browser, page } = await initializeBrowser();
  let html = '';

  try {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`Attempt ${attempt}/${MAX_RETRIES}`);
        await page.goto(CROXY_PROXY_URL, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });

        await page.waitForSelector(URL_INPUT_SELECTOR, { timeout: 30000 });
        await page.type(URL_INPUT_SELECTOR, targetUrl, { delay: 50 });
        
        logger.info('Form submitted. Waiting for initial navigation...');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
          page.click(SUBMIT_BUTTON_SELECTOR),
        ]);
        
        const currentUrl = page.url();
        const pageContent = await page.content();
        const pageText = pageContent.toLowerCase();

        const isErrorUrl = currentUrl.includes('/requests?fso=');
        const hasErrorText = pageText.includes('your session has outdated') || pageText.includes('something went wrong');

        if (isErrorUrl || hasErrorText) {
          logger.warn(`Error detected (URL: ${isErrorUrl}, Text: ${hasErrorText}). Retrying...`);
          continue;
        }

        if (pageText.includes('proxy is launching')) {
          logger.info('Proxy launching page detected. Waiting for final redirect...');
          await page.waitForNavigation({ waitUntil: 'load', timeout: 120000 });
          logger.info(`Redirected successfully to: ${page.url()}`);
        } else {
          logger.info(`Mapsd directly to: ${page.url()}`);
        }
        
        logger.info('Waiting for CroxyProxy frame to render...');
        await page.waitForSelector('#__cpsHeaderTab', { timeout: 30000 });
        logger.info('CroxyProxy frame rendered.');

        html = await page.content();
        logger.debug('Retrieved page content.');
        break;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Attempt ${attempt} failed: ${errorMessage}`);
        if (attempt === MAX_RETRIES) {
          throw new Error(`Failed to scrape after ${MAX_RETRIES} attempts: ${errorMessage}`);
        }
      }
    }

    if (!html) {
      throw new Error('Failed to retrieve HTML content after all retries.');
    }
    return html;
  } finally {
    const duration = Math.round(performance.now() - startTime);
    console.log(`[info] Total execution time: ${duration} ms`);
    
    await browser.close();
    logger.info('Browser closed.');
  }
}
// Cached version: 1 hour cache
import { redis } from '@/lib/redis';

/**
 * Cached wrapper for scrapeCroxyProxy.
 * @param targetUrl URL to scrape via CroxyProxy
 * @returns HTML string (cached for 1 hour)
 */
export async function scrapeCroxyProxyCached(targetUrl: string): Promise<string> {
  const cacheKey = `scrapeCroxyProxy:${targetUrl}`;
  const cached = await redis.get(cacheKey);
  if (typeof cached === 'string' && cached) {
    logger.info(`[scrapeCroxyProxyCached] Returning cached result for ${targetUrl}`);
    return cached;
  }
  const html = await scrapeCroxyProxy(targetUrl);
  await redis.set(cacheKey, html, { ex: 3600 });
  logger.info(`[scrapeCroxyProxyCached] Cached result for ${targetUrl} (1 hour)`);
  return html;
}

if (require.main === module) {
  const [, , inputUrl] = process.argv;
  if (!inputUrl) {
    logger.error('Usage: bun run apps/NextJS/lib/scrapeCroxyProxy.ts "<url>"');
    process.exit(1);
  }

  logger.info(`CLI execution started for URL: ${inputUrl}`);
  const cliStartTime = performance.now();
  scrapeCroxyProxy(inputUrl)
    .then((resultHtml) => {
      console.log(resultHtml);
      logger.info('CLI execution finished successfully.');
      const duration = Math.round(performance.now() - cliStartTime);
      logger.info(`[info] Total execution time: ${duration} ms`);
    })
    .catch((err) => {
      logger.error(`Scraping failed: ${err.message}`);
    });
}