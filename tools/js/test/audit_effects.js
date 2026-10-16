/* eslint-env mocha */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

// checks that effects.json can be read by id (the entity_effect packet's) and by name (effectsByName)

require('./version_iterator')(function (p, versionString) {
  describe('audit effects ' + versionString, function () {
    const file = path.join(p, 'effects.json')
    if (!fs.existsSync(file)) return
    it('ids and names are unique', function () {
      const effects = require(file)
      const dupes = key => effects.filter((e, i) => effects.findIndex(x => x[key] === e[key]) !== i).map(e => `${key} ${e[key]}`)
      assert.deepStrictEqual([...dupes('id'), ...dupes('name')], [])
    })
  })
})
