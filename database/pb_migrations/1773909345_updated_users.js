/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('_pb_users_auth_');

    collection.options = {
      allowEmailAuth: false,
      allowOAuth2Auth: true,
      allowUsernameAuth: false,
      exceptEmailDomains: null,
      manageRule: null,
      minPasswordLength: 8,
      onlyEmailDomains: null,
      onlyVerified: false,
      requireEmail: false
    };

    return dao.saveCollection(collection);
  },
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('_pb_users_auth_');

    collection.options = {
      allowEmailAuth: true,
      allowOAuth2Auth: false,
      allowUsernameAuth: false,
      exceptEmailDomains: null,
      manageRule: null,
      minPasswordLength: 8,
      onlyEmailDomains: null,
      requireEmail: true
    };

    return dao.saveCollection(collection);
  }
);

migrate(
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('80olb9b23s3qall');

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '64qsyxu3',
        name: 'createdBy',
        type: 'relation',
        required: false,
        presentable: false,
        unique: false,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: null
        }
      })
    );

    return dao.saveCollection(collection);
  },
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('80olb9b23s3qall');

    collection.schema.removeField('64qsyxu3');

    return dao.saveCollection(collection);
  }
);

migrate(
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('_pb_users_auth_');

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'bxuvwpit',
        name: 'administrator',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {}
      })
    );

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'y25j46q1',
        name: 'ownedServerLimit',
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
    const collection = dao.findCollectionByNameOrId('_pb_users_auth_');

    collection.schema.removeField('bxuvwpit');

    collection.schema.removeField('y25j46q1');

    return dao.saveCollection(collection);
  }
);

migrate(
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('80olb9b23s3qall');

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '64qsyxu3',
        name: 'owner',
        type: 'relation',
        required: false,
        presentable: false,
        unique: false,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: null
        }
      })
    );

    return dao.saveCollection(collection);
  },
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('80olb9b23s3qall');

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '64qsyxu3',
        name: 'createdBy',
        type: 'relation',
        required: false,
        presentable: false,
        unique: false,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: null
        }
      })
    );

    return dao.saveCollection(collection);
  }
);

migrate(
  (db) => {
    const collection = new Collection({
      id: '5zk1fttsz4e97ik',
      created: '2026-03-19 08:50:05.427Z',
      updated: '2026-03-19 08:50:05.427Z',
      name: 'server_memberships',
      type: 'base',
      system: false,
      schema: [
        {
          system: false,
          id: 'lby0nfxi',
          name: 'server',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: '80olb9b23s3qall',
            cascadeDelete: true,
            minSelect: null,
            maxSelect: 1,
            displayFields: null
          }
        },
        {
          system: false,
          id: 'i6awptso',
          name: 'user',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            minSelect: null,
            maxSelect: 1,
            displayFields: null
          }
        },
        {
          system: false,
          id: 'gaovfrws',
          name: 'canStartStop',
          type: 'bool',
          required: false,
          presentable: false,
          unique: false,
          options: {}
        },
        {
          system: false,
          id: 'zkmw8lwt',
          name: 'canSendConsole',
          type: 'bool',
          required: false,
          presentable: false,
          unique: false,
          options: {}
        },
        {
          system: false,
          id: 'v76f6mq2',
          name: 'canManageFiles',
          type: 'bool',
          required: false,
          presentable: false,
          unique: false,
          options: {}
        },
        {
          system: false,
          id: 'vxwglimu',
          name: 'canManageAccess',
          type: 'bool',
          required: false,
          presentable: false,
          unique: false,
          options: {}
        },
        {
          system: false,
          id: 'do8oh6wo',
          name: 'canManageConfig',
          type: 'bool',
          required: false,
          presentable: false,
          unique: false,
          options: {}
        }
      ],
      indexes: ['CREATE UNIQUE INDEX `idx_DJSgNWm` ON `server_memberships` (\n  `server`,\n  `user`\n)'],
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      options: {}
    });

    return Dao(db).saveCollection(collection);
  },
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('5zk1fttsz4e97ik');

    return dao.deleteCollection(collection);
  }
);
