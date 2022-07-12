import {
  DataTypes, Model, ModelStatic, Sequelize, where,
} from 'sequelize';
import { Link, LinkStatus } from '../model/Link';

interface LinkStore {
    countByProviderAndStatus(provider: string, status: LinkStatus): Promise<number>;

    deleteAll(provider: string): Promise<number>;

    addIfNew(link: Link): Promise<Link>;

    changeStatus(id: number, status: LinkStatus);

    findByProviderAndStatus(provider: string, status: LinkStatus, n: number): Promise<Array<Link>>;
}

class DbLinkStore implements LinkStore {
  readonly linksTable: ModelStatic<Model>;

  constructor(sequelize: Sequelize) {
    this.linksTable = sequelize.define('Links', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      provider: DataTypes.STRING,
      url: DataTypes.STRING,
      status: DataTypes.STRING,
    }, {
      underscored: true,
      tableName: 'LINKS',
    });
  }

  async sync(): Promise<Model> {
    return this.linksTable.sync();
  }

  async addIfNew(link: Link): Promise<Link> {
    const exist = await this.existsByProviderAndUrl(link.provider, link.url);
    if (exist) {
      return null;
    }
    const model = await this.linksTable.create(
      {
        provider: link.provider,
        url: link.url,
        status: link.status.toString(),
      },
    );
    return DbLinkStore.mapResultToLink(model);
  }

  async changeStatus(id: number, status: LinkStatus): Promise<void> {
    await this.linksTable.update(
      {
        status: status.toString(),
      },
      {
        where: { id },
      },
    );
  }

  async existsByProviderAndUrl(provider: string, url: string): Promise<boolean> {
    const result = await this.linksTable.findOne({
      where: {
        provider,
        url,
      },
    });
    return result !== null && result !== undefined;
  }

  async findByProviderAndStatus(provider: string, status: LinkStatus, n: number): Promise<Array<Link>> {
    const results = await this.linksTable.findAll({
      where: {
        provider,
        status,
      },
      limit: n,
      raw: true,
    });

    return results.map((object) => DbLinkStore.mapResultToLink(object));
  }

  private static mapResultToLink(object: any): Link {
    return <Link>{
      id: object.id,
      provider: object.provider,
      url: object.url,
      status: object.status,
      added_at: object.addedAt,
      updated_at: object.updatedAt,
    };
  }

  deleteAll(provider: string): Promise<number> {
    return this.linksTable.destroy({
      where: { provider },
      truncate: true,
    });
  }

  countByProviderAndStatus(provider: string, status: LinkStatus): Promise<number> {
    return this.linksTable.count({
      where: {
        provider,
        status,
      },
    });
  }
}

export {
  LinkStore,
  DbLinkStore,
};
