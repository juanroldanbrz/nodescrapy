import MockAdapter from 'axios-mock-adapter';
import { AxiosHttpClient, HttpRequest } from '..';
import PuppeteerHttpClient from '../lib/client/PuppeteerHttpClient';

const defaultHttpConfig = {
  retries: 2,
  userAgent: 'Firefox',
  retryDelay: 0.2,
  delayBetweenRequests: 1,
  timeoutSeconds: 100,
  concurrentRequests: 1,
  beforeRequest: undefined,
};

describe('HttpClient', () => {
  it('Client should be initialized.', async () => {
    const client = await new PuppeteerHttpClient(defaultHttpConfig);
    await client.initialize();
    expect(client.browser).toBeDefined();
  });

  it('Client should request a page.', async () => {
    const client = await new PuppeteerHttpClient(defaultHttpConfig);
    await client.initialize();
    const response = await client.onGetRequest('https://stackoverflow.com/questions/52497252/'
        + 'puppeteer-wait-until-page-is-completely-loaded', 0);
    const i = 2;
  });
});
