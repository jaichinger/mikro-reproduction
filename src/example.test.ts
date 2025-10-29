/* eslint-disable */
import { Entity, ManyToOne, MikroORM, PrimaryKey, Property, ref, Ref, wrap } from "@mikro-orm/postgresql";

@Entity()
class Organisation {
  @PrimaryKey({ fieldName: 'org_id' })
  id!: number;
}

@Entity({ abstract: true })
abstract class OrgEntity {
  @ManyToOne({
    entity: () => Organisation,
    fieldName: 'org_id',
    primary: true,
    ref: true
  })
  org: Ref<Organisation> = ref(Organisation, 1);

  @PrimaryKey()
  id!: number;
}

@Entity()
class User extends OrgEntity {
  @Property()
  name!: string;
}

@Entity()
class Book extends OrgEntity {
  @Property()
  name!: string;

  @ManyToOne({
    entity: () => User,
    fieldNames: ['org_id', 'user_id'],
    ownColumns: ['user_id'],
    ref: true,
  })
  user!: Ref<User>;
}

let ormAdmin: MikroORM;
let ormApp: MikroORM;

beforeAll(async () => {
  ormAdmin = await MikroORM.init({
    entities: [Organisation, User, Book],
    debug: ["query", "query-params"],
    dbName: 'test',
    host: 'postgre',
    allowGlobalContext: true,
  });

  await ormAdmin.schema.refreshDatabase();

  const org = ormAdmin.em.create(Organisation, { id: 1 });
  const user = ormAdmin.em.create(User, { org: org, id: 11, name: 'User 1' });
  const book = ormAdmin.em.create(Book, { org: org, id: 21, name: 'Book 1', user: user });

  await ormAdmin.em.flush();

  ormApp = await MikroORM.init({
    entities: [Organisation, User, Book],
    debug: ["query", "query-params"],
    dbName: 'test',
    host: 'postgre',
    allowGlobalContext: true,
  });
});

afterAll(async () => {
  await ormAdmin.close();
  await ormApp.close();
});

test('app test case', async () => {
  const orm = ormApp;
  const bookQ1 = await orm.em.findOneOrFail(Book, { id: 21 }, { populate: ['user'] });
  const wrapped1 = wrap(bookQ1);
  console.dir((wrapped1 as any).__originalEntityData);
  // { org: 1, id: 21, name: 'Book 1', user: [ 1, 11 ] }


  const bookQ2 = await orm.em.findOneOrFail(Book, { id: 21 }, { populate: ['user'] });
  const wrapped2 = wrap(bookQ2);
  console.dir((wrapped2 as any).__originalEntityData);
  // { org: 1, id: 21, name: 'Book 1', user: { org: 1, id: 11 } }

  // Note: the original entity data for the user relation is different after the second query.
  // The entity comparator then thinks the user relation has changed from [1, 11] to {org: 1, id: 11}.

  orm.em.getUnitOfWork().computeChangeSets();
  const changes = orm.em.getUnitOfWork().getChangeSets();

  expect(changes).toHaveLength(0);
});

test('admin test case', async () => {
  const bookQ1 = await ormAdmin.em.findOneOrFail(Book, { id: 21 }, { populate: ['user'] });
  const bookQ2 = await ormAdmin.em.findOneOrFail(Book, { id: 21 }, { populate: ['user'] });

  ormAdmin.em.getUnitOfWork().computeChangeSets();
  const changes = ormAdmin.em.getUnitOfWork().getChangeSets();

  expect(changes).toHaveLength(0);
});