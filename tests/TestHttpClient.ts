import MockAdapter from 'axios-mock-adapter';
import HttpRequest from '../lib/model/HttpRequest';
import HttpClient from '../lib/client/HttpClient';

const HTML = `
<!DOCTYPE html>
<html>
<body>

<h1>My First Heading</h1>

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

describe('HttpClient', () => {
  it('Client should retry urls.', async () => {
    const client = await new HttpClient(defaultHttpConfig);
    const axiosInternalClient = client.clients[0];
    const mockClient = new MockAdapter(axiosInternalClient);
    mockClient.onGet('https://mybadurl.com/').replyOnce(404);
    mockClient.onGet('https://mybadurl.com/').replyOnce(404);
    mockClient.onGet('https://mybadurl.com/').replyOnce(200, HTML);

    await client.get(['https://mybadurl.com/']);
  });

  it('Should modify the url on request prepared.', async () => {
    const beforeRequestImpl = (request: HttpRequest): HttpRequest => {
      const proxyUrl = `http://www.myproxy.com?url=${request.url}`;
      const requestHeaders = request.headers;
      requestHeaders.Authorization = 'JWT ...';
      return {
        url: proxyUrl,
        headers: requestHeaders,
      };
    };

    const httpClientConfig = {
      ...defaultHttpConfig,
      beforeRequest: beforeRequestImpl,
    };

    const client = new HttpClient(httpClientConfig);
    const axiosInternalClient = client.clients[0];
    const mockClient = new MockAdapter(axiosInternalClient);
    mockClient.onGet('http://www.myproxy.com?url=https://mybadurl.com/').replyOnce(200, HTML);

    await client.get(['https://mybadurl.com/']);
  });

  it('Should request concurrently.', async () => {
    const httpClientConfig = {
      ...defaultHttpConfig,
      concurrentRequests: 5,
    };
    const client = await new HttpClient(httpClientConfig);
    for (const axiosClient of client.clients) {
      const mockClient = new MockAdapter(axiosClient, { delayResponse: 2000 });
      mockClient.onGet('https://mybadurl.com/').reply(200, HTML);
    }

    await client.get(
      [
        'https://mybadurl.com/',
        'https://mybadurl.com/',
        'https://mybadurl.com/',
        'https://mybadurl.com/',
        'https://mybadurl.com/',
      ],
    );
  });
});
