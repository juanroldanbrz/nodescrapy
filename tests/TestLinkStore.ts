import { v4 as uuid4 } from 'uuid';
import { Sequelize } from 'sequelize';
import appRoot from 'app-root-path';
import * as sqlite3 from 'sqlite3';
import { DbLinkStore, LinkStatus } from '../index';

const dbPath = `${appRoot}/tests/tmp/cache.sqlite`;

describe('DbLinkStore', () => {
  const sequelize = new Sequelize(`sqlite:////${dbPath}`, { logging: false });

  it('Should persist a new link', async () => {
    const dbLinkStore = new DbLinkStore(sequelize);
    await dbLinkStore.sync();
    const link = await dbLinkStore.addIfNew({
      provider: 'REDDIT',
      url: `http://test${uuid4()}`,
      status: LinkStatus.UNPROCESSED,
    });
    expect(link.id).toBeGreaterThan(0);
  });

  it('Should find new links', async () => {
    const dbLinkStore = new DbLinkStore(sequelize);
    await dbLinkStore.addIfNew({
      provider: 'REDDIT',
      url: `http://test${uuid4()}`,
      status: LinkStatus.UNPROCESSED,
    });

    const links = await dbLinkStore.findByProviderAndStatus('REDDIT', LinkStatus.UNPROCESSED, 5);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.status).toBe(LinkStatus.UNPROCESSED);
    }
  });

  it('Should change the link status', async () => {
    const dbLinkStore = new DbLinkStore(sequelize);
    await dbLinkStore.addIfNew({
      provider: 'REDDIT',
      url: `http://test${uuid4()}`,
      status: LinkStatus.UNPROCESSED,
    });

    const links = await dbLinkStore
      .findByProviderAndStatus('REDDIT', LinkStatus.UNPROCESSED, 100);

    for (const link of links) {
      await dbLinkStore.changeStatus(link.id, LinkStatus.PROCESSED);
    }

    const unprocessedLinks = await dbLinkStore.findByProviderAndStatus('REDDIT', LinkStatus.UNPROCESSED, 100);
    expect(unprocessedLinks.length).toBe(0);
  });
});
