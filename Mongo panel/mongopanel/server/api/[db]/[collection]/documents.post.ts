export default defineEventHandler(async (event) => {
  const dbName = getRouterParam(event, 'db')!
  const collectionName = getRouterParam(event, 'collection')!
  const body = await readBody(event)

  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, message: 'Corps de requête invalide' })
  }

  const { _id, ...doc } = body

  const client = await getMongoClient()
  const collection = client.db(dbName).collection(collectionName)
  const result = await collection.insertOne(doc)

  return { insertedId: result.insertedId.toString(), success: true }
})
