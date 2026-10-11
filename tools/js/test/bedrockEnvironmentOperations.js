/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock environment attribute operation strings', function () {
  for (const version of ['1.26.10', '1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} writes required operation strings for boolean and float attributes`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = { string: types.string, AttributeData: types.AttributeData }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const string = value => Buffer.concat([Buffer.from([value.length]), Buffer.from(value)])
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const operation of ['override', 'alpha_blend', 'and', 'nand', 'or', 'nor', 'xor', 'xnor']) {
          const params = { type: 'bool', bool_value: true, bool_operation: operation }
          const wire = Buffer.concat([Buffer.from([0, 1]), string(operation)])
          assert.deepStrictEqual(codec.createPacketBuffer('AttributeData', params), wire)
          const parsed = codec.parsePacketBuffer('AttributeData', wire)
          assert.deepStrictEqual(parsed.data, params)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
        for (const operation of ['override', 'alpha_blend', 'add', 'subtract', 'multiply', 'minimum', 'maximum']) {
          const params = { type: 'float', float_value: 0.75, float_operation: operation, float_constraint_min: undefined, float_constraint_max: undefined }
          const wire = Buffer.concat([Buffer.from('010000403f', 'hex'), string(operation), Buffer.from([0, 0])])
          assert.deepStrictEqual(codec.createPacketBuffer('AttributeData', params), wire)
          const parsed = codec.parsePacketBuffer('AttributeData', wire)
          assert.deepStrictEqual(parsed.data, params)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
