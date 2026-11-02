/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("nv5l62fruznl9gp")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8bpwbkct",
    "name": "file",
    "type": "file",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "mimeTypes": [
        "application/zip",
        "application/jar"
      ],
      "thumbs": [],
      "maxSelect": 1,
      "maxSize": 524288000,
      "protected": true
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("nv5l62fruznl9gp")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8bpwbkct",
    "name": "file",
    "type": "file",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "mimeTypes": [
        "application/zip"
      ],
      "thumbs": [],
      "maxSelect": 1,
      "maxSize": 524288000,
      "protected": true
    }
  }))

  return dao.saveCollection(collection)
})
