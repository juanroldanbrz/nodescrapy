import { HtmlResponse, WebCrawler } from '@bluggie/nodescrapy';

const onItemCrawledFunction = (response: HtmlResponse): { [key: string]: any; } | undefined => {
  if (!response.url.includes('-for-rent')) {
    return undefined;
  }

  const { $ } = response;
  return {
    title: $('.listing-detail-summary__title , #onetrust-accept-btn-handler').text(),
  };
};

const crawler = new WebCrawler({
  dataPath: './',
  entryUrls: ['https://www.pararius.com/apartments/amsterdam/page-1'],
  dataBatchSize: 50,
  client: {
    concurrentRequests: 5,
  },
  discovery: {
    allowedDomains: ['www.pararius.com'],
    allowedPath: ['apartment-for-rent/amsterdam/', '/apartments/amsterdam/page-[1-2]'],
  },
  onItemCrawled: onItemCrawledFunction,
});

crawler.crawl().then(() => console.log('Done'));
