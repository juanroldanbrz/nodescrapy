const { WebCrawler } = require('@bluggie/nodescrapy');

const onItemCrawledFunction = (response) => {
  if (!response.url.includes('-for-rent')) {
    return undefined;
  }
  const { $ } = response;
  return {
    title: $('.listing-detail-summary__title').text(),
  };
};

const crawler = new WebCrawler({
  name: 'parariusCrawler',
  entryUrls: ['https://www.pararius.com/apartments/amsterdam/page-1'],
  dataPath: './',
  discovery: {
    allowedPath: ['apartment-for-rent/amsterdam/', '/apartments/amsterdam/page-[1-9]+'],
  },
  onItemCrawled: onItemCrawledFunction,
});

crawler.crawl().then(() => console.log('Done'));
