/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('2f0o4v7l4r1k9sy');

    // update
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'wrkavoid',
        name: 'avoidDefaultPort',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {}
      })
    );

    // update
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'wrkrun01',
        name: 'runningServerCount',
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

    // update
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'wrktot01',
        name: 'totalServerCount',
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
    const collection = dao.findCollectionByNameOrId('2f0o4v7l4r1k9sy');

    // update
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'wrkavoid',
        name: 'avoidDefaultPort',
        type: 'bool',
        required: true,
        presentable: false,
        unique: false,
        options: {}
      })
    );

    // update
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'wrkrun01',
        name: 'runningServerCount',
        type: 'number',
        required: true,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: true
        }
      })
    );

    // update
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'wrktot01',
        name: 'totalServerCount',
        type: 'number',
        required: true,
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
  }
);
