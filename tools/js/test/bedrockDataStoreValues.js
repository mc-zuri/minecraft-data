/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock recursive data store property values', function () {
  for (const version of ['1.26.10', '1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} covers double and nested heterogeneous list/map values`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = Object.fromEntries(['string', 'DataStorePropertyValue', 'DataStoreMapEntry'].map(k => [k, types[k]]))
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const cases = [
        [{ type: 'double', value: -1.5 }, '03000000000000000000f8bf'],
        [{ type: 'list', value: [] }, '0500000000'],
        [{ type: 'list', value: [{ type: 'bool', value: true }, { type: 'double', value: 1.5 }] }, '0500000002010000000103000000000000000000f83f'],
        [{ type: 'map', value: [{ key: 'A', value: { type: 'list', value: [{ type: 'string', value: '✓' }, { type: 'map', value: [] }] } }] }, '0600000001014105000000020400000003e29c930600000000']
      ]
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [data, hex] of cases) {
          const wire = Buffer.from(hex, 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('DataStorePropertyValue', data), wire)
          const parsed = codec.parsePacketBuffer('DataStorePropertyValue', wire)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
