const SYSTEM_DBS = ['admin', 'config', 'local']

export default defineEventHandler(async () => {
  const client = await getMongoClient()
  const adminDb = client.db('admin')
  const result = await adminDb.command({ listDatabases: 1 })

  const databases = (result.databases as Array<{ name: string; sizeOnDisk: number; empty: boolean }>)
    .filter(db => !SYSTEM_DBS.includes(db.name))
    .map(db => ({
      name: db.name,
      sizeOnDisk: db.sizeOnDisk,
      empty: db.empty,
    }))

  return { databases, totalSize: result.totalSize }
})
