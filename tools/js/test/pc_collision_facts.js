/* eslint-env mocha */

// Collision shapes of the vanilla client that the hand-kept shape files of the oldest versions (which no generator
// writes) have got wrong: each fact names the block, the data folders it holds for and the shape the client collides
// with there.

const assert = require('assert')
const path = require('path')

const FACTS = [
  // BlockFarmland.getCollisionBoundingBox: a full block up to 1.9, its 15/16 box being only its outline; from 1.10 the
  // outline is the collision box too
  { block: 'farmland', folders: ['pc/1.8', 'pc/1.9'], shape: [[0, 0, 0, 1, 1, 1]] },
  { block: 'farmland', folders: ['pc/1.10', 'pc/1.12'], shape: [[0, 0, 0, 1, 0.9375, 1]] }
]

describe('pc collision shapes the client has', function () {
  for (const { block, folders, shape } of FACTS) {
    for (const folder of folders) {
      it(`${folder}: ${block}`, function () {
        const shapes = require(path.join(__dirname, '../../../data', folder, 'blockCollisionShapes.json'))
        const ids = [].concat(shapes.blocks[block])
        for (const id of ids) assert.deepStrictEqual(shapes.shapes[id], shape)
      })
    }
  }
})
