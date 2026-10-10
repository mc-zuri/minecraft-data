/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock early GUI item selection', function () {
  for (const version of ['1.16.201', '1.16.210']) {
    it(`${version} retains both strings and the signed fixed-width slot`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = { string: types.string, probe: types.packet_gui_data_pick_item }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [hotbarSlot, hex] of [[0, '00000000'], [8, '08000000'], [-1, 'ffffffff'], [1000, 'e8030000'], [2147483647, 'ffffff7f'], [-2147483648, '00000080']]) {
          for (const [itemName, effects, prefix] of [['', '', '0000'], ['A', '✓', '014103e29c93'], ['§a', 'B', '03c2a7610142']]) {
            const data = { item_name: itemName, item_effects: effects, hotbar_slot: hotbarSlot }
            const wire = Buffer.from(prefix + hex, 'hex')
            assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
            const parsed = codec.parsePacketBuffer('probe', wire)
            assert.deepStrictEqual(parsed.data, data)
            assert.strictEqual(parsed.metadata.size, wire.length)
          }
        }
      }
    })
  }
})
