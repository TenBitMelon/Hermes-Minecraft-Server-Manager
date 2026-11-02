/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db);
    const backups = dao.findCollectionByNameOrId('backups');
    const field = backups.schema.getFieldByName('file');
    // PocketBase 0.22's MIME detector scans nested ZIP headers: a stored Minecraft
    // JAR's manifest makes a valid backup ZIP classify as application/jar.
    // Both types are ZIP archives; file tokens and admin-only record writes remain.
    const options = JSON.parse(JSON.stringify(field.options));
    options.mimeTypes = ['application/zip', 'application/jar'];
    field.options = options;
    backups.schema.addField(field);
    dao.saveCollection(backups);
  },
  () => {}
);
