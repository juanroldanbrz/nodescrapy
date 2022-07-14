import HttpRequest from '../model/HttpRequest';
import { HtmlResponseWrapper } from '../model/HtmlResponse';

interface HttpClient {
  get(urls: string[]): Promise<HtmlResponseWrapper[]>;

  beforeRequest(htmlRequest: HttpRequest): HttpRequest;

  onGetRequest(requestUrl: string, requestPoolId: number): Promise<HtmlResponseWrapper>;
}

export default HttpClient;
