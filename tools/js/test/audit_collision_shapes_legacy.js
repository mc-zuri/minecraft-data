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
  [['1.10.2', '1.11.2', '1.12.2'], 'farmland', [0, 7], [[0, 0, 0, 1, 0.9375, 1]], 'BlockFarmland.FARMLAND_AABB from 1.10']
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
