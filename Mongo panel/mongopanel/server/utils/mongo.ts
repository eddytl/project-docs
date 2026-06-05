import { MongoClient } from 'mongodb'

let client: MongoClient | null = null

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client
  const config = useRuntimeConfig()
  client = new MongoClient(config.mongoUri)
  await client.connect()
  return client
}
