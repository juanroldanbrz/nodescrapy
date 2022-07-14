import * as fs from 'fs';
import appRoot from 'app-root-path';
import MockAdapter from 'axios-mock-adapter';
import {
  AxiosHttpClient, DbLinkStore, HtmlResponse, WebCrawler,
} from '..';

const indexHtml = fs.readFileSync(`${appRoot}/tests/resources/index.html`).toString();
const listing2Html = fs.readFileSync(`${appRoot}/tests/resources/amsterdam-listing-2.html`).toString();
const house1Html = fs.readFileSync(`${appRoot}/tests/resources/house-1.html`).toString();
const house2Html = fs.readFileSync(`${appRoot}/tests/resources/house-2.html`).toString();
const house3Html = fs.readFileSync(`${appRoot}/tests/resources/house-3.html`).toString();
const house4Html = fs.readFileSync(`${appRoot}/tests/resources/house-4.html`).toString();

const dataPathFolder = `${appRoot}/tests/tmp/`;

describe('WebCrawler', () => {
  const onItemCrawledFunction = (response: HtmlResponse): { [key: string]: any; } | undefined => {
    if (!response.url.includes('houses')) {
      return undefined;
    }

    const { $ } = response;
    return {
      title: $('.title').text(),
    };
  };

  it('should crawl in an integration test', async () => {
    const crawler = new WebCrawler({
      name: 'testcrawler',
      dataPath: dataPathFolder,
      entryUrls: ['http://www.myhousing.com'],
      dataBatchSize: 50,
      client: {
        concurrentRequests: 5,
        retries: 2,
        delayBetweenRequests: 0.2,
        retryDelay: 0.2,
      },
      discovery: {
        allowedPath: ['/houses', '/housing-listing'],
      },
      onItemCrawled: onItemCrawledFunction,
    });

    const httpClient = crawler.httpClient as AxiosHttpClient;

    for (const axiosInternalClient of httpClient.clients) {
      const mockClient = new MockAdapter(axiosInternalClient);
      mockClient.onGet('http://www.myhousing.com').replyOnce(200, indexHtml);
      mockClient.onGet('http://www.myhousing.com/housing-listing/amsterdam-2')
        .replyOnce(200, listing2Html);
      mockClient.onGet('http://www.myhousing.com/houses/1').replyOnce(200, house1Html);
      mockClient.onGet('http://www.myhousing.com/houses/2').replyOnce(200, house2Html);
      mockClient.onGet('http://www.myhousing.com/houses/3').replyOnce(200, house3Html);
      mockClient.onGet('http://www.myhousing.com/other-link/houses/4').replyOnce(200, house4Html);
      mockClient.onGet('http://www.myhousing.com/other-link/houses/5').reply(404);
      mockClient.onGet('http://www.myhousing.com/housing-listing/amsterdam-3').reply(404);
    }

    await crawler.crawl();

    // Assert
    const linkStore = crawler.linkStore as DbLinkStore;
    const processedLinks = await linkStore.linksTable.findAll({
      where: {
        provider: 'testcrawler',
      },
    });
    const urlStatusMap = new Map<string, string>();
    processedLinks.forEach((link) => urlStatusMap.set(link.get('url').toString(), link.get('status').toString()));

    expect(urlStatusMap.size).toBe(8);
    expect(urlStatusMap.get('http://www.myhousing.com')).toBe('PROCESSED');
    expect(urlStatusMap.get('http://www.myhousing.com/housing-listing/amsterdam-2')).toBe('PROCESSED');
    expect(urlStatusMap.get('http://www.myhousing.com/houses/1')).toBe('PROCESSED');
    expect(urlStatusMap.get('http://www.myhousing.com/houses/2')).toBe('PROCESSED');
    expect(urlStatusMap.get('http://www.myhousing.com/houses/3')).toBe('PROCESSED');
    expect(urlStatusMap.get('http://www.myhousing.com/other-link/houses/4')).toBe('PROCESSED');
    expect(urlStatusMap.get('http://www.myhousing.com/other-link/houses/5')).toBe('FAILED');
    expect(urlStatusMap.get('http://www.myhousing.com/housing-listing/amsterdam-3')).toBe('FAILED');

    const orderRecentFiles = (dir: string) => fs.readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((file) => ({ file, mtime: fs.lstatSync(dir + file).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    const latestJson = orderRecentFiles(dataPathFolder);
    const rawData = fs.readFileSync(dataPathFolder + latestJson[0].file, 'utf8');
    const dataEntries = JSON.parse(rawData);

    const dataEntryUrlToTitle = new Map<string, string>();
    dataEntries.forEach((entry) => {
      dataEntryUrlToTitle.set(entry.url, entry.data.title);
    });

    expect(dataEntryUrlToTitle.get('http://www.myhousing.com/houses/1')).toBe('House 1');
    expect(dataEntryUrlToTitle.get('http://www.myhousing.com/houses/2')).toBe('House 2');
    expect(dataEntryUrlToTitle.get('http://www.myhousing.com/houses/3')).toBe('House 3');
    expect(dataEntryUrlToTitle.get('http://www.myhousing.com/other-link/houses/4')).toBe('House 4');
  });
});
