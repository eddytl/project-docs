export default defineEventHandler(async () => {
  const client = await getMongoClient()
  const adminDb = client.db('admin')

  const [dbList, serverStatus] = await Promise.all([
    adminDb.command({ listDatabases: 1 }),
    adminDb.command({ serverStatus: 1 }),
  ])

  return {
    totalDatabases: dbList.databases.length,
    totalSize: dbList.totalSize,
    connections: serverStatus.connections,
    version: serverStatus.version,
    uptime: serverStatus.uptime,
    host: serverStatus.host,
  }
})
