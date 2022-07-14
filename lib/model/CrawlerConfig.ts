import HttpRequest from './HttpRequest';
import { DataStore } from '../store/DataStore';
import { LinkStore } from '../store/LinkStore';
import { HtmlResponse } from './HtmlResponse';

interface HttpClientConfig {
    onGetRequest?: (htmlRequest: HttpRequest) => HttpRequest
    retries?: number,
    userAgent?: string,
    retryDelay?: number,
    delayBetweenRequests?: number,
    timeoutSeconds?: number,
    concurrentRequests? : number,
    beforeRequest?: (htmlRequest: HttpRequest) => HttpRequest;
}

interface LinkDiscoveryConfig {
    allowedDomains?: string[],
    allowedPath?: string[],
    removeQueryParams?: boolean,
    onLinksDiscovered?: (response: HtmlResponse, links: string[]) => string[];
}

enum CrawlContinuationMode {
    START_FROM_SCRATCH = 'START_FROM_SCRATCH',
    CONTINUE = 'CONTINUE'
}

interface CrawlerConfig {
    name?: string,
    mode?: CrawlContinuationMode,
    entryUrls: string[],
    client?: HttpClientConfig,
    discovery?: LinkDiscoveryConfig,
    onItemCrawled: (response: HtmlResponse) => { [key: string]: any; } | undefined;
    implementation?: {
        dataStore?: DataStore,
        linkStore?: LinkStore,
    }
    dataPath?: string,
    dataBatchSize?: number,
    sqlitePath?: string
}

export {
  LinkDiscoveryConfig,
  HttpClientConfig,
  CrawlerConfig,
  CrawlContinuationMode,
};
