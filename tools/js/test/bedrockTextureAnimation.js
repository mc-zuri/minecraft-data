/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock texture animation effect IDs', function () {
  for (const version of ['1.16.201', '1.16.210', '1.16.220']) {
    it(`${version} reads the unsigned four-byte effect ID`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = { probe: types.packet_on_screen_texture_animation }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [animationType, hex] of [[0, '00000000'], [1, '01000000'], [255, 'ff000000'], [256, '00010000'], [0x12345678, '78563412'], [2147483647, 'ffffff7f'], [2147483648, '00000080'], [4294967295, 'ffffffff']]) {
          const data = { animation_type: animationType }
          const wire = Buffer.from(hex, 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
