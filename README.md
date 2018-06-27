# SQL Wrap

Makes working with sql easy

`npm install sql-wrap`

## Instantiation

```javascript
const sqlWrap = require('sql-wrap');
const sql = sqlWrap({
  driver: sqlWrap.mysqlDriverAdapter(
    require('mysql').createPool({
      host: '127.0.0.1',
      user: 'root',
      password: 'password',
      database: 'test',
    })
  ),
});
```

## API

```
export type SqlWrap = {|
  build: SqlWrapQueryBuilder,
  connection: () => Promise<SqlWrap>,
  delete: (
    table: string,
    where?: Object | Array<Object>
  ) => Promise<{ changedRows?: number }>,
  encodeCursor: (
    orderByRaw: string | OrderByConfig | Array<string | OrderByConfig>,
    row: Object
  ) => string,
  escape: string => string,
  escapeId: string => string,
  insert: (
    table: string,
    rowOrRows: Row | Array<Row>
  ) => Promise<{ insertId?: number }>,
  one: (
    textOrConfig: string | QueryConfig,
    maybeValues?: Array<Value>
  ) => Promise<WriteOutput | Row | null>,
  query: (
    textOrConfig: string | QueryConfig,
    maybeValues?: Array<Value>
  ): Promise<
    | WriteOutput
    | Array<Row>
    | {| results: Array<Row>, resultCount: number |}
    | {|
        results: Array<Row>,
        resultCount: number,
        pageCount: number,
        currentPage: number,
      |},
  queryStream: (
    textOrConfig: string | QueryConfig,
    maybeValues?: Array<Value>
  ) => Readable,
  release: () => void,
  replace: (
    table: string,
    rowOrRows: Row | Array<Row>
  ) => Promise<void>,
  save: (
    table: string,
    rowOrRows: Array<Object> | Object
  ) => Promise<{ changedRows?: number }>,
  select: (
    tableOrConfig: string | SelectConfig,
    maybeWhere?: Where | Array<Where>
  ) => Promise<Array<Row>>,
  selectOne: (
    tableOrConfig: string | SelectConfig,
    maybeWhere?: Where | Array<Where>
  ) => Promise<Row | null>,
  selectStream: (
    tableOrConfig: string | SelectConfig,
    maybeWhere?: Where | Array<Where>
  ) => Readable,
  stream: (
    textOrConfig: string | QueryConfig,
    maybeValues?: Array<Value>
  ): Readable,
  streamTable: (
    tableOrConfig: string | SelectConfig,
    maybeWhere?: Where | Array<Where>
  ): Readable,
  templatedValue: (template: string, ...args: Array<Value>) => TemplatedValue,
  update: (
    table: string,
    updateOrUpdates: Object | Array<UpdateObject>,
    where?: UpdateWhere
  ) => Promise<{ changedRows?: number }>,
|};
```
