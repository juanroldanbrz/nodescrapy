import MockAdapter from 'axios-mock-adapter';
import { DefaultHttpClient } from '../index';
import HttpRequest from '../lib/model/HttpRequest';

const HTML = `
<!DOCTYPE html>
<html>
<body>

<h1>My First Heading</h1>

<p>My first paragraph.</p>

</body>
</html>
`;

describe('HttpClient', () => {
  it('Client should retry urls.', async () => {
    const client = await new DefaultHttpClient({ retries: 2, delayBetweenRetries: 0.2 });
    const axiosInternalClient = client.client;
    const mockClient = new MockAdapter(axiosInternalClient);
    mockClient.onGet('https://mybadurl.com/').replyOnce(404);
    mockClient.onGet('https://mybadurl.com/').replyOnce(404);
    mockClient.onGet('https://mybadurl.com/').replyOnce(200, HTML);

    await client.get('https://mybadurl.com/');
  });

  it('Should modify the url on request prepared.', async () => {
    const onRequestPreparedImpl = (request: HttpRequest) : HttpRequest => {
      const proxyUrl = `http://www.myproxy.com?url=${request.url}`;
      const requestHeaders = request.headers;
      requestHeaders.Authorization = 'JWT ...';
      return {
        url: proxyUrl,
        headers: requestHeaders,
      };
    };
    const client = await new DefaultHttpClient({
      retries: 2,
      delayBetweenRetries: 0.2,
      onRequestPrepared: onRequestPreparedImpl,
    });
    const axiosInternalClient = client.client;
    const mockClient = new MockAdapter(axiosInternalClient);
    mockClient.onGet('http://www.myproxy.com?url=https://mybadurl.com/').replyOnce(200, HTML);

    await client.get('https://mybadurl.com/');
  });
});
