/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('80olb9b23s3qall');

    // update
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'bdis7jag',
        name: 'cloudflareCNAMERecordID',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: ''
        }
      })
    );

    // update
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'prxrqhb8',
        name: 'cloudflareSRVRecordID',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: ''
        }
      })
    );

    return dao.saveCollection(collection);
  },
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('80olb9b23s3qall');

    // update
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'bdis7jag',
        name: 'cloudflareCNAMERecordID',
        type: 'text',
        required: true,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: ''
        }
      })
    );

    // update
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'prxrqhb8',
        name: 'cloudflareSRVRecordID',
        type: 'text',
        required: true,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: ''
        }
      })
    );

    return dao.saveCollection(collection);
  }
);
