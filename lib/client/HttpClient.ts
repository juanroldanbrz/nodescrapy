import HttpRequest from '../model/HttpRequest';
import { HtmlResponseWrapper } from '../model/HtmlResponse';

interface HttpClient {
  initialize(): Promise<void>;

  get(urls: string[]): Promise<HtmlResponseWrapper[]>;

  beforeRequest(httpRequest: HttpRequest): HttpRequest;

  onGetRequest(requestUrl: string, requestPoolId: number): Promise<HtmlResponseWrapper>;

  destroy(): Promise<void>;
}

export default HttpClient;
