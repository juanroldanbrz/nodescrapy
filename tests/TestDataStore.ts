import appRoot from 'app-root-path';
import { FileDataStore, DataEntry } from '../index';

const outputJsonPath = `${appRoot}/tests/tmp/`;

describe('FileDataStore', () => {
  it('Should save data into a json file', async () => {
    const fileDataStore = new FileDataStore(outputJsonPath, 5);
    fileDataStore.beforeCrawl();

    const dataEntry1 = <DataEntry>{
      provider: 'REDDIT',
      url: 'http://www.myrul.com',
      data: { address: '1234 road' },
      added_at: new Date(),
      updated_at: new Date(),
    };

    const dataEntry2 = <DataEntry>{
      provider: 'REDDIT',
      url: 'http://www.otherurl.com',
      data: {
        name: 'Juan',
        surname: 'Anonymous',
      },
      added_at: new Date(),
      updated_at: new Date(),
    };

    fileDataStore.addData(dataEntry1);
    fileDataStore.addData(dataEntry2);
    fileDataStore.afterCrawl();
  });
});
