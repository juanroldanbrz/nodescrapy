import { AxiosResponse } from 'axios';
import { CheerioAPI } from 'cheerio';

interface HtmlResponse {
  url: string;
  axiosResponse: AxiosResponse;
  $: CheerioAPI;
}

export default HtmlResponse;
