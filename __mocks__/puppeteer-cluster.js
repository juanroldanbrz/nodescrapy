const mockCluster = jest.createMockFromModule('puppeteer-cluster');
const { TaskFunction } = require('puppeteer-cluster/dist/Cluster');
const { config } = require('winston');
const mockStatus = require('./puppeteer-cluster-status');

const HTML = `
<!DOCTYPE html>
<html>
<body>

<h1>My First Heading</h1>

<p>My first paragraph.</p>

</body>
</html>
`;

class MockCluster {
  static launch = async (args) => {
    mockStatus.config = args;
    return new MockCluster();
  };

  on = (eventName, listener) => this;

  close = async () => {
    mockStatus.closed = true; return undefined; };

  idle = async () => { mockStatus.idle = true; return undefined; };

  execute = (requestUrl, taskFunction) => {
    mockStatus.requestUrl = requestUrl;
    const page = {
      goto: async (url, data) => {
        mockStatus.visitedPage = url;
      },
      waitForTimeout: async (delay) => {
        mockStatus.waitedTime += delay;
      },
      evaluate: async () => {
        mockStatus.scrolled = true;
      },
      content: async () => HTML,
    };
    return taskFunction({ page, data: requestUrl });
  };
}

mockCluster.Cluster = MockCluster;

module.exports = mockCluster;
