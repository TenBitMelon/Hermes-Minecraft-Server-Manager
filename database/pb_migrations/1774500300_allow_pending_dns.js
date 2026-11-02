/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db);
    const servers = dao.findCollectionByNameOrId('servers');
    // Provisioning creates the record before DNS, then writes the provider ids.
    for (const name of ['cloudflareCNAMERecordID', 'cloudflareSRVRecordID']) {
      const field = servers.schema.getFieldByName(name);
      field.required = false;
      servers.schema.addField(field);
    }
    dao.saveCollection(servers);
  },
  () => {}
);
