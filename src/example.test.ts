/* eslint-disable */
import { Check, Entity, ManyToOne, MikroORM, PrimaryKey, Property, Ref } from "@mikro-orm/postgresql";

@Entity({ tableName: 'field' })
@Check({
  name: 'field_check_1',
  expression: "parent_id IS NOT NULL OR properties->>'type' = 'text'"
})
@Check({
  name: 'field_check_2',
  expression: `parent_id IS NULL OR properties->>'type' != 'text'`
})
class Field {
  @PrimaryKey()
  id!: number;

  @Property({ type: 'jsonb' })
  properties!: { type: string };

  @ManyToOne({
    entity: () => Field,
    nullable: true,
    ref: true
  })
  parent?: Ref<Field>;
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    entities: [Field],
    debug: [],
    dbName: 'james',
    host: 'localhost',
    user: 'postgres',
    password: 'example',
    port: 7432,
    allowGlobalContext: true,
  });
  await orm.schema.refreshDatabase({ dropDb: true });
  await orm.em.flush();
  await orm.close();
});

afterAll(async () => {
  await orm.close();
});

test('admin test case', async () => {
  // simulate the app restarting and re-initializing the ORM
  orm = await MikroORM.init({
    entities: [Field],
    debug: [],
    dbName: 'james',
    host: 'localhost',
    user: 'postgres',
    password: 'example',
    port: 7432,
    allowGlobalContext: true,
  });

  const diff = await orm.schema.getUpdateSchemaSQL();
  // there should be no schema changes
  expect(diff).toHaveLength(0);
  console.log(diff)
});