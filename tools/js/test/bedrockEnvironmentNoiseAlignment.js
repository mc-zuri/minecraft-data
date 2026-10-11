/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock environment noise alignment', function () {
  for (const version of ['1.26.10', '1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} consumes exactly the version-specific environment trailer`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const definitions = Object.fromEntries(['string', 'AttributeData', 'EnvironmentAttributeData'].map(k => [k, types[k]]))
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const noise = !['1.26.10', '1.26.20'].includes(version)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [value, hex] of [[0, '00'], [127, '7f'], [128, '8001'], [16384, '808001']]) {
          const params = { attribute_name: 'attr', from_attribute: undefined,
            attribute: { type: 'bool', bool_value: true, bool_operation: 'override' }, to_attribute: undefined,
            current_transition_ticks: 3, total_transition_ticks: 200, ease_type: 'linear',
            ...(noise ? { local_transition_ticks: 17, noise_transition: true } : {}),
            ...(version === '1.26.51' ? { noise_alignment: { type: 'min_local_transition_end', value } } : {}) }
          const wire = Buffer.from('0461747472000001086f766572726964650003000000c8000000066c696e656172' + (noise ? '1100000001' : '') + (version === '1.26.51' ? '00' + hex : ''), 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('EnvironmentAttributeData', params), wire)
          const parsed = codec.parsePacketBuffer('EnvironmentAttributeData', wire)
          assert.deepStrictEqual(parsed.data, params)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
