/* eslint-env mocha */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

// checks that blocks.json says which blocks break as prismarine-block and mineflayer read it: hardness -1 is
// unbreakable (null or 0 would dig in no time), and air and fluids are never dug

const NEVER_DUG = ['air', 'cave_air', 'void_air', 'water', 'lava']
const UNBREAKABLE = ['bedrock', 'barrier', 'end_portal_frame', 'command_block']
// checked against the vanilla jar from 1.14 (E:\gen packages/minecraft-data-oracle); older versions not yet
const FROM = [1, 14]
const checked = v => { const [major, minor] = v.split('.').map(Number); return major > FROM[0] || (major === FROM[0] && minor >= FROM[1]) }

require('./version_iterator')(function (p, versionString) {
  describe('audit hardness ' + versionString, function () {
    const blockFile = path.join(p, 'blocks.json')
    if (!fs.existsSync(blockFile) || !versionString.startsWith('pc ') || !checked(versionString.slice(3))) return
    const blocks = () => require(blockFile)
    it('every block has a hardness', function () {
      assert.deepStrictEqual(blocks().filter(b => typeof b.hardness !== 'number').map(b => `${b.name}: ${b.hardness}`), [])
    })
    it('air and fluids are not diggable', function () {
      assert.deepStrictEqual(blocks().filter(b => NEVER_DUG.includes(b.name) && b.diggable).map(b => b.name), [])
    })
    it('unbreakable blocks have hardness -1 and are not diggable', function () {
      const wrong = blocks().filter(b => (UNBREAKABLE.includes(b.name) && b.hardness !== -1) || (b.hardness === -1 && b.diggable))
      assert.deepStrictEqual(wrong.map(b => `${b.name}: hardness ${b.hardness}, diggable ${b.diggable}`), [])
    })
  })
})
