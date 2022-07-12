import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import PromiseThrottle from 'promise-throttle';
import axiosRetry from 'axios-retry';
import { HttpClientConfig } from '../model/CrawlerConfig';
import logger from '../log/Logger';
import HttpRequest from '../model/HttpRequest';
import { HtmlResponse, HtmlResponseWrapper } from '../model/HtmlResponse';

const configureAxios = (
  delayBetweenRequests: number,
  nRetries: number,
  retryDelay: number,
  client: AxiosInstance,
) => {
  axiosRetry(client, {
    retries: nRetries,
    retryDelay: () => retryDelay,
    retryCondition: (error) => {
      const statusCode = error?.response?.status?.toString();
      return statusCode === undefined || !statusCode.startsWith('2');
    },
  });

  const promiseThrottle = new PromiseThrottle({
    requestsPerSecond: 1 / delayBetweenRequests,
  });

  const wrap = async (config: AxiosRequestConfig) => config;

  client.interceptors.request.use(
    (config: AxiosRequestConfig) => promiseThrottle.add(wrap.bind(this, config)),
  );
};

class HttpClient {
  readonly userAgent: string;

  readonly originalConfig: HttpClientConfig;

  readonly clients: AxiosInstance[];

  readonly beforeRequestImpl?: (httpRequest: any) => any;

  constructor(config: HttpClientConfig) {
    this.originalConfig = config;
    this.clients = [];
    for (let i = 0; i < config.concurrentRequests; i += 1) {
      const client = axios.create({
        timeout: config.timeoutSeconds * 1000,
      });
      configureAxios(config.delayBetweenRequests, config.retries, config.retryDelay, client);
      this.clients.push(client);
    }
    this.beforeRequestImpl = config.beforeRequest;
  }

  async get(urls: string[]): Promise<HtmlResponseWrapper[]> {
    const promises: Promise<HtmlResponseWrapper>[] = [];
    for (let i = 0; i < urls.length; i += 1) {
      const instanceIdx = i % (this.clients.length);
      promises.push(this.getUrl(urls[i], instanceIdx));
    }

    return Promise.all(promises);
  }

  async getUrl(requestUrl: string, instanceIdx: number): Promise<HtmlResponseWrapper> {
    let httpRequest: HttpRequest = { url: requestUrl, headers: { 'User-Agent': this.userAgent } };
    if (this.beforeRequestImpl !== undefined) {
      httpRequest = this.beforeRequestImpl(httpRequest);
    }
    logger.info(`Crawling ${httpRequest.url}`);
    try {
      const axiosResponse = await this.clients[instanceIdx].get(httpRequest.url, {
        headers: httpRequest.headers,
        'axios-retry': {
          onRetry: (retryCount, error) => { logger.warn(`Retry ${retryCount} - ${httpRequest.url}. ${error}`); },
        },
      });
      const cheerioResponse = cheerio.load(axiosResponse.data);
      const innerResponse: HtmlResponse = { url: httpRequest.url, axiosResponse, $: cheerioResponse };
      return { url: httpRequest.url, response: innerResponse, isSuccess: true };
    } catch (e) {
      logger.error(`Failed to crawl: ${httpRequest.url} - ${e}`);
      return { url: httpRequest.url, response: undefined, isSuccess: false };
    }
  }

  beforeRequest(httpRequest: HttpRequest): HttpRequest {
    if (this.beforeRequestImpl === undefined) {
      return httpRequest;
    }
    return this.beforeRequestImpl(httpRequest);
  }
}

export default HttpClient;
