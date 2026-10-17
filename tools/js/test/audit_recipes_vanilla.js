/* eslint-env mocha */

const path = require('path')
const assert = require('assert')

// checks the recipes before 1.13 against the decompiled clients' (the recipe dispatchers to 1.11.2, the 1.12.2 jar's
// recipe files): each version's recipes.json gives the results vanilla's recipes give

const data = path.join(__dirname, '../../../data')
const dataPaths = require(path.join(data, 'dataPaths.json')).pc
const recipesOf = version => require(path.join(data, dataPaths[version].recipes, 'recipes.json'))

// an expected ingredient: an id (written either way), { id, metadata } (that data value), or { id, any: true } (the bare
// id: any data value)
function sameCell (want, cell) {
  if (want == null || cell == null) return want == null && cell == null
  const id = typeof cell === 'object' ? cell.id : cell
  if (typeof want === 'number') return id === want
  if (want.any) return typeof cell === 'number' && cell === want.id
  return typeof cell === 'object' && cell.id === want.id && cell.metadata === want.metadata
}
const idOf = c => typeof c === 'object' ? c.id : c
const sortCells = list => [...list].sort((a, b) => idOf(a) - idOf(b) || (a.metadata ?? -1) - (b.metadata ?? -1))
const sameRows = (want, rows) => rows.length === want.length && rows.every((row, y) => row.length === want[y].length && row.every((c, x) => sameCell(want[y][x], c)))
// a recipe of minecraft-data's giving count of id:metadata from that shape (rows, or mirrored) or those ingredients (a
// single one either way)
function gives (recipes, [id, metadata, count], form) {
  return (recipes[id] ?? []).some(r => {
    if (r.result.count !== count || (r.result.metadata ?? 0) !== metadata) return false
    const one = r.inShape ? (r.inShape.length === 1 && r.inShape[0].length === 1 && [r.inShape[0][0]]) : r.ingredients.length === 1 && r.ingredients
    const wantOne = form.inShape ? (form.inShape.length === 1 && form.inShape[0].length === 1 && [form.inShape[0][0]]) : form.ingredients.length === 1 && form.ingredients
    if (one && wantOne) return sameCell(wantOne[0], one[0])
    if (form.inShape) return !!r.inShape && (sameRows(form.inShape, r.inShape) || sameRows(form.inShape, r.inShape.map(row => [...row].reverse())))
    if (!r.ingredients || r.ingredients.length !== form.ingredients.length) return false
    const want = sortCells(form.ingredients)
    return sortCells(r.ingredients).every((c, i) => sameCell(want[i], c))
  })
}
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
const all = ['1.8', '1.9.4', '1.10.2', '1.11.2', '1.12.2']

// [versions, what, [[result, form]], results no recipe gives]
const RESULTS = [
  [all, 'the redstone torch (76, not the unlit 75) from redstone and a stick', [[[76, 0, 1], { inShape: [[331], [280]] }]], [75]],
  [all, 'the nether bricks block (112) from four nether bricks (405, smelted)', [[[112, 0, 1], { inShape: [[405, 405], [405, 405]] }]], [405]],
  [all, 'the quartz pillar (155:2, QuartzType.LINES_X) from two quartz blocks', [[[155, 2, 2], { inShape: [[{ id: 155, metadata: 0 }], [{ id: 155, metadata: 0 }]] }]], []],
  // (1.8's doors: the spruce door's item is 427)
  [['1.8'], 'the spruce to dark oak doors (427 - 431) from their planks', range(1, 5).map(m => [[426 + m, 0, 3], { inShape: Array(3).fill([{ id: 5, metadata: m }, { id: 5, metadata: m }]) }]), [426]],
  [['1.8', '1.9.4', '1.10.2'], 'the dyed wool (35:n) from the dye of its color (351:15 - n) and white wool', range(1, 15).map(n => [[35, n, 1], { ingredients: [35, { id: 351, metadata: 15 - n }] }]), []],
  [['1.11.2', '1.12.2'], 'the black wool from black dye and white wool', [[[35, 15, 1], { ingredients: [35, { id: 351, metadata: 0 }] }]], []],
  [['1.8', '1.9.4', '1.10.2'], 'the stained clay (159:n) from hardened clay (172, smelted) and the dye', range(0, 15).map(n => [[159, n, 8], { inShape: [[172, 172, 172], [172, { id: 351, metadata: 15 - n }, 172], [172, 172, 172]] }]), [172]],
  [['1.11.2'], 'the black stained clay from hardened clay and black dye', [[[159, 15, 8], { inShape: [[172, 172, 172], [172, { id: 351, metadata: 0 }, 172], [172, 172, 172]] }]], [172]],
  // the data values of the ingredients: the one vanilla's takes, or the bare id where it takes any
  [all, 'the mossy stone bricks from stone bricks (98:0) and a vine', [[[98, 1, 1], { ingredients: [{ id: 98, metadata: 0 }, 106] }]], []],
  [all, 'the light gray dye from an azure bluet (38:3)', [[[351, 7, 1], { inShape: [[{ id: 38, metadata: 3 }]] }]], []],
  [all, 'the black banner from black wool (35:15)', [[[425, 0, 1], { inShape: [Array(3).fill({ id: 35, metadata: 15 }), Array(3).fill({ id: 35, metadata: 15 }), [null, 280, null]] }]], []],
  [['1.8', '1.9.4', '1.10.2'], 'the dyed wool from white wool (35:0)', range(1, 15).map(n => [[35, n, 1], { ingredients: [{ id: 35, metadata: 0 }, { id: 351, metadata: 15 - n }] }]), []],
  [['1.8', '1.9.4', '1.10.2'], 'the carpets from the wool of their color', range(0, 15).map(n => [[171, n, 3], { inShape: [[{ id: 35, metadata: n }, { id: 35, metadata: n }]] }]), []],
  [['1.11.2', '1.12.2'], 'the black wool from white wool, the black carpet from black wool', [[[35, 15, 1], { ingredients: [{ id: 35, metadata: 0 }, { id: 351, metadata: 0 }] }], [[171, 15, 3], { inShape: [[{ id: 35, metadata: 15 }, { id: 35, metadata: 15 }]] }]], []],
  [['1.11.2', '1.12.2'], 'the stone bricks, the stone button and the stone pressure plate from stone (1:0)', [
    [[98, 0, 4], { inShape: Array(2).fill([{ id: 1, metadata: 0 }, { id: 1, metadata: 0 }]) }],
    [[77, 0, 1], { inShape: [[{ id: 1, metadata: 0 }]] }],
    [[70, 0, 1], { inShape: [[{ id: 1, metadata: 0 }, { id: 1, metadata: 0 }]] }]
  ], []],
  [['1.11.2'], 'the stone slab from stone (1:0)', [[[44, 0, 6], { inShape: [Array(3).fill({ id: 1, metadata: 0 })] }]], []],
  // the ingredients' ids
  [all, 'the nether brick fence, stairs and slab from the nether bricks block (112), not the item', [
    [[113, 0, 6], { inShape: Array(2).fill([112, 112, 112]) }],
    [[114, 0, 4], { inShape: [[112, null, null], [112, 112, null], [112, 112, 112]] }],
    [[44, 6, 6], { inShape: [[112, 112, 112]] }]
  ], []],
  [all, 'the activator rail, the repeater and the comparator from redstone torches (76), not unlit ones', [
    [[157, 0, 6], { inShape: [[265, 280, 265], [265, 76, 265], [265, 280, 265]] }],
    [[356, 0, 1], { inShape: [[76, 331, 76], Array(3).fill({ id: 1, metadata: 0 })] }],
    [[404, 0, 1], { inShape: [[null, 76, null], [76, 406, 76], Array(3).fill({ id: 1, metadata: 0 })] }]
  ], []],
  // the recipes minecraft-data lacked (the materials: planks and cobblestone of any data value)
  [all, 'the tools and swords of wood, stone, iron, diamond and gold', [{ id: 5, any: true }, { id: 4, any: true }, 265, 264, 266].flatMap((cell, i) => [
    [[[270, 274, 257, 278, 285][i], 0, 1], { inShape: [[cell, cell, cell], [null, 280, null], [null, 280, null]] }],
    [[[269, 273, 256, 277, 284][i], 0, 1], { inShape: [[cell], [280], [280]] }],
    [[[271, 275, 258, 279, 286][i], 0, 1], { inShape: [[cell, cell], [cell, 280], [null, 280]] }],
    [[[290, 291, 292, 293, 294][i], 0, 1], { inShape: [[cell, cell], [null, 280], [null, 280]] }],
    [[[268, 272, 267, 276, 283][i], 0, 1], { inShape: [[cell], [cell], [280]] }]
  ]), []],
  [all, 'the banners each from the wool of its color', range(0, 15).map(n => [[425, 15 - n, 1], { inShape: [Array(3).fill({ id: 35, metadata: n }), Array(3).fill({ id: 35, metadata: n }), [null, 280, null]] }]), []],
  [['1.8', '1.9.4', '1.10.2', '1.11.2'], 'the white wool from bone meal and white wool', [[[35, 0, 1], { ingredients: [{ id: 351, metadata: 15 }, { id: 35, metadata: 0 }] }]], []],
  [all, 'the light gray dye from a white tulip and an oxeye daisy', [
    [[351, 7, 1], { ingredients: [{ id: 38, metadata: 6 }] }],
    [[351, 7, 1], { ingredients: [{ id: 38, metadata: 8 }] }]
  ], []],
  [['1.10.2', '1.11.2', '1.12.2'], "1.10's bone block, magma block, nether wart block and red nether bricks", [
    [[216, 0, 1], { inShape: Array(3).fill(Array(3).fill({ id: 351, metadata: 15 })) }],
    [[351, 15, 9], { ingredients: [216] }],
    [[213, 0, 1], { inShape: [[378, 378], [378, 378]] }],
    [[214, 0, 1], { inShape: Array(3).fill([372, 372, 372]) }],
    [[215, 0, 1], { inShape: [[405, 372], [372, 405]] }]
  ], []],
  [['1.11.2', '1.12.2'], 'the stained glass, its panes and the carpets of each color', range(0, 15).flatMap(n => [
    [[95, n, 8], { inShape: [[20, 20, 20], [20, { id: 351, metadata: 15 - n }, 20], [20, 20, 20]] }],
    [[160, n, 16], { inShape: Array(2).fill(Array(3).fill({ id: 95, metadata: n })) }],
    [[171, n, 3], { inShape: [[{ id: 35, metadata: n }, { id: 35, metadata: n }]] }]
  ]), []],
  [['1.11.2', '1.12.2'], 'the boats of each wood', range(0, 5).map(m => [[[333, 444, 445, 446, 447, 448][m], 0, 1], { inShape: [[{ id: 5, metadata: m }, null, { id: 5, metadata: m }], Array(3).fill({ id: 5, metadata: m })] }]), []]
]
// [versions, what, [[result, form]]]: recipes no client has (snapshots' recipes, or none's)
const NONE = [
  [all, 'the wooden button from two stone', [[[143, 0, 1], { inShape: [[1], [1]] }]]],
  [['1.9.4', '1.10.2', '1.11.2', '1.12.2'], 'the glowstone from nine glowstone dust (four make it)', [[[89, 0, 1], { inShape: Array(3).fill([348, 348, 348]) }]]],
  [['1.9.4', '1.10.2', '1.11.2', '1.12.2'], 'the flint and steel shaped (it is shapeless)', [[[259, 0, 1], { inShape: [[265, null], [null, 318]] }]]],
  [['1.9.4', '1.10.2', '1.11.2', '1.12.2'], 'the boat with a wooden shovel', [[[333, 0, 1], { inShape: [[5, 269, 5], [5, 5, 5]] }]]],
  [['1.9.4', '1.10.2', '1.11.2', '1.12.2'], 'the shield of wool and planks', [[[442, 0, 1], { inShape: [[35, 5, null], [35, 5, 265], [35, 5, null]] }]]]
]
// [ingredient, the results whose recipes take it]
const TAKEN = [
  [75, []], // the unlit redstone torch
  [405, [112, 215]] // the nether brick item: the nether bricks block, 1.10's red nether bricks
]

for (const version of all) {
  describe('audit recipes against vanilla pc ' + version, function () {
    const recipes = recipesOf(version)
    for (const [versions, what, expected, none] of RESULTS) {
      if (!versions.includes(version)) continue
      it(what, function () {
        assert.deepStrictEqual(expected.filter(([result, form]) => !gives(recipes, result, form)).map(([result]) => result.join(':')), [])
        assert.deepStrictEqual(none.filter(id => recipes[id]), [])
      })
    }
    for (const [versions, what, recipesNone] of NONE) {
      if (!versions.includes(version)) continue
      it('no ' + what, function () {
        assert.deepStrictEqual(recipesNone.filter(([result, form]) => gives(recipes, result, form)).map(([result]) => result.join(':')), [])
      })
    }
    for (const [ingredient, results] of TAKEN) {
      it(`only ${results.join(', ') || 'no recipe'} take${results.length === 1 ? 's' : ''} ${ingredient}`, function () {
        const taking = Object.values(recipes).flat().filter(r => (r.inShape ? r.inShape.flat() : r.ingredients).some(c => c != null && idOf(c) === ingredient))
        assert.deepStrictEqual([...new Set(taking.map(r => r.result.id))].filter(id => !results.includes(id)), [])
      })
    }
  })
}
