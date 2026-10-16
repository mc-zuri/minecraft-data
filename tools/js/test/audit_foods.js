/* eslint-env mocha */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

// checks that foods.json values keep their meaning: saturation is what eating gives,
// saturationRatio = saturation / foodPoints, effectiveQuality = foodPoints + saturation

const f = Math.fround

require('./version_iterator')(function (p, versionString) {
  describe('audit foods ' + versionString, function () {
    const foodFile = path.join(p, 'foods.json')
    if (!fs.existsSync(foodFile)) return
    it('saturationRatio and effectiveQuality follow from foodPoints and saturation', function () {
      const wrong = require(foodFile).filter(food =>
        Math.abs(f(food.saturation / food.foodPoints) - food.saturationRatio) > 1e-5 ||
        Math.abs(f(food.foodPoints + food.saturation) - food.effectiveQuality) > 1e-4)
      assert.deepStrictEqual(wrong.map(food => `${food.name}: ${food.foodPoints} / ${food.saturation} / ratio ${food.saturationRatio} / quality ${food.effectiveQuality}`), [])
    })
    // No food saturates more than 2.4 x its points (the golden carrot: 6 points, 14.4)
    it('saturation at most 2.4 x foodPoints', function () {
      const wrong = require(foodFile).filter(food => food.saturation > food.foodPoints * 2.4 + 1e-4)
      assert.deepStrictEqual(wrong.map(food => `${food.name}: ${food.foodPoints} points, ${food.saturation} saturation`), [])
    })
  })
})
