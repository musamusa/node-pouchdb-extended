'use strict'

import fs from 'fs'
import path from 'path'
import Promise from 'bluebird'

import db from './index'

class CouchDBMangoIndex {
  constructor (rootDirToSearch) {
    this.SEARCH_DIR = rootDirToSearch
  }

  generateIndexList () {
    const apiDir = fs.readdirSync(this.SEARCH_DIR)
    let mangoIndexDocs = []

    apiDir.forEach((dir) => {
      const filePath = path.join(this.SEARCH_DIR, dir, 'db.index.js')
      if (fs.existsSync(filePath)) {
        const data = require(filePath)
        mangoIndexDocs = mangoIndexDocs.concat(Object.values(data))
      }
    })

    return mangoIndexDocs
  }

  setup () {
    const mangoIndexDocs = this.generateIndexList()
    if (mangoIndexDocs.length === 0) {
      return Promise.resolve({message: `no db.index.js file found in the given dir (${this.SEARCH_DIR})`})
    }
    return Promise.mapSeries(mangoIndexDocs, mangoIndexDoc => {
      return db.createIndex(mangoIndexDoc)
    })
  }

  static getInstance (rootDirToSearch) {
    return new CouchDBMangoIndex(rootDirToSearch)
  }
}

export default CouchDBMangoIndex
