import PuppeteerHttpClient from '../lib/client/PuppeteerHttpClient';

const defaultHttpConfig = {
  retries: 2,
  userAgent: 'Firefox',
  retryDelay: 0.2,
  delayBetweenRequests: 1,
  timeoutSeconds: 100,
  concurrentRequests: 5,
  beforeRequest: undefined,
};

describe('HttpClient', () => {
  jest.setTimeout(100_000);
  it('Client should be initialized.', async () => {
    const client = await new PuppeteerHttpClient(defaultHttpConfig);
    await client.initialize();
    expect(client.cluster).toBeDefined();
  });

  it('Client should request a page.', async () => {
    const client = await new PuppeteerHttpClient(defaultHttpConfig);
    await client.initialize();
    const response = await client.onGetRequest('https://www.amazon.es/gp/new-releases/computers/ref=zg_bsnr_pg_1?ie=UTF8&pg=1', 0);
    const i = 2;
  });
});
