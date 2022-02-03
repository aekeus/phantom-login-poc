import express from 'express'
import { Pool } from 'pg'

export type Runtime = {
  pool: Pool,
  app: express.Application
}
