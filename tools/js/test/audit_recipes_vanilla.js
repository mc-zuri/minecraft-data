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
// a recipe of minecraft-data's giving count of id:metadata from that shape (rows) or those ingredients
function gives (recipes, [id, metadata, count], form) {
  return (recipes[id] ?? []).some(r => {
    if (r.result.count !== count || (r.result.metadata ?? 0) !== metadata) return false
    if (form.inShape) {
      return !!r.inShape && r.inShape.length === form.inShape.length &&
        r.inShape.every((row, y) => row.length === form.inShape[y].length && row.every((c, x) => sameCell(form.inShape[y][x], c)))
    }
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
  ], []]
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
    for (const [ingredient, results] of TAKEN) {
      it(`only ${results.join(', ') || 'no recipe'} take${results.length === 1 ? 's' : ''} ${ingredient}`, function () {
        const taking = Object.values(recipes).flat().filter(r => (r.inShape ? r.inShape.flat() : r.ingredients).some(c => c != null && idOf(c) === ingredient))
        assert.deepStrictEqual([...new Set(taking.map(r => r.result.id))].filter(id => !results.includes(id)), [])
      })
    }
  })
}
