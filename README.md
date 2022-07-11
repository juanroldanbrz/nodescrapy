<img src="./logo.png" width="400" height="250" />

## Overview

Nodescrapy is a fast high-level and highly configurable web crawling and web scraping framework, used to
crawl websites and extract structured data from their pages.

Nodescrapy is writen in [Typescript](https://www.typescriptlang.org/) and works in a [NodeJs](http://nodejs.org) environment.

Nodescrapy comes with a built-in web spider, which will discover automatically all the URLs of the website.

Nodescrapy saves the status of the crawling in a local Sqlite database, so crawling can be stopped and resumed.

By default, Nodescrapy saves the results of the scrapping in a local folder in JSON files.

```ts
import {HtmlResponse, WebCrawler} from 'nodescrapy';

const onItemCrawledFunction = (response: HtmlResponse) => {
    return { "data1": ... }
}

const crawler = new WebCrawler({
    dataPath: './crawled-items',
    entryUrls: ['https://www.pararius.com/apartments/amsterdam'],
    discovery: {
        allowedDomains: ['www.pararius.com'],
        allowedPath: ['amsterdam/'],
    },
    onItemCrawled: onItemCrawledFunction
});

crawler.crawl()
    .then(() => console.log('Crawled finished'));
```

## What does nodescrapy do?

* Provides a web client configurable with retries and delays.
* Extremely configurable for writing your own crawler.
* Provides a configurable discovery implementation to auto-detecting linked resources and filter the ones you want.
* Saves the status of the crawling in a file storage, so crawled can be paused and resumed.
* Provides basic statistics on crawling status.
* Automatically parses the DOM of the HTMLs with [Cheerio](https://cheerio.js.org/)
* Implementations can be easily extended.
* Fully writen in Typescript.

## Documentation

- [Installation](#installation)
- [Getting started](#getting-started)
- [Crawling modes](#crawling-modes)
- [Data Models](#data-models)
- [Configuration](#crawler-configuration)
- [Roadmap](#roadmap)
- [Contributors](#contributors)
- [License](#license)

## Installation

```sh
npm install --save nodescrapy
```

## Getting Started


Initializing nodescrapy is a simple process. First, you require the module and instantiate it with the config argument. You then configure the properties you like (eg. the request interval), register the `onItemCrawled` method, and call the crawl method. Let's walk through the process!

After requiring the crawler, we create a new instance of it. We supply the constructor with the [Crawler Configuration](#CrawlerConfiguration). 
A simple configuration contains:
* Entry url/urls for the crawler.
* Where to store the crawled items (dataPath).
* What to do when a new page is crawled (function [onItemCrawled](#CrawlerConfiguration+onItemCrawled))

```js
import {HtmlResponse, WebCrawler} from 'nodescrapy';

const onItemCrawledFunction = (response: HtmlResponse) => {
    return { "data1": "test" }
}

const crawler = new WebCrawler({
    dataPath: './crawled-items',
    entryUrls: ['https://www.pararius.com/apartments/amsterdam'],
    onItemCrawled: onItemCrawledFunction
});

crawler.crawl()
    .then(() => console.log('Crawled finished'));
```
The function `onItemCrawledFunction` is required, since the crawler will invoke it to extract the data from hte HTML document.
It will return `undefined` if there is nothing to extract from that page, or an object of `{key: values}` if data could be extracted from that page.
See [onItemCrawled](#CrawlerConfiguration+onItemCrawled) for more information.


When running the application, it will produce the following logs:

```html
info: Jul-08-2022 09:08:57: Crawled started.
info: Jul-08-2022 09:08:57: Crawling https://www.pararius.com/apartments/amsterdam
info: Jul-08-2022 09:09:00: Crawling https://www.pararius.com/apartments/amsterdam/map
info: Jul-08-2022 09:09:01: Crawling https://www.pararius.com/apartment-for-rent/amsterdam/b180b6df/president-kennedylaan
info: Jul-08-2022 09:09:04: Adding crawled entry to data: https://www.pararius.com/apartment-for-rent/amsterdam/b180b6df/president-kennedylaan
info: Jul-08-2022 09:09:04: Crawling https://www.pararius.com/real-estate-agents/amsterdam/expathousing-com-amsterdam
info: Jul-08-2022 09:09:04: Adding crawled entry to data: https://www.pararius.com/apartment-for-rent/amsterdam/b180b64f/president-kennedylaan
info: Jul-08-2022 09:09:20: Saving 2 entries into JSON file: data-2022-07-08T07:09:20.115Z.json
info: Jul-08-2022 12:37:16: Crawled 29 urls. Remaining: 328
```

This will also store the data in a JSON file (by default, 50 entries per JSON file. Configurable with `dataBatchSize` property).
```json
[
  {
    "provider": "nodescrapy",
    "url": "https://www.pararius.com/apartment-for-rent/amsterdam/2365cc70/gillis-van-ledenberchstraat",
    "data": {
      "data1": "test"
    },
    "added_at": "2022-07-08T10:38:53.431Z",
    "updated_at": "2022-07-08T10:38:53.431Z"
  },
  {
    "provider": "nodescrapy",
    "url": "https://www.pararius.com/apartment-for-rent/amsterdam/61e78537/nieuwezijds-voorburgwal",
    "data": {
      "data1": "test"
    },
    "added_at": "2022-07-08T10:38:55.466Z",
    "updated_at": "2022-07-08T10:38:55.466Z"
  }
]
```

## Crawling modes

Nodescrapy can run in two different modes:
- START_BY_SCRATCH
- CONTINUE

In **START_BY_SCRATCH** mode, every time the crawler runs will start from 0, going through the [entryUrls](#CrawlerConfiguration+entryUrls) and all the discovered links.

In **CONTINUE** mode, the crawler will only crawl the links which were not processed from the last run, and also the new ones which are being discovered.

To see how to configure this, go to [mode](#CrawlerConfiguration+mode)


## Data Models

<a name="DataModel+HttpRequest"></a>
#### HttpRequest

HttpRequest is a wrapper including:
- The url which is going to be crawled
- The headers which are going to be send in the request (i.e User-Agent)


```ts
interface HttpRequest {
  url: string;
  
  headers: { [key: string]: string; }
}
```

<a name="DataModel+HtmlResponse"></a>
#### HtmlResponse

HtmlResponse is a wrapper including:
- The crawled url
- The axios response (see [AxiosResponse](https://axios-http.com/docs/res_schema)) 
- The DOM processed by [Cheerio](https://cheerio.js.org/)

This information should be enough to extract the information you need from that webpage.
```ts
interface HtmlResponse {
  url: string;

  axiosResponse: AxiosResponse;

  $: CheerioAPI;
}

```
<a name="DataModel+DataEntry"></a>

#### DataEntry

Represents the data that will be stored in the file system after a page with data has been crawled.

Contains:
- the id of the entry (primary key).
- the provider (crawler name).
- the url.
- the data extracted by the [onItemCrawled](#CrawlerConfiguration+onItemCrawled) function.
- when the data was added and updated.
```ts
interface DataEntry {
    id?: number,
    provider: string,
    url: string,
    data: { [key: string]: string; },
    added_at: Date,
    updated_at: Date
}
```

<a name="DataModel+CrawlContinuationMode"></a>
#### CrawlContinuationMode

Enum which defines how the crawler will run; either starting from scratch or continuing with the last execution.

Values:
- START_FROM_SCRATCH
- CONTINUE
```ts
enum CrawlContinuationMode {
    START_FROM_SCRATCH = 'START_FROM_SCRATCH',
    CONTINUE = 'CONTINUE'
}
```

<a name="CrawlerConfiguration"></a>
## Crawler configuration
### Full typescript configuration definition

This is a definition of all the possible configuration supported currently by the crawler.
```ts
{
    name: 'ParariusCrawler',
    mode: 'START_FROM_SCRATCH',
    entryUrls: ['http://www.pararius.com'],
    client: {
        retries: 5,
        userAgent: 'Firefox',
        delayBetweenRetries: 2,
        delayBetweenRequests: 2,
        timeoutSeconds: 100,
        onRequestPrepared: (htmlRequest: HttpRequest) => {
            htmlRequest.headers.Authorization = 'JWT MyAuth';
            return htmlRequest;
        }
    },
    discovery: {
        allowedDomains: ['www.pararius.com'],
        allowedPath: ['amsterdam/'],
        removeQueryParams: true,
        onLinksDiscovered: undefined
    },
    onItemCrawled: (response: HtmlResponse) => {
        if (!response.url.includes('-for-rent')) {
            return undefined;
        }

        const $ = response.$;
        return {
            'title': $('.listing-detail-summary__title , #onetrust-accept-btn-handler').text(),
        }
    }
    dataPath: './output-json',
    dataBatchSize: 10,
    sqlitePath: './cache.sqlite'
}
```

<a name="CrawlerConfiguration+name"></a>
#### name :  <code>string</code>

Name of the crawler. 

The name of the crawler is important in the following scenarios:
- When resuming a crawler. The library will find the last status based in crawler name. If you change the name, the status will be reset.
- When having multiple crawlers. The library stores the status in a SQLite database indexed by the crawler name.


**Default**: `nodescrapy`
<br></br>

<a name="CrawlerConfiguration+mode"></a>
#### mode :  <code>string</code>

Mode of the crawler.
To see options, check [CrawlConfigurationMode](#DataModel+CrawlContinuationMode)

**Default**: `START_BY_SCRATCH`
<br></br>

<a name="CrawlerConfiguration+entryUrls"></a>
#### entryUrls :  <code>string[]</code>

List of urls which will start to crawl.
###### Example:
```ts
{
    entryUrls: ['https://www.pararius.com/apartments/amsterdam']
}
```
<br></br>

<a name="CrawlerConfiguration+onItemCrawled"></a>
#### onItemCrawled :  <font size="1"> <code >function (response: HtmlResponse) => { [key: string]: any; } | undefined;</code></font></code>
Function to extract the data when an url has been crawled.

If returns undefined, the url will be discarded and nothing will be stored for it.

The argument of this function is provided by the crawler, and it is a [HtmlResponse](#DataModel+HtmlResponse)
<br></br>
###### Example
```ts
 {
    onItemCrawled: (response: HtmlResponse) => {
        if (!response.url.includes('-for-rent')) {
            return undefined; // Only extract information fron the urls which contains for-rent
        }

        const $ = response.$;
        return {
            'title': $('.listing-detail-summary__title , #onetrust-accept-btn-handler').text(), // Extract the title of the page.
        }
    }
}
```
<br></br>

<a name="CrawlerConfiguration+dataPath"></a>
#### dataPath :  <code>string</code>

Configures where the output of the crawler ([DataEntries](#DataModel+DataEntry)) will be stored. 
###### Example

```ts
{
    dataPath: './output-data'
}
```

This will produce the following files: 

`./output-data/data-2022-07-11T08:17:38.188Z.json`

`./output-data/data-2022-07-11T08:17:41.188Z.json`

...
<br></br>

<a name="CrawlerConfiguration+dataBatchSize"></a>
#### dataBatchSize :  <code>number</code>
This property configures how many crawled items will be persisted in an unique file.

For example, if the number is 5, every JSON file will contain 5 crawled items. **Default**: 50
<br></br>

<a name="CrawlerConfiguration+sqlitePath"></a>
#### sqlitePath :  <code>string</code>

Configures where to store the sqlite database (full path, including name) 

**Default**: `node-modules/nodescrapy/cache.sqlite`
<br></br>


<a name="CrawlerClientConfig"></a>
### Client configuration

<a name="CrawlerClientConfig+retries"></a>
#### client.retries :  <code>number</code>

Configures the number of retries to perform when a request is failed.
**Default**: `2`
<br></br>

<a name="CrawlerClientConfig+userAgent"></a>
#### client.userAgent :  <code>string</code>

Configures the user agents of the client.

**Default**: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36`
<br></br>

<a name="CrawlerClientConfig+delayBetweenRetries"></a>
#### client.delayBetweenRetries :  <code>number</code>

Configures how many seconds the client will wait between different requests.
**Default**: `5`
<br></br>

<a name="CrawlerClientConfig+timeoutSeconds"></a>
#### client.timeoutSeconds :  <code>number</code>

Configures the timeout of the client, in seconds. **Default**: `10`
<br></br>

<a name="CrawlerClientConfig+onRequestPrepared"></a>
#### client.onRequestPrepared :  <code>(htmlRequest: HttpRequest) => HttpRequest</code>

Function which allows to modify the url or the headers before performing the request.
Useful to add authentication headers or change the URL for a proxy one.

**Default**: `undefined`

###### Example
```ts
    {
        client.onRequestPrepared: (request: HttpRequest): HttpRequest => {
            const proxyUrl = `http://www.myproxy.com?url=${request.url}`;
    
            const requestHeaders = request.headers;
            requestHeaders.Authorization = 'JWT ...';
    
            return {
                url: proxyUrl,
                headers: requestHeaders,
            };
        }
    }
```
<br></br>

### Discovery configuration

<a name="CrawlerDiscoveryConfig+allowedDomains"></a>
#### discovery.allowedDomains :  <code>string[]</code>

Whitelist of domains to crawl. **Default**: Same domains that [entryUrls](#CrawlerConfiguration+entryUrls)
<br></br>

<a name="CrawlerDiscoveryConfig+allowedPath"></a>
#### discovery.allowedPath :  <code>string[]</code>

How to use this configuration:
- If url contains any of the strings of allowedPath, url will be crawled.
- If url matches the regex of any of the allowedPath, url will be crawled.

**Default**: `['.*']`

###### Example
```ts
{
    discovery.allowedPath: ["/amsterdam", "houses-to-rent", "house-[A-Z]+"]
}

```
<br></br>

<a name="CrawlerDiscoveryConfig+removeQueryParams"></a>
#### discovery.removeQueryParams :  <code>boolean</code>
If true, it will trim the query parameters from the urls to discover. **Default**: `false`
<br></br>

<a name="CrawlerDiscoveryConfig+removeQueryParams"></a>
#### discovery.onLinksDiscovered :  <code>(response: HtmlResponse, links: string[]) => string[]</code>

Function that can be used to remove / add links to crawl. **Default**: `undefined`

###### Example
```ts
{
    discovery.onLinksDiscovered: (htmlResponse: HtmlResponse, links: string[]) => {
        links.push('https://mycustomurl.com');
        // We can use htmlResponse.$ to find links by css selectors.
        return links;
    }
}
```
<br></br>

## Roadmap
Features to be implemented:

- Store status and data in MongoDB.
- Allow concurrent requests.
- Create more examples.
- Add mode to retry errors.
- Increase unit tests coverage.

## Contributors
**Main contributor**: [Juan Roldan](https://juanbroldan.com)

The Nodescrapy project welcomes all constructive contributions. 
Contributions take many forms, from code for bug fixes and enhancements, to additions and fixes to documentation, additional tests, triaging incoming pull requests and issues, and more!

## License

[MIT](./LICENSE)