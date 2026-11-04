/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const collection = new Collection({
      id: '2f0o4v7l4r1k9sy',
      created: '2026-03-20 20:30:00.000Z',
      updated: '2026-03-20 20:30:00.000Z',
      name: 'workers',
      type: 'base',
      system: false,
      schema: [
        { system: false, id: 'wrkname01', name: 'name', type: 'text', required: true, presentable: false, unique: false, options: { min: 1, max: 120, pattern: '' } },
        { system: false, id: 'wrkbase1', name: 'baseUrl', type: 'text', required: true, presentable: false, unique: false, options: { min: 1, max: 255, pattern: '' } },
        { system: false, id: 'wrktoken', name: 'apiToken', type: 'text', required: false, presentable: false, unique: false, options: { min: null, max: 255, pattern: '' } },
        { system: false, id: 'wrkhash1', name: 'apiTokenHash', type: 'text', required: true, presentable: false, unique: false, options: { min: 1, max: 255, pattern: '' } },
        { system: false, id: 'wrkstat1', name: 'status', type: 'select', required: true, presentable: false, unique: false, options: { maxSelect: 1, values: ['online', 'offline', 'restarting', 'disabled'] } },
        { system: false, id: 'wrkpub01', name: 'publicAddress', type: 'text', required: true, presentable: false, unique: false, options: { min: 1, max: 255, pattern: '' } },
        { system: false, id: 'wrkport1', name: 'portMin', type: 'number', required: true, presentable: false, unique: false, options: { min: null, max: null, noDecimal: true } },
        { system: false, id: 'wrkport2', name: 'portMax', type: 'number', required: true, presentable: false, unique: false, options: { min: null, max: null, noDecimal: true } },
        { system: false, id: 'wrkavoid', name: 'avoidDefaultPort', type: 'bool', required: true, presentable: false, unique: false, options: {} },
        { system: false, id: 'wrkcap01', name: 'serverCapacity', type: 'number', required: true, presentable: false, unique: false, options: { min: null, max: null, noDecimal: true } },
        { system: false, id: 'wrkrun01', name: 'runningServerCount', type: 'number', required: true, presentable: false, unique: false, options: { min: null, max: null, noDecimal: true } },
        { system: false, id: 'wrktot01', name: 'totalServerCount', type: 'number', required: true, presentable: false, unique: false, options: { min: null, max: null, noDecimal: true } },
        { system: false, id: 'wrkbeat1', name: 'lastHeartbeatAt', type: 'date', required: false, presentable: false, unique: false, options: { min: '', max: '' } },
        { system: false, id: 'wrkvers1', name: 'lastHeartbeatVersion', type: 'text', required: false, presentable: false, unique: false, options: { min: null, max: 80, pattern: '' } },
        { system: false, id: 'wrkerr01', name: 'lastHeartbeatError', type: 'text', required: false, presentable: false, unique: false, options: { min: null, max: 500, pattern: '' } }
      ],
      indexes: [],
      listRule: null,
      viewRule: null,
      createRule: '@request.auth.administrator = true',
      updateRule: '@request.auth.administrator = true',
      deleteRule: '@request.auth.administrator = true',
      options: {}
    });

    return Dao(db).saveCollection(collection);
  },
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('2f0o4v7l4r1k9sy');

    return dao.deleteCollection(collection);
  }
);
