/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db);
    const workers = dao.findCollectionByNameOrId('workers');
    // PocketBase "required" rejects false/zero. Fresh workers start with zero
    // servers, and allowing port 25565 requires avoidDefaultPort=false.
    for (const name of ['avoidDefaultPort', 'runningServerCount', 'totalServerCount']) {
      const field = workers.schema.getFieldByName(name);
      field.required = false;
      workers.schema.addField(field);
    }
    dao.saveCollection(workers);
  },
  () => {}
);
