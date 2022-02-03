require('dotenv').config()

import { ValidationError } from "express-json-validator-middleware"
import express from 'express'
import { Pool } from 'pg'
import { setup, accountForSession } from './lib/auth'

if (!process.env.DATABASE_URL) throw "DATABASE_URL required"
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const app = express()
app.use(express.json())
app.use(require('cookie-parser')())

const PORT = parseInt(process.env.PORT || "3000")

const runtime = {
  app,
  pool
}

declare global {
  namespace Express {
    interface Request {
      account: {
        account_id: string,
        pub_key: string
      }
    }
  }
}

const checkAuthentication = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.cookies.sessionId) {
    console.log('session id does not exist')
    return res.sendStatus(401)
  }
  const account = await accountForSession(pool, req.cookies.sessionId)
  if (!account) {
    console.log('invalid session')
    return res.sendStatus(401)
  }
  console.log(account)
  req.account = account
  next()
}

// check authentication for all api calls
app.use('/api', checkAuthentication)

app.use((error: any, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (error instanceof ValidationError) {
    response.status(400).send(error.validationErrors)
    next()
  } else {
    next(error)
  }
})

app.get('/api/1/test', (req, res) => {
  console.log(req.account)
  res.json({ status: 'ok' })
})

// setup authentication
setup(runtime)

app.use(express.static('public') )

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
