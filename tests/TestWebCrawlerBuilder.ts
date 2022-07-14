import appRoot from 'app-root-path';
import {
  DataStore,
  WebCrawlerBuilder,
  HttpRequest,
  DataEntry,
  FileDataStore,
  DbLinkStore,
  LinkStore,
  Link,
  LinkStatus,
  AxiosHttpClient,
} from '../index';

describe('WebCrawlerBuilder', () => {
  it('Should create the http client with default configuration', async () => {
    const client = WebCrawlerBuilder.createHttpClient({}) as AxiosHttpClient;
    expect(client.originalConfig.concurrentRequests).toBe(1);
    expect(client.originalConfig.userAgent).toBe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
            + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36');
    expect(client.originalConfig.delayBetweenRequests).toBe(2);
    expect(client.originalConfig.timeoutSeconds).toBe(10);
    expect(client.originalConfig.concurrentRequests).toBe(1);
    expect(client.originalConfig.retryDelay).toBe(5);
    expect(client.originalConfig.beforeRequest).toBeUndefined();
  });

  it('Should create the http client overriding default configuration', async () => {
    const config = {
      retries: 5,
      userAgent: 'Firefox',
      retryDelay: 0.2,
      delayBetweenRequests: 5,
      timeoutSeconds: 100,
      concurrentRequests: 5,
      beforeRequest: (httpRequest: HttpRequest) => httpRequest,
    };

    const client = WebCrawlerBuilder.createHttpClient(config) as AxiosHttpClient;
    expect(client.originalConfig.concurrentRequests).toBe(5);
    expect(client.originalConfig.userAgent).toBe('Firefox');
    expect(client.originalConfig.delayBetweenRequests).toBe(5);
    expect(client.originalConfig.retries).toBe(5);
    expect(client.originalConfig.timeoutSeconds).toBe(100);
    expect(client.originalConfig.retryDelay).toBe(0.2);
    expect(client.originalConfig.beforeRequest).toBeDefined();
  });

  it('Should create the link discovery with default configuration', async () => {
    const linkDiscovery = WebCrawlerBuilder.createLinkDiscovery({
      entryUrls: ['http://www.mydomain.com', 'http://myotherdomain.com'],
      onItemCrawled: (response) => undefined,
    });

    expect(linkDiscovery.allowedDomains.size).toBe(2);
    expect(linkDiscovery.allowedDomains.has('www.mydomain.com')).toBeTruthy();
    expect(linkDiscovery.allowedDomains.has('myotherdomain.com')).toBeTruthy();
    expect(linkDiscovery.allowedPath.size).toBe(1);
    expect(linkDiscovery.allowedPath.has('.*')).toBeTruthy();
    expect(linkDiscovery.removeQueryParams).toBeTruthy();
    expect(linkDiscovery.onLinksDiscovered).toBeUndefined();
  });

  it('Should create the link discovery overriding the default configuration', async () => {
    const linkDiscovery = WebCrawlerBuilder.createLinkDiscovery({
      discovery: {
        allowedPath: ['amsterdam', 'for-rent'],
        allowedDomains: ['www.test.com'],
        removeQueryParams: false,
        onLinksDiscovered: (response, links) => links,
      },
      entryUrls: ['http://www.mydomain.com', 'http://myotherdomain.com'],
      onItemCrawled: (response) => undefined,
    });

    expect(linkDiscovery.allowedDomains.size).toBe(1);
    expect(linkDiscovery.allowedDomains.has('www.test.com')).toBeTruthy();
    expect(linkDiscovery.allowedPath.size).toBe(2);
    expect(linkDiscovery.allowedPath.has('amsterdam')).toBeTruthy();
    expect(linkDiscovery.allowedPath.has('for-rent')).toBeTruthy();
    expect(linkDiscovery.removeQueryParams).toBeFalsy();
    expect(linkDiscovery.onLinksDiscovered).toBeDefined();
  });

  it('Should create the data store with the override implementation', async () => {
    class DataStoreImpl implements DataStore {
      addData(dataEntry: DataEntry) {
      }

      afterCrawl() {
      }

      beforeCrawl() {
      }
    }
    const dataStoreImpl = new DataStoreImpl();

    const dataStore = WebCrawlerBuilder.createDataStore({
      entryUrls: ['http://www.mydomain.com', 'http://myotherdomain.com'],
      onItemCrawled: (response) => undefined,
      implementation: {
        dataStore: dataStoreImpl,
      },
    });

    expect(dataStore).toBe(dataStoreImpl);
  });

  it('Should create the data store with the default implementation', async () => {
    let dataStore = WebCrawlerBuilder.createDataStore({
      entryUrls: ['http://www.mydomain.com', 'http://myotherdomain.com'],
      onItemCrawled: (response) => undefined,
      dataPath: './output-data',
    }) as FileDataStore;

    expect(dataStore.dataPath).toBe('./output-data');
    expect(dataStore.dataBatchSize).toBe(50);

    dataStore = WebCrawlerBuilder.createDataStore({
      entryUrls: ['http://www.mydomain.com', 'http://myotherdomain.com'],
      onItemCrawled: (response) => undefined,
      dataPath: './output-data',
      dataBatchSize: 10,
    }) as FileDataStore;

    expect(dataStore.dataPath).toBe('./output-data');
    expect(dataStore.dataBatchSize).toBe(10);
  });

  it('Should fail create the data store if not data path', async () => {
    const createDataStore = () => WebCrawlerBuilder.createDataStore({
      entryUrls: ['http://www.mydomain.com', 'http://myotherdomain.com'],
      onItemCrawled: (response) => undefined,
    });

    expect(createDataStore).toThrow();
  });

  it('Should create linkStore with the default configuration', async () => {
    const linkStore = await WebCrawlerBuilder.createLinkStore({
      entryUrls: ['http://www.mydomain.com', 'http://myotherdomain.com'],
      onItemCrawled: (response) => undefined,
    }) as DbLinkStore;

    expect(linkStore.linksTable.sequelize.config.database).toContain('nodescrapy/cache.sqlite');
    expect(await linkStore.linksTable.count()).toBeGreaterThanOrEqual(0);
  });

  it('Should create linkStore with the sqlite path', async () => {
    const linkStore = await WebCrawlerBuilder.createLinkStore({
      entryUrls: ['http://www.mydomain.com', 'http://myotherdomain.com'],
      onItemCrawled: (response) => undefined,
      sqlitePath: `${appRoot}/tests/tmp/data.sqlite`,
    }) as DbLinkStore;

    expect(linkStore.linksTable.sequelize.config.database).toContain('tmp/data.sqlite');
    expect(await linkStore.linksTable.count()).toBeGreaterThanOrEqual(0);
  });

  it('Should create linkStore with the given implementation', async () => {
    class LinkStoreImpl implements LinkStore {
      addIfNew(link: Link): Promise<Link> {
        return Promise.resolve(undefined);
      }

      changeStatus(id: number, status: LinkStatus) {
      }

      countByProviderAndStatus(provider: string, status: LinkStatus): Promise<number> {
        return Promise.resolve(0);
      }

      deleteAll(provider: string): Promise<number> {
        return Promise.resolve(0);
      }

      findByProviderAndStatus(provider: string, status: LinkStatus, n: number): Promise<Array<Link>> {
        return Promise.resolve(undefined);
      }
    }

    const linkStoreImpl = new LinkStoreImpl();

    const linkStore = await WebCrawlerBuilder.createLinkStore({
      entryUrls: ['http://www.mydomain.com', 'http://myotherdomain.com'],
      onItemCrawled: (response) => undefined,
      implementation: {
        linkStore: linkStoreImpl,
      },
    });

    expect(linkStore).toBe(linkStoreImpl);
  });
});
