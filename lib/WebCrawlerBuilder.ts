import * as url from 'url';
import {Sequelize} from 'sequelize';
import {CrawlerConfig} from './model/CrawlerConfig';
import {DbLinkStore, LinkStore} from './store/LinkStore';
import LinkDiscovery from './discovery/LinkDiscovery';
import {DataStore, FileDataStore} from './store/DataStore';

const appRoot = require('app-root-path');

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

  public static createLinkExtractor(config: CrawlerConfig): LinkDiscovery {
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
