/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock environment easing strings', function () {
  for (const version of ['1.26.10', '1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} writes easing by its serialized name`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      // Isolate the field from the independently versioned environment trailer.
      const definitions = { string: types.string, probe: types.EnvironmentAttributeData[1].find(f => f.name === 'ease_type').type }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [name, hex] of [['linear', '066c696e656172'], ['spring', '06737072696e67'], ['in_out_elastic', '0e696e5f6f75745f656c6173746963']]) {
          const wire = Buffer.from(hex, 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', name), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.strictEqual(parsed.data, name)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
