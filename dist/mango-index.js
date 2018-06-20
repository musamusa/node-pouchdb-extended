'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CouchDBMangoIndex = function () {
  function CouchDBMangoIndex(rootDirToSearch) {
    _classCallCheck(this, CouchDBMangoIndex);

    this.SEARCH_DIR = rootDirToSearch;
  }

  _createClass(CouchDBMangoIndex, [{
    key: 'generateIndexList',
    value: function generateIndexList() {
      var _this = this;

      var apiDir = _fs2.default.readdirSync(this.SEARCH_DIR);
      var mangoIndexDocs = [];

      apiDir.forEach(function (dir) {
        var filePath = _path2.default.join(_this.SEARCH_DIR, dir, 'db.index.js');
        if (_fs2.default.existsSync(filePath)) {
          var data = require(filePath);
          mangoIndexDocs = mangoIndexDocs.concat(Object.values(data));
        }
      });

      return mangoIndexDocs;
    }
  }, {
    key: 'setup',
    value: function setup() {
      var mangoIndexDocs = this.generateIndexList();
      if (mangoIndexDocs.length === 0) {
        return _bluebird2.default.resolve({ message: 'no db.index.js file found in the given dir (' + this.SEARCH_DIR + ')' });
      }
      return _bluebird2.default.mapSeries(mangoIndexDocs, function (mangoIndexDoc) {
        return _index2.default.createIndex(mangoIndexDoc);
      });
    }
  }], [{
    key: 'getInstance',
    value: function getInstance(rootDirToSearch) {
      return new CouchDBMangoIndex(rootDirToSearch);
    }
  }]);

  return CouchDBMangoIndex;
}();

exports.default = CouchDBMangoIndex;