/* eslint-env mocha */

const path = require('path')
const assert = require('assert')

// checks entities.json against what vanilla's client registers: each version's own file (dataPaths), once

const data = path.join(__dirname, '../../../data')
const versions = require(path.join(data, 'pc/common/versions.json'))
const dataPaths = require(path.join(data, 'dataPaths.json')).pc
const since = version => versions.indexOf(version)

const files = new Map()
for (const version of versions) {
  const entities = dataPaths[version] && dataPaths[version].entities
  if (entities && !files.has(entities)) files.set(entities, version)
}

for (const [file, version] of files) {
  describe('audit entities ' + file, function () {
    const entities = require(path.join(data, file, 'entities.json'))
    // from 1.11 an entity is named by its registry name (EntityType's "iron_golem", "command_block_minecart"); the
    // objects' list keeps the older names
    if (since(version) >= since('1.11')) {
      it('the entities that are not objects have their registry names', function () {
        assert.deepStrictEqual(entities.filter(e => e.type !== 'object' && !/^[a-z0-9_]+$/.test(e.name)).map(e => e.name), [])
      })
    }
    // from 1.9 the horses (AbstractHorse: setSize, then EntityType.sized), the hoglin and the zoglin are 1.3964844F wide
    if (since(version) >= since('1.9')) {
      it('the horse family, the hoglin and the zoglin are 1.3964844F wide', function () {
        const family = /^(EntityHorse|horse|donkey|mule|skeleton_horse|zombie_horse|hoglin|zoglin)$/
        assert.deepStrictEqual(entities.filter(e => family.test(e.name) && e.width !== 1.3964844).map(e => `${e.name} ${e.width}`), [])
      })
    }
    if (since(version) >= since('1.13')) {
      it('the command block minecart, the firework rocket and the iron golem are named as EntityType registers them', function () {
        const names = new Set(entities.filter(e => e.type !== 'object').map(e => e.name))
        assert.deepStrictEqual(['command_block_minecart', 'firework_rocket', 'iron_golem'].filter(name => !names.has(name)), [])
      })
    }
  })
}
