/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock animation expression version', function () {
  for (const version of ['1.17.10', '1.17.30', '1.17.40', '1.18.0']) {
    it(`${version} preserves the fields following the expression version`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = { string: types.string, probe: types.packet_animate_entity }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [expressionVersion, hex] of [[0, '00000000'], [1, '01000000'], [-1, 'ffffffff'], [0x12345678, '78563412'], [2147483647, 'ffffff7f'], [-2147483648, '00000080']]) {
          const data = { animation: 'A', next_state: 'B', stop_condition: 'C', ...(version === '1.17.10' ? {} : { stop_condition_version: expressionVersion }), controller: 'D', blend_out_time: 1.5, runtime_entity_ids: [1n, 128n] }
          const wire = Buffer.from('014101420143' + (version === '1.17.10' ? '' : hex) + '01440000c03f02018001', 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
