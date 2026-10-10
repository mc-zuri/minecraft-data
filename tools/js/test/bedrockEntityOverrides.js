/* eslint-env mocha */
const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock entity property overrides', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const fields = types.packet_player_update_entity_overrides?.[1]
    if (!fields) continue
    it(`${dir} preserves the version-specific action name and payload`, function () {
      const named = ['1.26.40', '1.26.45', '1.26.51'].some(v => dir.endsWith('/' + v))
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ string: types.string, probe: ['container', [...fields.filter(f => !['runtime_id', 'entity_unique_id', 'property_index'].includes(f.name)), { name: 'sentinel', type: 'u8' }]] })
      const codec = compiler.compileProtoDefSync()
      const actions = [['clear_all', 'clearoverrides', undefined, ''], ['remove', 'removeoverride', undefined, ''], ['set_int', 'setintoverride', -12, 'f4ffffff'], ['set_float', 'setfloatoverride', 0.75, '0000403f']]
      for (const [index, [type, name, value, data]] of actions.entries()) {
        const input = { type, ...(named ? { type_name: name } : {}), value, sentinel: 0xa5 }
        const wire = Buffer.concat([Buffer.from([index]), ...(named ? [Buffer.from([name.length]), Buffer.from(name)] : []), Buffer.from(data, 'hex'), Buffer.from([0xa5])])
        assert.deepStrictEqual(codec.createPacketBuffer('probe', input), wire)
        const parsed = codec.parsePacketBuffer('probe', wire)
        assert.deepStrictEqual(parsed.data, input)
        assert.strictEqual(parsed.metadata.size, wire.length)
      }
    })
  }
})
