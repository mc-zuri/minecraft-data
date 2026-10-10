/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock early clientbound data store changes', function () {
  for (const version of ['1.21.130', '1.26.0']) {
    it(`${version} reads dynamic change values after a fixed unsigned counter`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = Object.fromEntries(['string', 'DataStorePropertyValue', 'DataStoreMapEntry'].filter(k => types[k]).map(k => [k, types[k]]))
      definitions.probe = types.packet_clientbound_data_store
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const values = [
        [{ type: 'none', value: undefined }, '00000000'],
        [{ type: 'bool', value: true }, '0100000001'],
        [{ type: 'int64', value: [0x01234567, 0x89abcdef | 0] }, '02000000efcdab8967452301'],
        [{ type: 'double', value: 1.5 }, '03000000000000000000f83f'],
        [{ type: 'string', value: '✓' }, '0400000003e29c93'],
        [{ type: 'list', value: [{ type: 'bool', value: false }, { type: 'map', value: [] }] }, '050000000201000000000600000000'],
        [{ type: 'map', value: [{ key: 'A', value: { type: 'list', value: [] } }] }, '060000000101410500000000']
      ]
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [newValue, hex] of values) {
          const data = { entries: [{ type: 'change', name: 'A', property: 'B', update_count: 0xabcdef01, new_value: newValue }, { type: 'removal', name: 'C' }] }
          const wire = Buffer.from('02010141014201efcdab' + hex + '020143', 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          // ProtoDef returns an Array subclass for fixed-width 64-bit values.
          if (newValue.type === 'int64') parsed.data.entries[0].new_value.value = Array.from(parsed.data.entries[0].new_value.value)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
