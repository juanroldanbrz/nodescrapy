class PuppeteerClusterStatus {
  config;

  requestUrl;

  waitedTime = 0;

  visitedPage;

  scrolled = false;

  idle = false;

  closed = false;

  userAgent;

  reset = () => {
    this.config = undefined;
    this.closed = false;
    this.idle = false;
    this.requestUrl = undefined;
    this.visitedPage = undefined;
    this.scrolled = false;
    this.waitedTime = 0;
    this.userAgent = undefined;
  };
}

const puppeteerClusterStatus = new PuppeteerClusterStatus();

module.exports = puppeteerClusterStatus;
