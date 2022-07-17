import MockAdapter from 'axios-mock-adapter';
import {
  HtmlResponse, AxiosHttpClient, LinkDiscovery, LinkDiscoveryConfig,
} from '../index';

const HTML = `
<!DOCTYPE html>
<html>
<body>

<a href="https://www.mydomain.com/valid/url">My First Heading</a>
<a href="https://www.mydomain.com/valid/url2?1234">My First Heading</a>
<a href="https://otherdomain.com/something">My First Heading</a>
<a href="/valid/url3">My First Heading</a>
<a href="/invalid/url3">My First Heading</a>
<p>My first paragraph.</p>

</body>
</html>
`;

const defaultHttpConfig = {
  retries: 2,
  userAgent: 'Firefox',
  retryDelay: 0.2,
  delayBetweenRequests: 1,
  timeoutSeconds: 100,
  concurrentRequests: 1,
  beforeRequest: undefined,
};

describe('LinkDiscovery', () => {
  const linkDiscoveryConfig: LinkDiscoveryConfig = {
    allowedDomains: ['www.mydomain.com'],
    allowedPath: ['mydomain.com/valid/.*'],
    removeQueryParams: true,
    onLinksDiscovered: undefined,
  };

  const client = new AxiosHttpClient(defaultHttpConfig);
  const axiosInternalClient = client.clients[0];
  const mockClient = new MockAdapter(axiosInternalClient);
  mockClient.onGet().reply(200, HTML);

  it('Should extract the links', async () => {
    const responseWrapper = await client.get(['https://www.mydomain.com']);
    const result = new LinkDiscovery(linkDiscoveryConfig).extractLinks(responseWrapper[0].response);

    expect(result.size).toBe(3);

    expect(result.has('https://www.mydomain.com/valid/url')).toBeTruthy();
    expect(result.has('https://www.mydomain.com/valid/url2')).toBeTruthy();
    expect(result.has('https://www.mydomain.com/valid/url3')).toBeTruthy();
  });

  it('Should keep the query parameters', async () => {
    const responseWrapper = await client.get(['https://www.mydomain.com']);
    linkDiscoveryConfig.removeQueryParams = false;
    const result = new LinkDiscovery(linkDiscoveryConfig).extractLinks(responseWrapper[0].response);

    expect(result.size).toBe(3);
    expect(result.has('https://www.mydomain.com/valid/url2?1234')).toBeTruthy();
  });

  it('Should run the onLinkDiscovered method', async () => {
    const responseWrapper = await client.get(['https://www.mydomain.com']);
    linkDiscoveryConfig.removeQueryParams = false;
    linkDiscoveryConfig.onLinksDiscovered = (htmlResponse: HtmlResponse, links: string[]) => {
      links.push('https://mycustomurl.com');
      return links;
    };
    const result = new LinkDiscovery(linkDiscoveryConfig).extractLinks(responseWrapper[0].response);

    expect(result.size).toBe(4);
    expect(result.has('https://mycustomurl.com')).toBeTruthy();
  });
});
