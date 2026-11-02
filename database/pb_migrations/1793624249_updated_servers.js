/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("80olb9b23s3qall")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1ga3xket",
    "name": "field",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "2f0o4v7l4r1k9sy",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("80olb9b23s3qall")

  // remove
  collection.schema.removeField("1ga3xket")

  return dao.saveCollection(collection)
})
