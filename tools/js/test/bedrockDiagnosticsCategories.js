/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock optional diagnostics categories', function () {
  for (const version of ['1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} distinguishes absent, empty and populated system categories`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const fields = types.packet_serverbound_diagnostics[1].slice(-2)
      assert.deepStrictEqual(fields.map(f => f.name), ['system_categories', 'whisker_scopes'])
      const definitions = { string: types.string, SystemCategory: types.SystemCategory, WhiskerScopeDataSummary: types.WhiskerScopeDataSummary, probe: ['container', fields] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [categories, hex] of [[undefined, '0000'], [[], '010000'], [[{ category_name: 'ecs', system_index: 0x0102030405060708n }], '010103656373080706050403020100']]) {
          const data = { system_categories: categories, whisker_scopes: [] }
          const wire = Buffer.from(hex, 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const decoded = codec.parsePacketBuffer('probe', wire)
          assert.strictEqual(decoded.metadata.size, wire.length)
          assert.strictEqual(decoded.data.system_categories?.length, categories?.length)
          if (categories?.length) {
            assert.strictEqual(decoded.data.system_categories[0].category_name, 'ecs')
            assert.strictEqual(BigInt(decoded.data.system_categories[0].system_index), 0x0102030405060708n)
          }
          assert.deepStrictEqual(decoded.data.whisker_scopes, [])
        }
      }
    })
  }
})
