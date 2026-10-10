/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock experimental gameplay override layout', function () {
  for (const version of [...new Set(Object.values(paths).map(p => p.protocol))].filter(p => /^bedrock\/1\./.test(p))) {
    it(`${version} preserves the version-specific override and following field`, function () {
      const { types } = require(`../../../data/${version}/protocol.json`)
      const field = types.packet_start_game[1].find(f => f.name === 'experimental_gameplay_override')
      const optional = ['bedrock/1.26.40', 'bedrock/1.26.45', 'bedrock/1.26.51'].includes(version)
      const definitions = { probe: ['container', [field, { name: 'sentinel', type: 'lu32' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      // Exact servers before 1.26.40 consume one byte here; their reader/writer
      // rejects or rewrites the present-option form. Preserve that older layout.
      const cases = optional ? [[undefined, '00'], [false, '0100'], [true, '0101']] : [[false, '00'], [true, '01']]
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [value, hex] of cases) {
          const data = { experimental_gameplay_override: value, sentinel: 0x12345678 }
          const wire = Buffer.from(hex + '78563412', 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
