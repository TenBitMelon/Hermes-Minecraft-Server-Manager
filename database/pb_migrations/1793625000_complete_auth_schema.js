/// <reference path="../pb_data/types.d.ts" />
// Repair databases where the earlier multi-registration auth migration only
// installed part of its schema. Keep original creator ids and all saved records.
migrate(
  (db) => {
    const dao = new Dao(db);
    const users = dao.findCollectionByNameOrId('_pb_users_auth_');
    users.setOptions({ allowEmailAuth: false, allowOAuth2Auth: true, allowUsernameAuth: false, requireEmail: false, minPasswordLength: 8 });
    for (const field of [
      { id: 'bxuvwpit', name: 'administrator', type: 'bool', options: {} },
      { id: 'y25j46q1', name: 'ownedServerLimit', type: 'number', options: { min: 0, max: 1000, noDecimal: true } }
    ]) {
      if (!users.schema.getFieldByName(field.name)) users.schema.addField(new SchemaField({ ...field, required: false }));
    }
    dao.saveCollection(users);
    const servers = dao.findCollectionByNameOrId('servers');
    if (!servers.schema.getFieldByName('owner')) {
      servers.schema.addField(
        new SchemaField({
          id: 'srvowner1',
          name: 'owner',
          type: 'relation',
          required: false,
          options: { collectionId: '_pb_users_auth_', cascadeDelete: false, maxSelect: 1 }
        })
      );
    }
    dao.saveCollection(servers);
    if (servers.schema.getFieldByName('createdBy')) {
      db.newQuery("UPDATE servers SET owner = createdBy WHERE owner = '' AND createdBy != ''").execute();
    }
    let exists = false;
    try {
      dao.findCollectionByNameOrId('server_memberships');
      exists = true;
    } catch {
      /* Fresh installation. */
    }
    if (!exists) {
      const memberships = new Collection({
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

      dao.saveCollection(memberships);
    }
  },
  () => {
    // Deliberately retain repaired auth fields and membership data on rollback.
  }
);
