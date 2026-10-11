/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock
const atLeast = (version, since) => {
  const a = version.split('.').map(Number), b = since.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]
  return true
}

describe('Bedrock movement effect enum history', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require('../../../data/' + dir + '/protocol.json')
    if (!types.MovementEffectType) continue
    it(dir + ' preserves the version-specific effect names', function () {
      const version = dir.slice('bedrock/'.length)
      const mappings = { '-1': 'invalid', 0: 'GLIDE_BOOST' }
      if (atLeast(version, '1.21.60')) mappings[1] = 'DOLPHIN_BOOST'
      if (atLeast(version, '1.26.30')) mappings[2] = 'GEYSER_BOOST'
      assert.deepStrictEqual(types.MovementEffectType[1].mappings, mappings)
      const selected = { MovementEffectType: types.MovementEffectType, packet: types.packet_movement_effect }
      const proto = new ProtoDef(false)
      proto.addTypes(selected)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(selected)
      for (const codec of [proto, compiler.compileProtoDefSync()]) for (const [value, hex] of [[-1, '01'], [0, '00'], [1, '02'], [2, '04']]) {
        if (!Object.hasOwn(mappings, value)) continue
        const raw = Buffer.from('7f' + hex + '288001', 'hex')
        const parsed = codec.parsePacketBuffer('packet', raw)
        assert.strictEqual(parsed.metadata.size, raw.length)
        assert.strictEqual(parsed.data.effect_type, mappings[value])
        assert.strictEqual(parsed.data.effect_duration, 20)
        assert.strictEqual(parsed.data.tick, 128n)
        assert.deepStrictEqual(codec.createPacketBuffer('packet', parsed.data), raw)
      }
    })
  }
})
