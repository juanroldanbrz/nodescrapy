import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { Cluster } from 'puppeteer-cluster';
import { HtmlResponseWrapper } from '../model/HtmlResponse';
import HttpRequest from '../model/HttpRequest';
import HttpClient from './HttpClient';
import logger from '../log/Logger';
import { HttpClientConfig } from '../model/CrawlerConfig';

interface DataToCrawl {
  url: string;
  promiseResolve: Promise<HtmlResponseWrapper>
}

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
  readonly config: HttpClientConfig;

  cluster: Cluster;

  constructor(config: HttpClientConfig) {
    this.config = config;
  }

  async destroy(): Promise<void> {
    await this.cluster.idle();
    await this.cluster.close();
  }

  beforeRequest(httpRequest: HttpRequest): HttpRequest {
    return httpRequest;
  }

  async get(urls: string[]): Promise<HtmlResponseWrapper[]> {
    const promises: Promise<HtmlResponseWrapper>[] = [];
    for (let i = 0; i < urls.length; i += 1) {
      promises.push(this.onGetRequest(urls[i], 0));
    }

    return Promise.all(promises);
  }

  async onGetRequest(requestUrl: string, requestPoolId: number): Promise<HtmlResponseWrapper> {
    try {
      return await this.cluster.execute(requestUrl, async ({ page, data }) => {
        const innerRequestUrl = data;
        logger.info(`Crawling ${innerRequestUrl}`);
        const httpResponse = await page.goto(innerRequestUrl, { waitUntil: 'networkidle2' });
        if (this.config.autoScrollToBottom) {
          await autoScroll(page);
        }
        await page.waitForTimeout(this.config.delayBetweenRequests * 1000);
        const content = await page.content();
        const cheerioResponse = cheerio.load(content);
        const innerResponse = { url: innerRequestUrl, originalResponse: httpResponse, $: cheerioResponse };
        return { url: innerRequestUrl, response: innerResponse, isSuccess: true };
      });
    } catch (e) {
      logger.error(`Failed to crawl: ${requestUrl} - ${e}`);
      return { url: requestUrl, response: undefined, isSuccess: false };
    }
  }

  async initialize(): Promise<void> {
    this.cluster = await Cluster.launch({
      puppeteerOptions: {
        headless: true,
      },
      concurrency: Cluster.CONCURRENCY_PAGE,
      maxConcurrency: this.config.concurrentRequests,
      retryLimit: this.config.retries,
      retryDelay: this.config.retryDelay * 1000,
      timeout: this.config.timeoutSeconds * 1000,
    });

    this.cluster.on('taskerror', (err, data, willRetry) => {
      if (willRetry) {
        logger.warn(`Encountered an error while crawling ${data.url}. ${err.message}\nThis job will be retried`);
      } else {
        logger.error(`Failed to crawl ${data.url}: ${err.message}`);
      }
    });

    return Promise.resolve(undefined);
  }
}

export default PuppeteerHttpClient;
