import { ObjectId } from 'mongodb'

export default defineEventHandler(async (event) => {
  const dbName = getRouterParam(event, 'db')!
  const collectionName = getRouterParam(event, 'collection')!
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const { _id, ...update } = body

  const client = await getMongoClient()
  const collection = client.db(dbName).collection(collectionName)

  let filter: Record<string, unknown>
  try {
    filter = { _id: new ObjectId(id) }
  } catch {
    filter = { _id: id }
  }

  const result = await collection.replaceOne(filter, update)
  if (result.matchedCount === 0) throw createError({ statusCode: 404, message: 'Document introuvable' })

  return { success: true, modifiedCount: result.modifiedCount }
})
