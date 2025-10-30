/* eslint-disable */
import { Entity, ManyToOne, MikroORM, PrimaryKey, Property, ref, Ref, wrap } from "@mikro-orm/sqlite";

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

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    contextName: 'admin',
    entities: [Organisation, User, Book],
    debug: ["query", "query-params"],
    dbName: ':memory:',
    // host: 'postgre',
    allowGlobalContext: true,
  });

  await orm.schema.refreshDatabase();

  const org = orm.em.create(Organisation, { id: 1 });
  const user = orm.em.create(User, { org: org, id: 11, name: 'User 1' });
  const book = orm.em.create(Book, { org: org, id: 21, name: 'Book 1', user: user });

  await orm.em.flush();
});

beforeEach(() => { orm.em.clear() });

afterAll(async () => {
  await orm.close();
});

test('admin test case', async () => {
  const bookQ1 = await orm.em.findOneOrFail(Book, { id: 21 }, { populate: ['user'] });
  console.dir((wrap(bookQ1) as any).__originalEntityData);
  // { org: 1, id: 21, name: 'Book 1', user: [ 1, 11 ] }


  const bookQ2 = await orm.em.findOneOrFail(Book, { id: 21 }, { populate: ['user'] });
  console.dir((wrap(bookQ2) as any).__originalEntityData);
  // { org: 1, id: 21, name: 'Book 1', user: { org: 1, id: 11 } }

  // Note: the original entity data for the user relation is different after the second query.
  // The entity comparator then thinks the user relation has changed from [1, 11] to {org: 1, id: 11}.

  orm.em.getUnitOfWork().computeChangeSets();
  const changes = orm.em.getUnitOfWork().getChangeSets();

  expect(changes).toHaveLength(0);
});