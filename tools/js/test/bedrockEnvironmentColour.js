/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock environment colour components', function () {
  for (const version of ['1.26.10', '1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} preserves four fixed-width colour components before the operation`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = { string: types.string, AttributeData: types.AttributeData }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const params = { type: 'colour', colour_value: [17, 34, 68, 136], colour_operation: 'override' }
      const wire = Buffer.from('0211000000220000004400000088000000086f76657272696465', 'hex')
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        assert.deepStrictEqual(codec.createPacketBuffer('AttributeData', params), wire)
        const parsed = codec.parsePacketBuffer('AttributeData', wire)
        assert.deepStrictEqual(parsed.data, params)
        assert.strictEqual(parsed.metadata.size, wire.length)
      }
    })
  }
})
