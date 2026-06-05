export default defineEventHandler(async (event) => {
  const dbName = getRouterParam(event, 'db')!
  const client = await getMongoClient()
  const db = client.db(dbName)

  const collections = await db.listCollections().toArray()

  const collectionsWithStats = await Promise.all(
    collections.map(async (col: { name: string; type: string }) => {
      try {
        const stats = await db.command({ collStats: col.name })
        return {
          name: col.name,
          type: col.type,
          count: stats.count,
          size: stats.size,
          storageSize: stats.storageSize,
          avgObjSize: stats.avgObjSize || 0,
          indexes: stats.nindexes,
        }
      } catch {
        return { name: col.name, type: col.type, count: 0, size: 0, storageSize: 0, avgObjSize: 0, indexes: 0 }
      }
    })
  )

  return { collections: collectionsWithStats, database: dbName }
})
