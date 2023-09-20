/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("80olb9b23s3qall")

  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_ex23id7` ON `servers` (\n  `port`,\n  `subdomain`\n)"
  ]

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("80olb9b23s3qall")

  collection.indexes = []

  return dao.saveCollection(collection)
})
