/* eslint-env mocha */

const path = require('path')
const assert = require('assert')

// checks that before 1.13 an ingredient vanilla takes of any variant (a block given as a block to registerShapedRecipe:
// new ItemStack(block, 1, 32767)) is written as its bare id, not as one of its variants: planks of any wood for a chest

const data = path.join(__dirname, '../../../data')
const dataPaths = require(path.join(data, 'dataPaths.json')).pc

// [versions, result id (:metadata), ingredient id] of the decompiled clients' recipes
const PLANKS = 5
const any = [
  [['1.8', '1.11.2', '1.12.2'], [268, 269, 270, 271, 290], PLANKS], // the wooden tools, sword and hoe: { Blocks.PLANKS, ... }
  [['1.11.2', '1.12.2'], [25, 33, 47, 54, 58, 72, 84, 96, 131, 143, 280, 281, 323, 355, 442], PLANKS],
  [['1.11.2', '1.12.2'], ['44:1', 128], 24], // sandstone slab and stairs: Blocks.SANDSTONE
  [['1.11.2', '1.12.2'], ['44:5', 109], 98], // stone brick slab and stairs: Blocks.STONE_BRICKS
  [['1.11.2', '1.12.2'], ['44:7', 156], 155], // quartz slab and stairs: Blocks.QUARTZ_BLOCK
  [['1.11.2', '1.12.2'], [151], 126], // daylight detector: Blocks.WOODEN_SLAB
  [['1.11.2', '1.12.2'], [180, '182:0'], 179] // red sandstone stairs and slab: Blocks.RED_SANDSTONE
]

for (const [versions, results, ingredient] of any) {
  for (const version of versions) {
    describe(`audit recipe wildcards pc ${version}`, function () {
      const recipes = require(path.join(data, dataPaths[version].recipes, 'recipes.json'))
      it(`${results.join(', ')} take ${ingredient} of any variant`, function () {
        const fixed = []
        for (const result of results) {
          const [id, metadata] = String(result).split(':').map(Number)
          for (const recipe of recipes[id] ?? []) {
            if (metadata != null && recipe.result.metadata !== metadata) continue
            const ingredients = (recipe.inShape ? recipe.inShape.flat() : recipe.ingredients ?? [])
            for (const i of ingredients) if (i && typeof i === 'object' && i.id === ingredient) fixed.push(`${result}: ${i.id}:${i.metadata}`)
          }
        }
        assert.deepStrictEqual(fixed, [])
      })
    })
  }
}
