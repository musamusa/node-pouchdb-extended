'use strict'

module.exports.pluckDocs = (docs) => {
  const plucked = []
  if (docs.rows && docs.rows.length > 0) {
    let i = docs.rows.length
    while (i--) {
      const row = docs.rows[i]
      if (!row.doc) {
        continue
      }
      plucked.unshift(row.doc)
    }
  }

  return plucked
}

module.exports.pluckValues = (docs) => {
  const plucked = []
  if (docs.rows && docs.rows.length > 0) {
    let i = docs.rows.length
    while (i--) {
      const row = docs.rows[i]
      if (!row.value) {
        continue
      }
      plucked.unshift(row.value)
    }
  }

  return plucked
}
