/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('80olb9b23s3qall');

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'srvwork1',
        name: 'worker',
        type: 'relation',
        required: false,
        presentable: false,
        unique: false,
        options: {
          collectionId: '2f0o4v7l4r1k9sy',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ['name']
        }
      })
    );

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'srvwork2',
        name: 'workerPort',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: true
        }
      })
    );

    return dao.saveCollection(collection);
  },
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('80olb9b23s3qall');

    collection.schema.removeField('srvwork1');
    collection.schema.removeField('srvwork2');

    return dao.saveCollection(collection);
  }
);
