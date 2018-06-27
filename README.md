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

- [build](#build)
  - [select](#select-builder)
    - [crossJoin](#select.crossJoin)
      / [field](#select.field)
      / [fields](#select.fields)
      / [from](#select.from)
      / [group](#select.group)
      / [having](#select.having)
      / [join](#select.join)
      / [leftJoin](#select.leftJoin)
      / [limit](#select.limit)
      / [offset](#select.offset)
      / [one](#select.one)
      / [order](#select.order)
      / [outerJoin](#select.outerJoin)
      / [rightJoin](#select.rightJoin)
      / [run](#select.run)
      / [runCursor](#select.runCursor)
      / [runPaginate](#select.runPaginate)
      / [runResultCount](#select.runResultCount)
      / [stream](#select.stream)
      / [toParam](#select.toParam)
      / [toString](#select.toString)
      / [where](#select.where)
      / [whereIfDefined](#select.whereIfDefined)
      / [whereIn](#select.whereIn)
  - [update](#update-builder)
  - [delete](#delete-builder)
  - [insert](#insert-builder)
  - [replace](#replace-builder)
- [connection](#connection)
- [delete](#delete)
- [encodeCursor](#encodeCursor)
- [escape](#escape)
- [escapeId](#escapeId)
- [insert](#insert)
- [one](#one)
- [query](#query)
- [queryStream](#queryStream)
- [release](#release)
- [replace](#replace)
- [save](#save)
- [select](#select)
- [selectOne](#selectOne)
- [selectStream](#selectStream)
- [stream](#stream)
- [streamTable](#streamTable)
- [templatedValue](#templatedValue)
- [update](#update)

### build

`void => QueryBuilder`
Returns a QueryBuilder (See QueryBuilder Spec Below)

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
