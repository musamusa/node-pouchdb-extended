'use strict';

module.exports.pluckDocs = function (docs) {
  var plucked = [];
  if (docs.rows && docs.rows.length > 0) {
    var i = docs.rows.length;
    while (i--) {
      var row = docs.rows[i];
      if (!row.doc) {
        continue;
      }
      plucked.unshift(row.doc);
    }
  }

  return plucked;
};

module.exports.pluckValues = function (docs) {
  var plucked = [];
  if (docs.rows && docs.rows.length > 0) {
    var i = docs.rows.length;
    while (i--) {
      var row = docs.rows[i];
      if (!row.value) {
        continue;
      }
      plucked.unshift(row.value);
    }
  }

  return plucked;
};