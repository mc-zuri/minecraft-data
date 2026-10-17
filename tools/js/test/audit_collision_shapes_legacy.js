/* eslint-env mocha */

const path = require('path')
const assert = require('assert')

// checks blockCollisionShapes before 1.13 against the clients' collision boxes (Block.appendCollisionBoxes of the
// 1.8.9 - 1.12.2 clients, for each data value, the block alone)

const data = path.join(__dirname, '../../../data')
const dataPaths = require(path.join(data, 'dataPaths.json')).pc
const shapesOf = (version, name, metadata) => {
  const { blocks, shapes } = require(path.join(data, dataPaths[version].blockCollisionShapes, 'blockCollisionShapes.json'))
  const id = Array.isArray(blocks[name]) ? blocks[name][metadata] : blocks[name]
  return shapes[id]
}
const FULL = [[0, 0, 0, 1, 1, 1]]

// [versions, block, data values, boxes, why]
const CLIENT = [
  [['1.8', '1.9.4'], 'farmland', [0, 7], FULL, 'BlockFarmland.getCollisionBoundingBox: the whole block until 1.10'],
  [['1.10.2', '1.11.2', '1.12.2'], 'farmland', [0, 7], [[0, 0, 0, 1, 0.9375, 1]], 'BlockFarmland.FARMLAND_AABB from 1.10'],
  // 1.8's ladder is 2/16 thick (BlockLadder's 0.125F), 3/16 from 1.9
  [['1.8'], 'ladder', [2], [[0, 0, 0.875, 1, 1, 1]], "1.8's ladder facing north, 0.125 thick"],
  [['1.8'], 'ladder', [3], [[0, 0, 0, 1, 1, 0.125]], "1.8's ladder facing south, 0.125 thick"],
  [['1.8'], 'ladder', [4], [[0.875, 0, 0, 1, 1, 1]], "1.8's ladder facing west, 0.125 thick"],
  [['1.8'], 'ladder', [5], [[0, 0, 0, 0.125, 1, 1]], "1.8's ladder facing east, 0.125 thick"],
  [['1.9.4', '1.12.2'], 'ladder', [2], [[0, 0, 0.8125, 1, 1, 1]], 'the ladder facing north, 0.1875 thick from 1.9'],
  // BlockPistonExtension before 1.9: the arm within the block, 0.5 wide across a horizontal head
  [['1.8'], 'piston_head', [0, 8], [[0, 0, 0, 1, 0.25, 1], [0.375, 0.25, 0.375, 0.625, 1, 0.625]], "1.8's piston head facing down"],
  [['1.8'], 'piston_head', [2, 10], [[0, 0, 0, 1, 1, 0.25], [0.25, 0.375, 0.25, 0.75, 0.625, 1]], "1.8's piston head facing north"],
  [['1.9.4'], 'piston_head', [0], [[0, 0, 0, 1, 0.25, 1], [0.375, 0.25, 0.375, 0.625, 1.25, 0.625]], 'the piston head facing down from 1.9'],
  // BlockLilyPad before 1.9: the whole block wide, 1/64 high
  [['1.8'], 'waterlily', [0], [[0, 0, 0, 1, 0.015625, 1]], "1.8's lily pad"],
  [['1.9.4', '1.12.2'], 'waterlily', [0], [[0.0625, 0, 0.0625, 0.9375, 0.09375, 0.9375]], 'the lily pad from 1.9'],
  // BlockPane before 1.9: a pane joined to nothing is both bars, across the block
  [['1.8'], 'glass_pane', [0], [[0, 0, 0.4375, 1, 1, 0.5625], [0.4375, 0, 0, 0.5625, 1, 1]], "1.8's lone glass pane"],
  [['1.8'], 'stained_glass_pane', [0, 15], [[0, 0, 0.4375, 1, 1, 0.5625], [0.4375, 0, 0, 0.5625, 1, 1]], "1.8's lone stained glass pane"],
  [['1.8'], 'iron_bars', [0], [[0, 0, 0.4375, 1, 1, 0.5625], [0.4375, 0, 0, 0.5625, 1, 1]], "1.8's lone iron bars"],
  [['1.9.4', '1.12.2'], 'glass_pane', [0], [[0.4375, 0, 0.4375, 0.5625, 1, 0.5625]], 'the lone glass pane from 1.9, its post'],
  // BlockCocoa's boxes of age 2 are age 1's in 1.9 and 1.10
  [['1.9.4', '1.10.2'], 'cocoa', [4, 8], [[0.3125, 0.3125, 0.5625, 0.6875, 0.75, 0.9375]], "1.9 and 1.10's cocoa of age 1 and 2 facing south"],
  [['1.11.2', '1.12.2'], 'cocoa', [8], [[0.25, 0.1875, 0.4375, 0.75, 0.75, 0.9375]], 'the cocoa of age 2 facing south from 1.11']
]

for (const [versions, name, metadatas, boxes, why] of CLIENT) {
  for (const version of versions) {
    describe(`audit legacy collision shapes pc ${version}`, function () {
      it(`${name} ${metadatas.join(', ')}: ${why}`, function () {
        for (const metadata of metadatas) assert.deepStrictEqual(shapesOf(version, name, metadata), boxes, `${name} ${metadata}`)
      })
    })
  }
}
