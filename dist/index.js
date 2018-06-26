'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _isvalid = require('isvalid');

var _isvalid2 = _interopRequireDefault(_isvalid);

var _pouchdb = require('pouchdb');

var _pouchdb2 = _interopRequireDefault(_pouchdb);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _nodeCodeUtility = require('node-code-utility');

var _nodeCodeUtility2 = _interopRequireDefault(_nodeCodeUtility);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dbInstances = {};

var DBUtils = function () {
  function DBUtils() {
    _classCallCheck(this, DBUtils);
  }

  _createClass(DBUtils, null, [{
    key: 'insert',
    value: function insert(doc, db) {
      doc = this.addTimeInfo(doc);
      return db.post(doc).then(function (res) {
        doc._id = res.id;
        doc._rev = res.rev;
        return doc;
      });
    }
  }, {
    key: 'update',
    value: function update(doc, db) {
      doc = this.addTimeInfo(doc);
      return db.get(doc._id).then(function (res) {
        doc._rev = res._rev;
        doc = (0, _extend2.default)(true, res, doc);
        return db.put(doc, doc._id);
      }).then(function (res) {
        doc._id = res.id;
        doc._rev = res.rev;
        return doc;
      });
    }
  }, {
    key: 'addTimeInfo',
    value: function addTimeInfo(doc) {
      var now = new Date().toJSON();
      if (!doc.createdOn) {
        doc.createdOn = now;
      }
      doc.modifiedOn = now;
      return doc;
    }
  }]);

  return DBUtils;
}();

var Database = function () {
  function Database(couchDBOptions) {
    _classCallCheck(this, Database);

    this.options = _nodeCodeUtility2.default.is.object(couchDBOptions) ? couchDBOptions : {};
    this.options.db = this.options.db || 'localDB';
    this.options.dbOptions = _nodeCodeUtility2.default.is.object(this.options.dbOptions) ? this.options.dbOptions : {};
    this.db = (0, _pouchdb2.default)(this.getDBFUllUrl(), this.options.dbOptions);
  }

  _createClass(Database, [{
    key: 'getDBBaseUrl',
    value: function getDBBaseUrl() {
      var urlObject = _url2.default.parse(this.options.host);
      var port = this.options.port || 80;

      if (this.options.auth && _nodeCodeUtility2.default.is.object(this.options.auth) && this.options.auth.username && this.options.auth.password) {
        urlObject.auth = this.options.auth.username + ':' + this.options.auth.password;
      }

      return _url2.default.format(urlObject).replace(/\/$/, '') + ':' + port;
    }
  }, {
    key: 'getDBFUllUrl',
    value: function getDBFUllUrl() {
      return this.getDBBaseUrl() + '/' + this.options.db;
    }
  }, {
    key: 'get',
    value: function get(id) {
      return this.db.get(id);
    }
  }, {
    key: 'save',
    value: function save(doc) {
      var _this = this;

      doc = DBUtils.addTimeInfo(doc);
      var saveDoc = function saveDoc(doc) {
        if (doc._id) {
          return DBUtils.update(doc, _this.db).catch(function () {
            return _this.db.put(doc, doc._id).then(function (res) {
              doc._id = res.id;
              doc._rev = res.rev;
              return doc;
            });
          });
        } else {
          return DBUtils.insert(doc, _this.db);
        }
      };
      return saveDoc(doc);
    }
  }, {
    key: 'getView',
    value: function getView(view, options) {
      return this.db.query(view, options);
    }
  }, {
    key: 'saveDocs',
    value: function saveDocs(docs, opt) {
      var _this2 = this;

      if (!_nodeCodeUtility2.default.is.array(docs)) {
        return _bluebird2.default.reject(_nodeCodeUtility2.default.toNodeError({ status: 400, msg: 'array required but ' + toString.call(docs) + ' given' }));
      }
      opt = opt || {};
      var count = docs.length;
      var newEntries = [];
      var existingIndexed = {};
      var ids = [];
      while (count--) {
        var row = docs[count];
        if (!row._id) {
          newEntries.push(row);
        } else {
          var id = row._id;
          ids.push(id);
          existingIndexed[id] = row;
        }
      }
      // allDocs will return empty array when ids === []
      return this.db.allDocs({ keys: ids }).then(function (existingDocs) {
        var existing = existingDocs.rows;
        var updated = [];
        var i = existing.length;
        while (i--) {
          var _row = existing[i];
          var existingDoc = existingIndexed[_row.key];
          if (!_row.error && _row.value) {
            existingDoc._rev = _row.value.rev;
          }
          updated.push(existingDoc);
        }
        docs = newEntries.concat(updated);
        return _this2.bulkDocsSave(docs, opt);
      });
    }
  }, {
    key: 'allDocs',
    value: function allDocs(opt) {
      opt = opt || { all_or_nothing: true };
      return this.db.allDocs(opt);
    }
  }, {
    key: 'delete',
    value: function _delete(doc) {
      var _this3 = this;

      return this.db.get(doc._id).then(function (doc) {
        return _this3.db.remove(doc);
      });
    }
  }, {
    key: 'isValid',
    value: function isValid(doc, Schema) {
      return new _bluebird2.default(function (resolve, reject) {
        (0, _isvalid2.default)(doc, Schema, function (invalidDoc, validDoc) {
          if (invalidDoc) {
            return reject(invalidDoc);
          }
          return resolve(validDoc);
        });
      });
    }
  }, {
    key: 'bulkDocsSave',
    value: function bulkDocsSave(bulkDocs, options) {
      options = _nodeCodeUtility2.default.is.object(options) ? options : {};
      var docs = { docs: bulkDocs };
      if (this.dbUrl.indexOf('http') < 0) {
        return this.db.bulkDocs(docs);
      }
      var params = {
        url: this.dbUrl + '/_bulk_docs',
        body: (0, _extend2.default)(true, options, docs),
        json: true,
        timeout: 1000000,
        pool: { maxSockets: 'Infinity' }
      };
      return _requestPromise2.default.post(params);
    }
  }, {
    key: 'changes',
    value: function changes(options) {
      options = _nodeCodeUtility2.default.is.object(options) ? options : {};
      return this.db.changes(options);
    }
  }, {
    key: 'find',
    value: function find(selector) {
      return this.db.find(selector);
    }
  }, {
    key: 'createIndex',
    value: function createIndex(doc) {
      return this.db.createIndex(doc);
    }
  }], [{
    key: 'getInstance',
    value: function getInstance(couchOptions, reload) {
      couchOptions = _nodeCodeUtility2.default.is.object(couchOptions) ? couchOptions : {};
      couchOptions.db = _nodeCodeUtility2.default.is.string(couchOptions.db) ? couchOptions.db : 'test';
      if (!dbInstances[couchOptions.db] || reload) {
        dbInstances[couchOptions.db] = new Database(couchOptions);
      }

      return dbInstances[couchOptions.db];
    }
  }]);

  return Database;
}();

exports.default = Database;