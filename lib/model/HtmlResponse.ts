import { AxiosResponse } from 'axios';
import { CheerioAPI } from 'cheerio';

interface HtmlResponse {
  url: string;
  axiosResponse: AxiosResponse;
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
