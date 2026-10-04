/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db);

    // The SvelteKit layer is the only supported way to read or write server and
    // backup data, and it always talks to PocketBase with the superuser client.
    // Restrict these collections to superuser access so that a plain user token
    // cannot bypass the capability checks in src/lib/server/auth.ts.
    for (const id of ['80olb9b23s3qall', 'nv5l62fruznl9gp']) {
      const collection = dao.findCollectionByNameOrId(id);
      if (!collection) continue;

      collection.listRule = null;
      collection.viewRule = null;
      collection.createRule = null;
      collection.updateRule = null;
      collection.deleteRule = null;

      // Require a file token to read stored files. The server icon is left
      // public because it is rendered on the public server list; every other file
      // field holds world saves, player data or backup archives.
      const fields = collection.schema.asMap();
      for (const name of Object.keys(fields)) {
        const field = collection.schema.getFieldByName(name);
        if (!field || field.type !== 'file') continue;
        if (collection.name === 'servers' && field.name === 'icon') continue;
        field.options.protected = true;
      }

      dao.saveCollection(collection);
    }
  },
  (db) => {
    const dao = new Dao(db);

    for (const id of ['80olb9b23s3qall', 'nv5l62fruznl9gp']) {
      const collection = dao.findCollectionByNameOrId(id);
      if (!collection) continue;

      // backups was already superuser only before this migration, so only the
      // servers collection rules are restored here.
      if (collection.name === 'servers') {
        collection.listRule = '';
        collection.viewRule = '';
        collection.createRule = '@request.auth.id != null';
        collection.updateRule = '@request.auth.id != null';
        collection.deleteRule = '@request.auth.id != null';
      }

      const fields = collection.schema.asMap();
      for (const name of Object.keys(fields)) {
        const field = collection.schema.getFieldByName(name);
        if (!field || field.type !== 'file') continue;
        if (collection.name === 'servers' && field.name === 'icon') continue;
        field.options.protected = false;
      }

      dao.saveCollection(collection);
    }
  }
);
