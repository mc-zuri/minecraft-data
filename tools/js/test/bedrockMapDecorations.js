/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

// MapDecoration::Type: shared, stable IDs from the game definitions.
const names = ['marker_white', 'marker_green', 'marker_red', 'marker_blue', 'cross_white', 'triangle_red', 'square_white', 'marker_sign', 'marker_pink', 'marker_orange', 'marker_yellow', 'marker_teal', 'triangle_green', 'small_square_white', 'mansion', 'monument', 'no_draw', 'village_desert', 'village_plains', 'village_savanna', 'village_snowy', 'village_taiga', 'jungle_temple', 'witch_hut']

describe('Bedrock map decoration identifiers', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    if (!types.MapDecoration) continue
    it(`${dir} retains each decoration's original ID`, function () {
      const definitions = { string: types.string, MapDecoration: types.MapDecoration }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      const fixedColor = ['1.26.40', '1.26.45', '1.26.51'].some(v => dir.endsWith('/' + v))
      for (const [id, type] of names.entries()) {
        const value = { type, rotation: 3, x: 127, y: 128, label: 'map', color_abgr: 0x12345678 }
        const wire = Buffer.from([id, 3, 127, 128, 3, 0x6d, 0x61, 0x70, ...(fixedColor ? [0x78, 0x56, 0x34, 0x12] : [0xf8, 0xac, 0xd1, 0x91, 1])])
        for (const codec of [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('MapDecoration', value), wire)
          const parsed = codec.parsePacketBuffer('MapDecoration', wire)
          assert.deepStrictEqual(parsed.data, value)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
