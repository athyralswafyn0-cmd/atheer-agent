import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

declare global {
  var __db: PrismaClient | undefined
}

// This is needed because in development we don't want to restart
// the server with every file change, but we want to keep the same DB connection.
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  if (!global.__db) {
    global.__db = new PrismaClient()
  }
  prisma = global.__db
}

export { prisma }