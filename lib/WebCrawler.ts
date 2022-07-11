import {DefaultHttpClient, HttpClient} from './client/HttpClient';
import LinkDiscovery from './discovery/LinkDiscovery';
import {LinkStore} from './store/LinkStore';
import {CrawlContinuationMode, CrawlerConfig} from './model/CrawlerConfig';

import {DataStore} from './store/DataStore';
import WebCrawlerBuilder from './WebCrawlerBuilder';
import {Link, LinkStatus} from './model/Link';
import logger from './log/Logger';
import {DataEntry} from '../index';
import HtmlResponse from './model/HtmlResponse';

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

  constructor(config: CrawlerConfig) {
    this.httpClient = new DefaultHttpClient(config.client);
    this.name = config.name ?? 'nodescrapy';
    this.linkExtractor = WebCrawlerBuilder.createLinkExtractor(config);
    this.entryUrls = new Set<string>(config.entryUrls);
    if (config?.onItemCrawled === undefined) {
      throw new Error('onItemCrawled should be defined.');
    }
    this.onItemCrawled = config.onItemCrawled;
    this.linkStorePromise = WebCrawlerBuilder.createLinkStore(config);
    this.dataStore = WebCrawlerBuilder.createDataStore(config);
    this.mode = config?.mode ?? CrawlContinuationMode.START_FROM_SCRATCH;
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
      linksToCrawl = await this.linkStore.findByProviderAndStatus(this.name, LinkStatus.UNPROCESSED, 10);
      for (const link of linksToCrawl) {
        let response: HtmlResponse;
        try {
          response = await this.httpClient.get(link.url);
          const newUrls = this.linkExtractor.extractLinks(response);
          for (const newUrl of newUrls) {
            await this.addUnprocessedLinkIfNew(newUrl);
          }
          const extractedData = this.onItemCrawled(response);
          if (extractedData !== undefined) {
            this.storeData(response, extractedData);
          }
          await this.linkStore.changeStatus(link.id, LinkStatus.PROCESSED);
        } catch (e) {
          logger.error(`Failed to crawl: ${link.url} - ${e}`);
          await this.linkStore.changeStatus(link.id, LinkStatus.FAILED);
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
