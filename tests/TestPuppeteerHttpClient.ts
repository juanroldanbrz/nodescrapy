import PuppeteerHttpClient from '../lib/client/PuppeteerHttpClient';
import * as mockClusterStatus from '../__mocks__/puppeteer-cluster-status';
import { HttpClientConfig } from '../lib/model/CrawlerConfig';

const defaultHttpConfig: HttpClientConfig = {
  retries: 2,
  userAgent: 'Firefox',
  retryDelay: 0.2,
  delayBetweenRequests: 2,
  timeoutSeconds: 100,
  concurrentRequests: 5,
  beforeRequest: undefined,
  autoScrollToBottom: true,
};

describe('HttpClient', () => {
  beforeEach(() => {
    mockClusterStatus.reset();
  });

  it('Client should be initialized.', async () => {
    const client = await new PuppeteerHttpClient(defaultHttpConfig);
    await client.initialize();
    expect(client.cluster).toBeDefined();
  });

  it('Should close property', async () => {
    const client = await new PuppeteerHttpClient(defaultHttpConfig);
    await client.initialize();
    await client.destroy();

    expect(mockClusterStatus.idle).toBeTruthy();
    expect(mockClusterStatus.closed).toBeTruthy();
  });

  it('Client should request a page.', async () => {
    const client = await new PuppeteerHttpClient(defaultHttpConfig);
    await client.initialize();
    await client.onGetRequest('https://www.amazon.es', 0);
    expect(mockClusterStatus.requestUrl).toBe('https://www.amazon.es');
    expect(mockClusterStatus.visitedPage).toBe('https://www.amazon.es');
    expect(mockClusterStatus.waitedTime).toBe(2000);
    expect(mockClusterStatus.scrolled).toBe(true);

    const clusterConfig = mockClusterStatus.config;

    expect(clusterConfig.puppeteerOptions.headless).toBeTruthy();
    expect(clusterConfig.maxConcurrency).toBe(5);
    expect(clusterConfig.retryDelay).toBe(200);
    expect(clusterConfig.retryLimit).toBe(2);
    expect(clusterConfig.timeout).toBe(100_000);
  });
});
