/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4qdnujs2qade2j5")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "a7cvd6f7",
    "name": "field",
    "type": "file",
    "required": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "maxSize": 5242880,
      "mimeTypes": [
        "image/bmp",
        "image/x-icon",
        "image/heif",
        "image/heif-sequence",
        "image/vnd.radiance",
        "image/x-xcf",
        "image/avif",
        "image/svg+xml",
        "image/webp",
        "image/gif",
        "image/jpeg",
        "image/png"
      ],
      "thumbs": [],
      "protected": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4qdnujs2qade2j5")

  // remove
  collection.schema.removeField("a7cvd6f7")

  return dao.saveCollection(collection)
})
