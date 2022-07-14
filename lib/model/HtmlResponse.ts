import { AxiosResponse } from 'axios';
import { CheerioAPI } from 'cheerio';
import puppeteer from 'puppeteer';

interface HtmlResponse {
  url: string;
  originalResponse: AxiosResponse | puppeteer.HTTPResponse;
  $: CheerioAPI;
}

interface HtmlResponseWrapper {
  url: string,
  response: HtmlResponse,
  isSuccess: boolean
}

export {
  HtmlResponseWrapper,
  HtmlResponse,
};
