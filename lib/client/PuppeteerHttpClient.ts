import puppeteer, { Browser } from 'puppeteer';
import * as cheerio from 'cheerio';
import { HtmlResponse, HtmlResponseWrapper } from '../model/HtmlResponse';
import HttpRequest from '../model/HttpRequest';
import HttpClient from './HttpClient';
import logger from '../log/Logger';
import { HttpClientConfig } from '../model/CrawlerConfig';

async function autoScroll(page: puppeteer.Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const { scrollHeight } = document.body;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve(undefined);
        }
      }, 100);
    });
  });
}

class PuppeteerHttpClient implements HttpClient {
  readonly delayBetweenRequests: number;

  browser: Browser;

  currentPage: puppeteer.Page;

  constructor(config: HttpClientConfig) {
    this.delayBetweenRequests = config.delayBetweenRequests;
  }

  beforeRequest(httpRequest: HttpRequest): HttpRequest {
    return httpRequest;
  }

  async get(urls: string[]): Promise<HtmlResponseWrapper[]> {
    const toReturn: HtmlResponseWrapper[] = [];
    for (const url of urls) {
      toReturn.push(await this.onGetRequest(url, 0));
    }
    return toReturn;
  }

  async onGetRequest(requestUrl: string, requestPoolId: number): Promise<HtmlResponseWrapper> {
    logger.info(`Crawling ${requestUrl}`);
    const httpResponse = await this.currentPage.goto(requestUrl, { waitUntil: 'networkidle2' });
    await autoScroll(this.currentPage);
    await this.currentPage.waitForTimeout(this.delayBetweenRequests * 1000);
    const content = await this.currentPage.content();
    const cheerioResponse = cheerio.load(content);
    const innerResponse: HtmlResponse = { url: requestUrl, originalResponse: httpResponse, $: cheerioResponse };
    return { url: requestUrl, response: innerResponse, isSuccess: true };
  }

  async initialize(): Promise<void> {
    logger.info('Initializing puppeteer');
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true,
    });
    this.currentPage = await this.browser.newPage();
    await this.currentPage.setViewport({
      width: 1200,
      height: 800,
    });

    return Promise.resolve(undefined);
  }
}

export default PuppeteerHttpClient;
