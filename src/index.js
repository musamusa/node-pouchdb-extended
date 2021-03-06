'use strict'

import extend from 'extend'
import isValid from 'isvalid'
import PouchDB from 'pouchdb'
import Promise from 'bluebird'
import Utility from 'node-code-utility'
import request from 'request-promise'
import url from 'url'

let dbInstances = {}

class DBUtils {
  static insert (doc, db) {
    doc = this.addTimeInfo(doc)
    return db.post(doc)
      .then(function (res) {
        doc._id = res.id
        doc._rev = res.rev
        return doc
      })
  }

  static update (doc, db) {
    doc = this.addTimeInfo(doc)
    return db.get(doc._id)
      .then((res) => {
        doc._rev = res._rev
        doc = extend(true, res, doc)
        return db.put(doc, doc._id)
      })
      .then((res) => {
        doc._id = res.id
        doc._rev = res.rev
        return doc
      })
  }

  static addTimeInfo (doc) {
    const now = new Date().toJSON()
    if (!doc.createdOn) {
      doc.createdOn = now
    }
    doc.modifiedOn = now
    return doc
  }
}

class Database {
  constructor (couchDBOptions) {
    this.options = Utility.is.object(couchDBOptions) ? couchDBOptions : {}
    this.options.db = this.options.db || 'localDB'
    this.options.dbOptions = Utility.is.object(this.options.dbOptions) ? this.options.dbOptions : {}
    this.db = PouchDB(this.getDBFUllUrl(), this.options.dbOptions)
  }

  getDBBaseUrl () {
    const urlObject = url.parse(this.options.host)
    const port = this.options.port || 80

    if (this.options.auth && Utility.is.object(this.options.auth) && this.options.auth.username && this.options.auth.password) {
      urlObject.auth = `${this.options.auth.username}:${this.options.auth.password}`
    }

    return `${(url.format(urlObject)).replace(/\/$/, '')}:${port}`
  }

  getDBFUllUrl () {
    return `${this.getDBBaseUrl()}/${this.options.db}`
  }

  get (id) {
    return this.db.get(id)
  }

  save (doc) {
    doc = DBUtils.addTimeInfo(doc)
    const saveDoc = (doc) => {
      if (doc._id) {
        return DBUtils.update(doc, this.db)
          .catch(() => {
            return this.db.put(doc, doc._id)
              .then((res) => {
                doc._id = res.id
                doc._rev = res.rev
                return doc
              })
          })
      } else {
        return DBUtils.insert(doc, this.db)
      }
    }
    return saveDoc(doc)
  }

  getView (view, options) {
    return this.db.query(view, options)
  }

  saveDocs (docs, opt) {
    if (!Utility.is.array(docs)) {
      return Promise.reject(Utility.toNodeError({status: 400, msg: `array required but ${toString.call(docs)} given`}))
    }
    opt = opt || {}
    let count = docs.length
    const newEntries = []
    const existingIndexed = {}
    const ids = []
    while (count--) {
      const row = docs[count]
      if (!row._id) {
        newEntries.push(row)
      } else {
        const id = row._id
        ids.push(id)
        existingIndexed[id] = row
      }
    }
    // allDocs will return empty array when ids === []
    return this.db.allDocs({keys: ids})
      .then((existingDocs) => {
        const existing = existingDocs.rows
        const updated = []
        let i = existing.length
        while (i--) {
          const row = existing[i]
          const existingDoc = existingIndexed[row.key]
          if (!row.error && row.value) {
            existingDoc._rev = row.value.rev
          }
          updated.push(existingDoc)
        }
        docs = newEntries.concat(updated)
        return this.bulkDocsSave(docs, opt)
      })
  }

  allDocs (opt) {
    opt = opt || {all_or_nothing: true}
    return this.db.allDocs(opt)
  }

  delete (doc) {
    return this.db.get(doc._id)
      .then((doc) => {
        return this.db.remove(doc)
      })
  }

  isValid (doc, Schema) {
    return new Promise((resolve, reject) => {
      isValid(doc, Schema, (invalidDoc, validDoc) => {
        if (invalidDoc) {
          return reject(invalidDoc)
        }
        return resolve(validDoc)
      })
    })
  }

  bulkDocsSave (bulkDocs, options) {
    options = Utility.is.object(options) ? options : {}
    const docs = { docs: bulkDocs }
    if (this.dbUrl.indexOf('http') < 0) {
      return this.db.bulkDocs(docs)
    }
    const params = {
      url: `${this.dbUrl}/_bulk_docs`,
      body: extend(true, options, docs),
      json: true,
      timeout: 1000000,
      pool: {maxSockets: 'Infinity'}
    }
    return request.post(params)
  }

  changes (options) {
    options = Utility.is.object(options) ? options : {}
    return this.db.changes(options)
  }

  find (selector) {
    return this.db.find(selector)
  }

  createIndex (doc) {
    return this.db.createIndex(doc)
  }

  static getInstance (couchOptions, reload) {
    couchOptions = Utility.is.object(couchOptions) ? couchOptions : {}
    couchOptions.db = Utility.is.string(couchOptions.db) ? couchOptions.db : 'test'
    if (!dbInstances[couchOptions.db] || reload) {
      dbInstances[couchOptions.db] = new Database(couchOptions)
    }

    return dbInstances[couchOptions.db]
  }
}

export default Database
