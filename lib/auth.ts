import { Validator } from "express-json-validator-middleware"
import { Runtime } from '../types'
import { Pool, PoolClient } from 'pg'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

async function createSession (pool: Pool, accountId: string): Promise<string> {
  await pool.query('delete from sessions where account_id = $1', [accountId])
  const results = await pool.query('insert into sessions (account_id, contents) values ($1, $2) returning id', [accountId, '{}'])
  if (results.rows.length !== 0) {
    return results.rows[0].id
  } else {
    throw "could not create session"
  }
}

async function updateAccountNonce (pool: Pool, accountId: string): Promise<void> {
  await pool.query('update accounts set nonce = uuid_generate_v4()::text where id = $1', [accountId])
}

export type AuthAccount = {
  account_id: string,
  pub_key: string
}

export async function accountForSession (pool: Pool, sessionId: string): Promise<AuthAccount | void> {
  let results = await pool.query('select * from sessions where id = $1 and valid_until > current_timestamp', [sessionId])
  if (results.rowCount === 0) {
    console.log('session not found or expired')
    return
  }
  const session = results.rows[0]

  results = await pool.query('select id, pub_key from accounts where id = $1', [session.account_id])
  if (results.rowCount === 1) {
    return {
      account_id: results.rows[0].id,
      pub_key: results.rows[0].pub_key,
    }
  } else {
    return
  }
}

export function setup (runtime: Runtime) {
  const { validate } = new Validator({})

  runtime.app.get(
    '/auth/nonce',

    validate( { query: {
      type: 'object', required:['pub_key'],
      properties: {
        pub_key: { type: 'string', minLength: 1 }
      }
    }}),

    async (req, res) => {
      const results = await runtime.pool.query('select nonce from accounts where pub_key = $1', [req.query.pub_key])
      if (results.rows.length === 0) {
        res.sendStatus(404)
      } else {
        res.json({ nonce: results.rows[0].nonce })
      }
    }
  )

  runtime.app.put(
    '/auth/connect',

    validate( { body: {
      type: 'object', required:['pub_key'],
      properties: {
        pub_key: { type: 'string', minLength: 1 }
      }
    }}),

    async (req, res) => {
      const results = await runtime.pool.query('select count(1) from accounts where pub_key = $1', [req.body.pub_key])
      if (results.rows[0].count !== "0") {
        res.json({
          status: "ok",
          message: "exists",
        })
      } else {
        await runtime.pool.query('insert into accounts (pub_key, username) values ( $1, $2 ) returning id', [req.body.pub_key, req.body.pub_key])
        res.json({
          status: "ok",
          message: "created"
        })
      }
    }
  )

  runtime.app.post(
    '/auth/login',
    async (req, res) => {
      const results = await runtime.pool.query('select id, nonce from accounts where pub_key = $1', [req.body.pub_key])
      if (results.rows.length === 0) {
        res.sendStatus(404)
      }
      const accountId = results.rows[0].id

      const messageBytes = (new (global as any).TextEncoder()).encode(results.rows[0].nonce)
      const publicKeyBytes = bs58.decode(req.body.pub_key)
      const signatureBytes = new Uint8Array(req.body.signature.data)

      const signResult = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      )

      if (signResult) {
        console.log('creating session')
        const sessionId = await createSession(runtime.pool, accountId)
        res.cookie('sessionId', sessionId)
        await updateAccountNonce(runtime.pool, accountId)
      }

      res.sendStatus(200)
    }
  )
}
