/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock early clientbound data store update counters', function () {
  for (const version of ['1.21.130', '1.26.0']) {
    it(`${version} preserves unsigned fixed-width update counts`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = Object.fromEntries(['string', 'DataStorePropertyValue', 'DataStoreMapEntry'].map(k => [k, types[k]]))
      definitions.probe = types.packet_clientbound_data_store
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [count, hex] of [[0, '00000000'], [1, '01000000'], [127, '7f000000'], [128, '80000000'], [0x12345678, '78563412'], [0x80000000, '00000080'], [0xfffffffe, 'feffffff']]) {
          const entry = { type: 'update', name: 'A', property: 'B', path: '', data_type: 'bool', data: true, update_count: count }
          if (version === '1.26.0') entry.path_update_count = 0xabcdef01
          const data = { entries: [entry, { type: 'removal', name: 'C' }] }
          const wire = Buffer.from('020001410142000101' + hex + (version === '1.26.0' ? '01efcdab' : '') + '020143', 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
