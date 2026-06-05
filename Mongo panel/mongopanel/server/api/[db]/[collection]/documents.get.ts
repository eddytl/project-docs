import type { Document } from 'mongodb'

export default defineEventHandler(async (event) => {
  const dbName = getRouterParam(event, 'db')!
  const collectionName = getRouterParam(event, 'collection')!
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const skip = (page - 1) * limit
  const search = query.filter as string | undefined

  let filter: Record<string, unknown> = {}
  if (search) {
    try {
      filter = JSON.parse(search)
    } catch {
      throw createError({ statusCode: 400, message: 'Filtre JSON invalide' })
    }
  }

  const sortField = (query.sortField as string) || '_id'
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1

  const client = await getMongoClient()
  const collection = client.db(dbName).collection(collectionName)

  const [documents, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
  ])

  return {
    documents: documents.map((doc: Document) => ({ ...doc, _id: doc._id.toString() })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  }
})
