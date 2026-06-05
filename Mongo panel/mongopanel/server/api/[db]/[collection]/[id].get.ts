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

  const document = await collection.findOne(filter)
  if (!document) throw createError({ statusCode: 404, message: 'Document introuvable' })

  return { ...document, _id: document._id.toString() }
})
