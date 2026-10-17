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
  { block: 'farmland', folders: ['pc/1.10', 'pc/1.12'], shape: [[0, 0, 0, 1, 0.9375, 1]] },
  // BlockLadder.setBlockBoundsBasedOnState: 0.125 thick on 1.8, against the side it faces away from (metadata 2 to 5
  // face north, south, west and east; the others read as north); 0.1875 thick from 1.9
  { block: 'ladder', folders: ['pc/1.8'], metadata: 2, shape: [[0, 0, 0.875, 1, 1, 1]] },
  { block: 'ladder', folders: ['pc/1.8'], metadata: 3, shape: [[0, 0, 0, 1, 1, 0.125]] },
  { block: 'ladder', folders: ['pc/1.8'], metadata: 4, shape: [[0.875, 0, 0, 1, 1, 1]] },
  { block: 'ladder', folders: ['pc/1.8'], metadata: 5, shape: [[0, 0, 0, 0.125, 1, 1]] },
  { block: 'ladder', folders: ['pc/1.9', 'pc/1.12'], metadata: 2, shape: [[0, 0, 0.8125, 1, 1, 1]] }
]

describe('pc collision shapes the client has', function () {
  for (const { block, folders, metadata, shape } of FACTS) {
    for (const folder of folders) {
      it(`${folder}: ${block}${metadata === undefined ? '' : `:${metadata}`}`, function () {
        const shapes = require(path.join(__dirname, '../../../data', folder, 'blockCollisionShapes.json'))
        const ids = [].concat(shapes.blocks[block])
        for (const id of metadata === undefined ? ids : [ids[metadata]]) assert.deepStrictEqual(shapes.shapes[id], shape)
      })
    }
  }
})
