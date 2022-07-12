import LinkDiscovery from './discovery/LinkDiscovery';
import { LinkStore } from './store/LinkStore';
import { CrawlContinuationMode, CrawlerConfig } from './model/CrawlerConfig';

import { DataStore } from './store/DataStore';
import WebCrawlerBuilder from './WebCrawlerBuilder';
import { Link, LinkStatus } from './model/Link';
import logger from './log/Logger';
import { DataEntry, HttpClient } from '../index';
import { HtmlResponse, HtmlResponseWrapper } from './model/HtmlResponse';

class WebCrawler {
  private httpClient: HttpClient;

  private readonly name: string;

  private readonly mode: CrawlContinuationMode;

  private readonly linkExtractor: LinkDiscovery;

  private readonly entryUrls: Set<string>;

  private readonly onItemCrawled: (response: HtmlResponse) => { [key: string]: any; } | undefined;

  private linkStore: LinkStore;

  private readonly linkStorePromise: Promise<LinkStore>;

  private readonly dataStore: DataStore;

  private readonly concurrentRequests: number;

  constructor(config: CrawlerConfig) {
    this.httpClient = WebCrawlerBuilder.createHttpClient(config.client);
    this.name = config.name ?? 'nodescrapy';
    this.linkExtractor = WebCrawlerBuilder.createLinkDiscovery(config);
    this.entryUrls = new Set<string>(config.entryUrls);
    if (config?.onItemCrawled === undefined) {
      throw new Error('onItemCrawled should be defined.');
    }
    this.onItemCrawled = config.onItemCrawled;
    this.linkStorePromise = WebCrawlerBuilder.createLinkStore(config);
    this.dataStore = WebCrawlerBuilder.createDataStore(config);
    this.mode = config?.mode ?? CrawlContinuationMode.START_FROM_SCRATCH;
    this.concurrentRequests = config?.client?.concurrentRequests ?? 1;
  }

  public async crawl(): Promise<void> {
    if (this.linkStore === undefined) {
      this.linkStore = await this.linkStorePromise;
    }
    logger.info('Crawled started.');

    if (this.mode === CrawlContinuationMode.START_FROM_SCRATCH) {
      await this.linkStore.deleteAll(this.name);
    }

    for (const url of this.entryUrls) {
      await this.addUnprocessedLinkIfNew(url);
    }

    let linksToCrawl: Array<Link>;
    this.dataStore.beforeCrawl();

    const crawlingLog = setInterval(this.logCrawlingStatus.bind(this), 60 * 1000);

    do {
      const querySize = this.concurrentRequests < 10 ? 10 : this.concurrentRequests;
      linksToCrawl = await this.linkStore.findByProviderAndStatus(this.name, LinkStatus.UNPROCESSED, querySize);
      const urlsToCrawl = new Map<string, number>();
      linksToCrawl.forEach((link) => urlsToCrawl.set(link.url, link.id));
      const responses = await this.performRequestsInBatch(Array.from(urlsToCrawl.keys()));
      for (const responseWrapper of responses) {
        if (!responseWrapper.isSuccess) {
          await this.linkStore.changeStatus(urlsToCrawl.get(responseWrapper.url), LinkStatus.FAILED);
        } else {
          const { response } = responseWrapper;
          const newUrls = this.linkExtractor.extractLinks(response);
          for (const newUrl of newUrls) {
            await this.addUnprocessedLinkIfNew(newUrl);
          }
          const extractedData = this.onItemCrawled(response);
          if (extractedData !== undefined) {
            this.storeData(response, extractedData);
          }
          await this.linkStore.changeStatus(urlsToCrawl.get(response.url), LinkStatus.PROCESSED);
        }
      }
    } while (linksToCrawl.length > 0);

    this.dataStore.afterCrawl();
    clearInterval(crawlingLog);
    logger.info('Crawled finished.');
  }

  private async logCrawlingStatus(): Promise<void> {
    const unprocessedUrls = await this.linkStore.countByProviderAndStatus(this.name, LinkStatus.UNPROCESSED);
    const processed = await this.linkStore.countByProviderAndStatus(this.name, LinkStatus.PROCESSED);
    logger.info(`Crawled ${processed} urls. Remaining: ${unprocessedUrls}`);
  }

  private async addUnprocessedLinkIfNew(urlToStore: string): Promise<Link> {
    return this.linkStore.addIfNew({
      provider: this.name,
      url: urlToStore,
      status: LinkStatus.UNPROCESSED,
    });
  }

  private async performRequestsInBatch(urls: string[]): Promise<HtmlResponseWrapper[]> {
    const responses = [];
    let urlsToRequest = [];

    for (let i = 0; i < urls.length; i += 1) {
      urlsToRequest.push(urls[i]);
      if (urlsToRequest.length === this.concurrentRequests) {
        const results = await this.httpClient.get(urlsToRequest);
        results.forEach((result) => responses.push(result));
        urlsToRequest = [];
      }
    }

    if (urlsToRequest.length !== 0) {
      const results = await this.httpClient.get(urlsToRequest);
      results.forEach((result) => responses.push(result));
    }
    return responses;
  }

  private storeData(response: HtmlResponse, extractedData: { [key: string]: any; }): void {
    this.dataStore.addData(<DataEntry>{
      provider: this.name,
      url: response.url,
      data: extractedData,
      added_at: new Date(),
      updated_at: new Date(),
    });
  }
}

export default WebCrawler;
