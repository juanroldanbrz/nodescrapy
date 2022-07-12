import { WebCrawlerBuilder } from '../index';
import HttpRequest from '../lib/model/HttpRequest';

describe('WebCrawlerBuilder', () => {
  it('Should create the http client with default configuration', async () => {
    const client = WebCrawlerBuilder.createHttpClient({});
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

    const client = WebCrawlerBuilder.createHttpClient(config);
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
});
