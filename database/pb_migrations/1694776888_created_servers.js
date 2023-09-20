/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const collection = new Collection({
      id: '80olb9b23s3qall',
      created: '2023-09-15 11:21:28.815Z',
      updated: '2023-09-15 11:21:28.815Z',
      name: 'servers',
      type: 'base',
      system: false,
      schema: [
        {
          system: false,
          id: 'edcwa19b',
          name: 'port',
          type: 'number',
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: null,
            noDecimal: true
          }
        },
        {
          system: false,
          id: 'g9gjri9b',
          name: 'title',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: null,
            pattern: ''
          }
        },
        {
          system: false,
          id: 'rh1xzukc',
          name: 'icon',
          type: 'file',
          required: false,
          presentable: false,
          unique: false,
          options: {
            maxSelect: 1,
            maxSize: 5242880,
            mimeTypes: [],
            thumbs: [],
            protected: false
          }
        },
        {
          system: false,
          id: 'mdie3z0i',
          name: 'subdomain',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: null,
            pattern: ''
          }
        },
        {
          system: false,
          id: 'ndpp525i',
          name: 'serverSoftware',
          type: 'select',
          required: false,
          presentable: false,
          unique: false,
          options: {
            maxSelect: 1,
            values: ['vanilla']
          }
        },
        {
          system: false,
          id: '4v5gepuw',
          name: 'gameVersion',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: null,
            pattern: ''
          }
        },
        {
          system: false,
          id: 'eflfvpnd',
          name: 'worldType',
          type: 'select',
          required: false,
          presentable: false,
          unique: false,
          options: {
            maxSelect: 1,
            values: ['normal', 'large_biomes', 'flat', 'amplified']
          }
        },
        {
          system: false,
          id: 'kqdgwutm',
          name: 'timeToLive',
          type: 'select',
          required: false,
          presentable: false,
          unique: false,
          options: {
            maxSelect: 1,
            values: ['12_hr_inactivity', '24_hr_inactivity', '1_day', '7_days']
          }
        },
        {
          system: false,
          id: '6y1m6wno',
          name: 'shutdown',
          type: 'bool',
          required: false,
          presentable: false,
          unique: false,
          options: {}
        },
        {
          system: false,
          id: 'bfsiroj9',
          name: 'shutdownDate',
          type: 'date',
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: '',
            max: ''
          }
        },
        {
          system: false,
          id: 'prd2eqda',
          name: 'canBeDeleted',
          type: 'bool',
          required: false,
          presentable: false,
          unique: false,
          options: {}
        },
        {
          system: false,
          id: 'omf4gdnk',
          name: 'deletionDate',
          type: 'date',
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: '',
            max: ''
          }
        },
        {
          system: false,
          id: 'd7ac4r9c',
          name: 'serverFilesZiped',
          type: 'file',
          required: false,
          presentable: false,
          unique: false,
          options: {
            maxSelect: 1,
            maxSize: 5000000000,
            mimeTypes: [],
            thumbs: [],
            protected: false
          }
        }
      ],
      indexes: [],
      listRule: '',
      viewRule: '',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      options: {}
    });

    return Dao(db).saveCollection(collection);
  },
  (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId('80olb9b23s3qall');

    return dao.deleteCollection(collection);
  }
);
