import { ObjectId } from 'mongodb'

export default defineEventHandler(async (event) => {
  const dbName = getRouterParam(event, 'db')!
  const collectionName = getRouterParam(event, 'collection')!
  const id = getRouterParam(event, 'id')!

  const client = await getMongoClient()
  const collection = client.db(dbName).collection(collectionName)

  let filter: Record<string, unknown>
  try {
    filter = { _id: new ObjectId(id) }
  } catch {
    filter = { _id: id }
  }

  const result = await collection.deleteOne(filter)
  if (result.deletedCount === 0) throw createError({ statusCode: 404, message: 'Document introuvable' })

  return { success: true }
})
