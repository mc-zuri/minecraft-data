/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock filtered structure names', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const field = types.packet_structure_block_update?.[1].find(f => f.name === 'filtered_structure_name')
    if (!field) continue
    it(`${dir} preserves version-specific filtered-name presence`, function () {
      const optional = ['1.26.40', '1.26.45', '1.26.51'].some(v => dir.endsWith('/' + v))
      const definitions = { string: types.string, probe: ['container', [field, { name: 'sentinel', type: 'u8' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      for (const text of [...(optional ? [undefined] : []), '', 'mystructure:*****', '构造✓']) {
        const bytes = text === undefined ? undefined : Buffer.from(text)
        const wire = Buffer.concat([...(optional ? [Buffer.from([bytes ? 1 : 0])] : []), ...(bytes ? [Buffer.from([bytes.length]), bytes] : []), Buffer.from([0xa5])])
        const value = { filtered_structure_name: text, sentinel: 0xa5 }
        for (const codec of [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, value)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
