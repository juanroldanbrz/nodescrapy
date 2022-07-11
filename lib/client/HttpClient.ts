import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import PromiseThrottle from 'promise-throttle';
import axiosRetry from 'axios-retry';
import HtmlResponse from '../model/HtmlResponse';
import { HttpClientConfig } from '../model/CrawlerConfig';
import logger from '../log/Logger';
import HttpRequest from '../model/HttpRequest';

interface HttpClient {
    get(requestUrl: string): Promise<HtmlResponse>;

    onRequestPrepared(httpRequest: HttpRequest): HttpRequest;
}

const defaultUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
    + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36';

class DefaultHttpClient implements HttpClient {
  readonly client: AxiosInstance;

  readonly userAgent: string;

  readonly onRequestPreparedImpl?: (httpRequest: any) => any;

  constructor(config: HttpClientConfig) {
    this.onRequestPreparedImpl = config?.onRequestPrepared;
    const nRetries = config?.retries ?? 2;
    this.userAgent = config?.userAgent ?? defaultUserAgent;
    const delayBetweenRequests = config?.delayBetweenRequests ?? 2;
    const delayBetweenRetries = (config?.delayBetweenRetries ?? 5) * 1000;
    const timeoutMs = (config?.timeoutSeconds ?? 10) * 1000;
    this.client = axios.create({
      timeout: timeoutMs,
    });
    axiosRetry(this.client, {
      retries: nRetries,
      retryDelay: () => delayBetweenRetries,
      retryCondition: (error) => {
        const statusCode = error?.response?.status?.toString();
        return statusCode === undefined || !statusCode.startsWith('2');
      },
    });
    this.throttleClient(delayBetweenRequests);
  }

  private throttleClient = (delayBetweenRequests: number) => {
    const promiseThrottle = new PromiseThrottle({
      requestsPerSecond: 1 / delayBetweenRequests,
    });

    const wrap = async (config: AxiosRequestConfig) => config;

    this.client.interceptors.request.use(
      (config: AxiosRequestConfig) => promiseThrottle.add(wrap.bind(this, config)),
    );
  };

  async get(requestUrl: string): Promise<HtmlResponse> {
    let httpRequest: HttpRequest = { url: requestUrl, headers: { 'User-Agent': this.userAgent } };
    if (this.onRequestPreparedImpl !== undefined) {
      httpRequest = this.onRequestPreparedImpl(httpRequest);
    }
    logger.info(`Crawling ${httpRequest.url}`);
    const axiosResponse = await this.client.get(httpRequest.url, {
      headers: httpRequest.headers,
      'axios-retry': {
        onRetry: (retryCount, error) => { logger.warn(`Retry ${retryCount} - ${httpRequest.url}. ${error}`); },
      },
    });
    const cheerioResponse = cheerio.load(axiosResponse.data);
    return { url: httpRequest.url, axiosResponse, $: cheerioResponse };
  }

  onRequestPrepared(httpRequest: HttpRequest): HttpRequest {
    if (this.onRequestPreparedImpl === undefined) {
      return httpRequest;
    }
    return this.onRequestPreparedImpl(httpRequest);
  }
}

export {
  HttpClient,
  DefaultHttpClient,
};
