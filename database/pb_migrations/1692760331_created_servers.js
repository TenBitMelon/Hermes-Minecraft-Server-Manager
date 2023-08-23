/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "4qdnujs2qade2j5",
    "created": "2023-08-23 03:12:11.640Z",
    "updated": "2023-08-23 03:12:11.640Z",
    "name": "servers",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "2fi58zt5",
        "name": "title",
        "type": "text",
        "required": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("4qdnujs2qade2j5");

  return dao.deleteCollection(collection);
})
