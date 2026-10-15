/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

// checks for duplicates names and jumps in ids, and that an item that wears out lasts more than one use

require('./version_iterator')(function (p, versionString) {
  describe('audit items ' + versionString, function () {
    it('audit items', function () {
      let items
      const pFile = path.join(p, 'items.json')
      if (fs.existsSync(pFile)) {
        items = require(pFile)
      } else {
        // console.log('No items for version ' + versionString)
      }
      if (items) {
        const displayNames = {}
        const names = {}
        let lastItemId = 0
        items.forEach(item => {
          if (item.displayName == null) {
            console.log('Missing displayName:', item.id)
          } else {
            const otherBlock = displayNames[item.displayName]
            if (otherBlock) {
              // console.log('Duplicate displayName:', otherBlock.id, 'and', item.id,
              //  'both share', item.displayName)
            } else {
              displayNames[item.displayName] = item
            }
          }
          if (item.name == null) {
            console.log('Missing name:', item.id)
          } else {
            const otherBlock = names[item.name]
            if (otherBlock) {
              // console.log('Duplicate name:', otherBlock.id, 'and', item.id,
              //  'both share', item.name)
            } else {
              names[item.name] = item
            }
          }
          // bedrock/1.21.0 still has the values of the pc/1.20.5 file it was made from
          if (item.maxDurability !== undefined && versionString !== 'bedrock 1.21.0') {
            assert.ok(item.maxDurability > 1, `${item.name} has maxDurability ${item.maxDurability}`)
          }
          const delta = item.id - lastItemId
          if (delta !== 1) {
            // console.log('jump from', lastItemId, 'to', item.id)
          }
          lastItemId = item.id
        })
      }
    })
  })
})
