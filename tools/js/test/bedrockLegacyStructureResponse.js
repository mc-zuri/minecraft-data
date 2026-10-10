/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock early structure export responses', function () {
  for (const version of ['1.16.201', '1.16.210', '1.16.220']) {
    it(`${version} retains the response fields and gates NBT on success`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const fields = types.packet_structure_template_data_export_response[1]
      assert.deepStrictEqual(fields.map(f => f.name), ['name', 'success', 'nbt', 'response_type'])
      assert.deepStrictEqual(fields[2].type, ['switch', { compareTo: 'success', fields: { true: 'nbt' } }])
      // Failed responses contain no NBT bytes. Test their complete wire layout
      // without introducing an NBT dependency; successful responses are also
      // checked with the real NBT codec and exact game reader in the corpus.
      const definitions = { string: types.string, probe: ['container', fields.filter(f => f.name !== 'nbt')] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [name, hex] of [['', '00'], ['test', '0474657374'], ['✓', '03e29c93']]) {
          for (const [responseType, id] of [['export', 1], ['query', 2]]) {
            const data = { name, success: false, response_type: responseType }
            const wire = Buffer.concat([Buffer.from(hex + '00', 'hex'), Buffer.from([id])])
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
