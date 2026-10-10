/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock clientbound data store variant tags', function () {
  for (const version of ['1.26.10', '1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} uses VarInt tags and preserves fixed-width counters`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = Object.fromEntries(['string', 'DataStorePropertyValue', 'DataStoreMapEntry', 'DataStoreChangeEntry'].map(k => [k, types[k]]))
      definitions.probe = types.packet_clientbound_data_store
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const entries = [
        [{ change_type: 'removal', name: 'A' }, '020141'],
        [{ change_type: 'change', name: 'A', property: 'B', update_count: 0x12345678, new_value: { type: 'bool', value: true } }, '0101410142785634120100000001'],
        [{ change_type: 'update', name: 'A', property: 'B', path: '', data_type: 'double', data: 1.5, update_count: 0x12345678, path_update_count: 0xabcdef01 }, '00014101420000000000000000f83f7856341201efcdab'],
        [{ change_type: 'update', name: 'A', property: 'B', path: '', data_type: 'bool', data: true, update_count: 0x12345678, path_update_count: 0xabcdef01 }, '00014101420001017856341201efcdab'],
        [{ change_type: 'update', name: 'A', property: 'B', path: '', data_type: 'string', data: '✓', update_count: 0x12345678, path_update_count: 0xabcdef01 }, '0001410142000203e29c937856341201efcdab']
      ]
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const group of [[], ...entries.map(e => [e]), entries]) {
          const data = { updates: group.map(e => e[0]) }
          const wire = Buffer.from(group.length.toString(16).padStart(2, '0') + group.map(e => e[1]).join(''), 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
