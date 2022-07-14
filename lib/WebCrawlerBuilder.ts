import * as url from 'url';
import { Sequelize } from 'sequelize';
import { CrawlerConfig, HttpClientConfig } from './model/CrawlerConfig';
import { DbLinkStore, LinkStore } from './store/LinkStore';
import LinkDiscovery from './discovery/LinkDiscovery';
import { DataStore, FileDataStore } from './store/DataStore';
import HttpClient from './client/HttpClient';
import AxiosHttpClient from './client/AxiosHttpClient';

const appRoot = require('app-root-path');

const defaultUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
    + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36';

class WebCrawlerBuilder {
  public static async createLinkStore(config: CrawlerConfig): Promise<LinkStore> {
    if (config?.implementation?.linkStore !== undefined) {
      return config.implementation.linkStore;
    }

    const sqliteDbPath = config?.sqlitePath ?? `${appRoot}/cache.sqlite`;
    const sequelize = new Sequelize(`sqlite:////${sqliteDbPath}`, {
      logging: false,
    });
    const dbLinkStore = new DbLinkStore(sequelize);
    await dbLinkStore.sync();
    return dbLinkStore;
  }

  public static createDataStore(config: CrawlerConfig): DataStore {
    if (config?.implementation?.dataStore !== undefined) {
      return config?.implementation?.dataStore;
    }
    if (config?.dataPath === undefined) {
      throw new Error('dataPath config for storing the data results are needed.');
    }
    const dataPath = config?.dataPath;
    const dataBatchSize = config?.dataBatchSize ?? 50;
    return new FileDataStore(dataPath, dataBatchSize);
  }

  public static createHttpClient(config: HttpClientConfig): HttpClient {
    return new AxiosHttpClient({
      retries: config?.retries ?? 2,
      userAgent: config?.userAgent ?? defaultUserAgent,
      retryDelay: config?.retryDelay ?? 5,
      delayBetweenRequests: config?.delayBetweenRequests ?? 2,
      timeoutSeconds: config?.timeoutSeconds ?? 10,
      concurrentRequests: config?.concurrentRequests ?? 1,
      beforeRequest: config?.beforeRequest,
    });
  }

  public static createLinkDiscovery(config: CrawlerConfig): LinkDiscovery {
    return new LinkDiscovery({
      allowedDomains: config?.discovery?.allowedDomains ?? WebCrawlerBuilder.mapUrlToDomains(config.entryUrls),
      allowedPath: config?.discovery?.allowedPath ?? ['.*'],
      removeQueryParams: config?.discovery?.removeQueryParams ?? true,
      onLinksDiscovered: config?.discovery?.onLinksDiscovered,
    });
  }

  public static mapUrlToDomains(urls: string[]): string[] {
    const toReturn = [];
    for (const entryUrl of urls) {
      toReturn.push(url.parse(entryUrl).hostname);
    }
    return toReturn;
  }
}

export default WebCrawlerBuilder;
