# SQLWrap

Makes working with sql easy.

`npm install sql-wrap`

## Example Usage

```javascript
// Equivalent to "SELECT * FROM food WHERE foodType = fruit"
const fruit = await sql.select('food', { foodType: 'fruit' });

// Built in query builder for complex queries:
const busiestAirports = await sql
  .build()
  .select()
  .field('COUNT(f.id)', 'flightCount')
  .from('airport', 'a')
  .join('flight', 'f', 'f.destination = a.id OR f.departure = a.id')
  .group('a.id')
  .order('flightCount', 'DESC')
  .limit(5)
  .run();

// Convenience features like built in pagination and nestedTables
const {
  results,
  resultCount,
  pageCount,
  currentPage,
} = await sql
  .build()
  .select()
  .from('coffee')
  .runPaginate({
    page: 3,
    resultsPerPage: 50
  });

// You can still always use raw sql when the need arises...
const redCars = await sql.query({
  text: 'SELECT * FROM cars WHERE color = ?',
  values: ['red'],
})
```

## Strongly Typed

SQLWrap includes detailed type annotations using "flow". The api is designed
to provide unambiguously shaped data from return values for seamless integration
with type systems.

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

SQLWrap is designed to be agnostic of the underlying driver. SQLWrap comes with
an implementation of a MySQL driver out of the box (see the above example).
You may also implement your own driver adapter in order to use SQLWrap with
Postgres or other SQL Databases.

### Custom Driver Adapters

Your driver adapter need only implement the "SqlWrapConnectionPool" interface.
See the type definitions below:

```
import type { Readable } from 'stream';
export type Value = number | boolean | string | null | Date;
export type Row = Object;
export type Where = {};
export type SqlWrapType = 'mysql';

type SqlWrapQuery = ({
  text: string,
  nestTables?: boolean,
  values?: Array<Value>,
}) => Promise<
  Array<Row> | {| changedRows?: number |} | {| insertId?: number |}
>;

type SqlWrapStream = ({
  text: string,
  nestTables?: boolean,
  values?: Array<Value>,
}) => Readable;

export type SqlWrapConnection = {
  query: SqlWrapQuery,
  stream: SqlWrapStream,
  release: () => void,
};

export type SqlWrapConnectionPool = {
  query: SqlWrapQuery,
  stream: SqlWrapStream,
  getConnection: () => Promise<SqlWrapConnection>,
};
```

## API

- [build](#build)
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
- [query configuration options](#query-configuration-options)

### build

`void => QueryBuilder`

Returns a QueryBuilder (See QueryBuilder Spec Below)

```
type SqlWrapQueryBuilder = {|
  select: void => SelectBuilder,
  update: void => UpdateBuilder,
  delete: void => DeleteBuilder,
  insert: void => InsertBuilder,
  replace: void => ReplaceBuilder,
|};

type SelectBuilder = {|
  field: (
    name: string,
    alias?: string,
    options?: {| ignorePeriodsForFieldNameQuotes?: boolean |}
  ) => SelectBuilder,
  fields: (
    {} | Array<string>,
    options?: {| ignorePeriodsForFieldNameQuotes?: boolean |}
  ) => SelectBuilder,
  from: (table: string, alias?: string) => SelectBuilder,
  join: (
    table: string,
    aliasOrCondition?: string,
    condition?: string
  ) => SelectBuilder,
  leftJoin: (
    table: string,
    aliasOrCondition?: string,
    condition?: string
  ) => SelectBuilder,
  rightJoin: (
    table: string,
    aliasOrCondition?: string,
    condition?: string
  ) => SelectBuilder,
  outerJoin: (
    table: string,
    aliasOrCondition?: string,
    condition?: string
  ) => SelectBuilder,
  crossJoin: (
    table: string,
    aliasOrCondition?: string,
    condition?: string
  ) => SelectBuilder,
  where: (condition: string, ...args: Array<Value>) => SelectBuilder,
  whereIn: (where: Array<Where>) => SelectBuilder,
  whereIfDefined: (condition: string, value: Value | void) => SelectBuilder,
  order: (
    field: string,
    direction?: OrderByDirection,
    ...args: Array<Value>
  ) => SelectBuilder,
  group: (field: string) => SelectBuilder,
  having: (condition: string, ...args: Array<Value>) => SelectBuilder,
  limit: number => SelectBuilder,
  offset: number => SelectBuilder,
  toString: void => string,
  toParam: void => {| text: string, values: Array<Value> |},
  run: (?{| nestTables?: boolean |}) => Promise<Array<Row>>,
  one: (?{| nestTables?: boolean |}) => Promise<Row | null>,
  runResultCount: (
    ?{| nestTables?: boolean |}
  ) => Promise<{| results: Array<Row>, resultCount: number |}>,
  runPaginate: (
    ?{| nestTables?: boolean, page?: number, resultsPerPage?: number |}
  ) => Promise<{|
    results: Array<Row>,
    resultCount: number,
    pageCount: number,
    currentPage: number,
  |}>,
  runCursor: (
    ?{|
      first?: number,
      last?: number,
      before?: string,
      after?: string,
      orderBy: string | OrderByConfig | Array<string> | Array<OrderByConfig>,
    |}
  ) => Promise<{|
    resultCount: number,
    pageInfo: {|
      hasPreviousPage: boolean,
      hasNextPage: boolean,
      startCursor: string,
      endCursor: string,
    |},
    edges: Array<{| node: Row, cursor: string |}>,
  |}>,
  stream: (?{| nestTables?: boolean |}) => Readable,
|};

type UpdateBuilder = {|
  table: (name: string, alias?: string) => UpdateBuilder,
  set: (
    name: string,
    value: Value,
    options?: {|
      ignorePeriodsForFieldNameQuotes?: boolean,
      dontQuote?: boolean,
    |}
  ) => UpdateBuilder,
  setFields: (
    fields: {},
    options?: {| ignorePeriodsForFieldNameQuotes: boolean |}
  ) => UpdateBuilder,
  where: (statement: string, ...args?: Array<Value>) => UpdateBuilder,
  whereIn: (where: Array<Where>) => UpdateBuilder,
  whereIfDefined: (condition: string, value: Value | void) => UpdateBuilder,
  limit: number => UpdateBuilder,
  offeset: number => UpdateBuilder,
  toString: void => string,
  toParam: void => {| text: string, values: Array<Value> |},
  run: void => Promise<{ changedRows?: number }>,
|};

type DeleteBuilder = {|
  from: (table: string, alias?: string) => DeleteBuilder,
  where: (condition: string, ...args?: Array<Value>) => DeleteBuilder,
  whereIn: (where: Array<Where>) => DeleteBuilder,
  whereIfDefined: (condition: string, value: Value | void) => DeleteBuilder,
  limit: number => DeleteBuilder,
  offset: number => DeleteBuilder,
  toString: void => string,
  toParam: void => {| text: string, values: Array<Value> |},
  run: void => Promise<{ changedRows?: number }>,
|};

type InsertBuilder = {|
  into: (table: string) => InsertBuilder,
  set: (
    field: string,
    value: Value,
    options?: {|
      ignorePeriodsForFieldNameQuotes?: boolean,
      dontQuote?: boolean,
    |}
  ) => InsertBuilder,
  setFields: (
    fields: {},
    options?: {| ignorePeriodsForFieldNameQuotes?: boolean |}
  ) => InsertBuilder,
  setFieldsRows: (
    fields: Array<{}>,
    options?: {| ignorePeriodsForFieldNameQuotes?: boolean |}
  ) => InsertBuilder,
  fromQuery: (columns: Array<string>, query: SelectBuilder) => InsertBuilder,
  onDupUpdate: (
    name: string,
    value: Value,
    options?: {|
      ignorePeriodsForFieldNameQuotes?: boolean,
      dontQuote?: boolean,
    |}
  ) => InsertBuilder,
  toString: void => string,
  toParam: void => {| text: string, values: Array<Value> |},
  run: void => Promise<{ insertId?: number }>,
|};

type ReplaceBuilder = {|
  into: (table: string) => InsertBuilder,
  set: (
    field: string,
    value: Value,
    options?: {|
      ignorePeriodsForFieldNameQuotes?: boolean,
      dontQuote?: boolean,
    |}
  ) => InsertBuilder,
  setFields: (
    fields: {},
    options?: {| ignorePeriodsForFieldNameQuotes?: boolean |}
  ) => InsertBuilder,
  setFieldsRows: (
    fields: Array<{}>,
    options?: {| ignorePeriodsForFieldNameQuotes?: boolean |}
  ) => InsertBuilder,
  fromQuery: (columns: Array<string>, query: SelectBuilder) => InsertBuilder,
  toString: void => string,
  toParam: void => {| text: string, values: Array<Value> |},
  run: void => Promise<void>,
|};
```

### connection

`void => Promise<SqlWrap>`

Obtains a new connection to the database and returns a promise for a new
instance of SQLWrap (using the new connection)

```javascript
const sql2 = await sql.connection();
```

### delete

```
(
  table: string,
  where?: Object | Array<Object>
) => Promise<{ changedRows?: number }>
```

Delete rows from a table. A lightweight wrapper around the sql "DELETE" statement.

```javascript
// Equivalent to: "DELETE FROM fruit WHERE isRotten = true OR isRipe = true AND color = 'red'"
await sql.delete('fruit', [{ isRotten: true }, { isRipe: true, color: 'red' }])
```

### encodeCursor

```
(
  orderBy: Array<{
    field: string,
    serialize?: (mixed) => mixed,
    deserialize?: (mixed) => mixed,
  }>,
  row: Object
) => string
```

Create a cursor to be used with SQLWrap's cursor based pagination feature.

```javascript
const cursor = sql.encodeCursor([{ field: 'id' }], {
  id: 5,
  name: 'pear',
  isRipe: true,
});
```

### escape

`mixed => string`

uses the **sqlstring** library to escape variable values for use in a SQL query.

```javascript
const safeValue = sql.escape(untrustedInput);
const query = `SELECT * FROM fruit WHERE color = ${safeValue}`;
```

### escapeId

`string => string`

uses the **sqlstring** library to escape variable values for use as a field name
in a mysql query.

```javascript
const safeValue = sql.escapeId(untrustedInput);
const query = `SELECT ${safeValue} FROM fruit WHERE color = "red"`;
```

### insert

```
(
  table: string,
  rowOrRows: Row | Array<Row>
) => Promise<{ insertId?: number }>
```

Inserts either a single row or multiple rows into a table. Returns an "insertId"
when an applicable autoincrement id is available on the table.

```javascript
await sql.insert('fruit', { name: 'pineapple', isRipe: false });
```

### one

```
(
  textOrConfig: string | QueryConfig,
  maybeValues?: Array<Value>
) => Promise<WriteOutput | Row | null>
```

Takes an arbitrary SQL statement and adds a "LIMIT 1" to the query. Only returns a single object instead of an array.

```javascript
const myApple = await sql.one({
  text: 'SELECT * FROM fruit WHERE id = ?',
  values: [myAppleId]
});
```

### query

```
(
  textOrConfig: string | QueryConfig,
  maybeValues?: Array<Value>
) => Promise<
  | WriteOutput
  | Array<Row>
  | {| results: Array<Row>, resultCount: number |}
  | {|
      results: Array<Row>,
      resultCount: number,
      pageCount: number,
      currentPage: number,
    |}
>
```

Execute an arbitrary SQL statement.

```javascript
await sql.query({ text: 'SELECT * FROM foo' });
```

### queryStream

```
(
  textOrConfig: string | QueryConfig,
  maybeValues?: Array<Value>
) => Readable
```

Execute an arbitrary SQL statement, but return a stream of rows instead of an array.

```javascript
const myStream = sql.queryStream({ text: 'SELECT name FROM fruit' });
myStream.on('data', row => {
  console.log(row.name);
});
```

### release

`void => void`

Release connection from the connection pool. Often used in conjunction with the **connect** method and/or if an application no longer needs database access and wants to free up
resources, etc.

```javascript
const newConnection = await sql.connect();
newConnection.release(); // finished with its job so releasing the connection.
```

### replace

```
(
  table: string,
  rowOrRows: Row | Array<Row>
) => Promise<void>
```

Insert a row into the database or replace an existing row if an insert would
cause a collision with a unique constraint. Lightweight wrapper around the
sql "REPLACE INTO" construct.

```javascript
await sql.replace('fruit', { key: 'my-bananas', type: 'banana', isRipe: true });
```

### save

```
(
  table: string,
  rowOrRows: Array<Object> | Object
) => Promise<{ changedRows?: number }>
```

Insert a row into the database or update an existing row if an insert would
cause a collision with a unique constraint. Wrapper around the sql
"INSERT ... ON DUPLICATE KEY UPDATE" construct.

```javascript
await sql.save('fruit', { key: 'my-bananas', type: 'banana', isRipe: true });
```

### select

```
(
  tableOrConfig: string | {|
    table: string,
    fields?: Array<string>,
    where?: Where | Array<Where>,
  |},
  maybeWhere?: Where | Array<Where>
) => Promise<Array<Row>>
```

Select rows from a table. Wrapper around the sql "SELECT" construct.

```javascript
const fruitBasket = await sql.select({
  table: 'fruit',
  fields: ['name', 'id'],
  where: { isRipe: true }
});
```

### selectOne

```
(
  tableOrConfig: string | {|
    table: string,
    fields?: Array<string>,
    where?: Where | Array<Where>,
  |},
  maybeWhere?: Where | Array<Where>
) => Promise<Row | null>
```

Select a single row from a table.

```javascript
const aFruit = await sql.selectOne('fruit', { id: 5 });
```

### selectStream

```
(
  tableOrConfig: string | {|
    table: string,
    fields?: Array<string>,
    where?: Where | Array<Where>,
  |},
  maybeWhere?: Where | Array<Where>
) => Readable
```

Select from a table and return a stream of rows

```javascript
const fruitStream = sql.selectStream('fruit');
fruitStream.on('data', fruit => {
  eat(fruit);
});
```

### templatedValue

```
(template: string, ...args: Array<Value>) => TemplatedValue
```

Returns a "TemplatedValue" object

```javascript
await sql.insert('fruit', {
  name: new TemplatedValue('CONCAT(?, ?)', 'a', 'b'),
});
```

### update

```
(
  table: string,
  updateOrUpdates: Object | Array<UpdateObject>,
  where?: UpdateWhere
): Promise<{ changedRows?: number }>
```

Updates a table. Wrapper around the sql "UPDATE" construct.

```javascript
// Equivalent to: "UPDATE fruit SET isRipe = false WHERE color = 'brown';"
await sql.update('fruit', { isRipe: false }, { color: 'brown' })
```

### Query Configuration Options

```
type QueryConfig = {
  text: string,
  values?: Array<Value>,
  nestTables?: boolean,
  resultCount?: boolean,
  paginate?: {| page?: number, resultsPerPage?: number |},
};
```
