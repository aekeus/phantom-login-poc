Requirements

  * Postgres

Setup

  * createdb [some-db-name]
  * psql [some-db-name] < db/up.sql

Starting

`DEBUG=express:* DATABASE_URL=some-db-name ./node_modules/.bin/ts-node server.ts`
Load localhost:300 in a browser
