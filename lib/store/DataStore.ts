import * as fs from 'fs';
import * as path from 'path';
import DataEntry from '../model/DataEntry';
import logger from '../log/Logger';

interface DataStore {
    beforeCrawl();

    addData(dataEntry: DataEntry);

    afterCrawl();
}

class FileDataStore implements DataStore {
  private tmpData: Array<DataEntry> = [];

  readonly dataPath: string;

  readonly dataBatchSize: number;

  constructor(dataPath: string, dataBatchSize: number) {
    this.dataPath = dataPath;
    this.dataBatchSize = dataBatchSize;
  }

  beforeCrawl() {
    this.tmpData = [];
  }

  addData(dataEntry: DataEntry) {
    logger.info(`Adding crawled entry to data: ${dataEntry.url}`);
    this.tmpData.push(dataEntry);
    if (this.tmpData.length >= this.dataBatchSize) {
      this.dumpDataToFile();
    }
  }

  afterCrawl() {
    if (this.tmpData.length !== 0) {
      this.dumpDataToFile();
    }
  }

  private dumpDataToFile(): void {
    const filePath = path.join(this.dataPath, `data-${new Date().toISOString()}.json`);
    logger.info(`Saving ${this.tmpData.length} entries into JSON file: ${filePath}`);
    const jsonStr = JSON.stringify(this.tmpData);
    fs.writeFileSync(filePath, jsonStr);
    this.tmpData = [];
  }
}

export {
  DataStore,
  FileDataStore,
};
