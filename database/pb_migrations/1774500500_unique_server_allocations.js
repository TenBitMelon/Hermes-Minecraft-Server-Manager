/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db);
    const servers = dao.findCollectionByNameOrId('servers');
    servers.indexes = [...servers.indexes, 'CREATE UNIQUE INDEX idx_hermes_worker_port ON servers (worker, port)', 'CREATE UNIQUE INDEX idx_hermes_subdomain ON servers (subdomain)'];
    dao.saveCollection(servers);
  },
  () => {}
);
