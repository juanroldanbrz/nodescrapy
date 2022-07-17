import * as url from 'url';
import { HtmlResponse } from '../model/HtmlResponse';
import { LinkDiscoveryConfig } from '../model/CrawlerConfig';

class LinkDiscovery {
  readonly allowedDomains: Set<string>;

  readonly allowedPath: Set<string>;

  readonly removeQueryParams: boolean;

  readonly onLinksDiscovered: (response: HtmlResponse, links: string[]) => string[] | undefined;

  constructor(config: LinkDiscoveryConfig) {
    this.allowedDomains = new Set<string>(config.allowedDomains);
    this.allowedPath = new Set<string>(config.allowedPath);
    this.removeQueryParams = config.removeQueryParams;
    this.onLinksDiscovered = config.onLinksDiscovered;
  }

  extractLinks(htmlResponse: HtmlResponse): Set<string> {
    const sourceUrl = url.parse(htmlResponse.url);
    const baseUrl = `${sourceUrl.protocol}//${sourceUrl.hostname}`;
    const { $ } = htmlResponse;
    const linkObjects = $('a');
    const alLinks = new Set<string>();
    linkObjects.each((index, element) => {
      let tmpUri = $(element).attr('href');

      if (tmpUri !== undefined) {
        if (tmpUri && tmpUri.startsWith('/')) {
          tmpUri = baseUrl + tmpUri;
        }
        const tmpUrl = url.parse(tmpUri);

        if (this.allowedDomains.has(tmpUrl.hostname)) {
          if (this.removeQueryParams) {
            tmpUri = tmpUri.replace(`?${tmpUrl.query}`, '');
          }
          tmpUri = tmpUri.replace(/\/$/, '');
          alLinks.add(tmpUri);
        }
      }
    });
    const toReturn = this.filterRegex(alLinks);
    if (this.onLinksDiscovered === undefined) {
      return toReturn;
    }
    return new Set<string>(this.onLinksDiscovered(htmlResponse, Array.from(toReturn)));
  }

  private filterRegex(links: Set<string>): Set<string> {
    const toReturn = Array.from(links).filter((aUrl) => Array.from(this.allowedPath).some(
      (regex) => aUrl.match(regex) || aUrl.includes(regex),
    ));
    return new Set<string>(toReturn);
  }
}

export default LinkDiscovery;
