/* eslint-env mocha */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

// checks that blocks.json materials say what prismarine-block reads them as: materials[block.material][item id] is
// the speed that item digs the block at

require('./version_iterator')(function (p, versionString) {
  describe('audit materials ' + versionString, function () {
    const blockFile = path.join(p, 'blocks.json')
    if (!fs.existsSync(blockFile)) return
    // The tool rules' "cannot harvest" tags (incorrect_for_wooden_tool, ...) give no tool a speed: a block with one
    // digs at hand speed with every tool but the few listed
    it('no block has a tool rule\'s incorrect_for_ tag as its material', function () {
      const wrong = require(blockFile).filter(b => /^incorrect_for_/.test(b.material ?? ''))
      assert.deepStrictEqual(wrong.map(b => `${b.name}: ${b.material}`), [])
    })
  })
})
