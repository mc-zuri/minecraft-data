/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock movement effect signed compression', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require('../../../data/' + dir + '/protocol.json')
    if (!types.packet_movement_effect) continue
    it(dir + ' reads signed effect and duration without changing the following tick', function () {
      assert.strictEqual(types.MovementEffectType[1].type, 'zigzag32')
      assert.strictEqual(types.packet_movement_effect[1].find(f => f.name === 'effect_duration').type, 'zigzag32')
      const selected = { MovementEffectType: types.MovementEffectType, packet: types.packet_movement_effect }
      const proto = new ProtoDef(false)
      proto.addTypes(selected)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(selected)
      for (const codec of [proto, compiler.compileProtoDefSync()]) for (const [duration, hex] of [[20, '28'], [63, '7e'], [64, '8001'], [8192, '808001'], [-1, '01'], [2147483647, 'feffffff0f'], [-2147483648, 'ffffffff0f']]) {
        const raw = Buffer.from('7f01' + hex + '8001', 'hex')
        const parsed = codec.parsePacketBuffer('packet', raw)
        assert.strictEqual(parsed.metadata.size, raw.length)
        assert.strictEqual(parsed.data.effect_type, 'invalid')
        assert.strictEqual(parsed.data.effect_duration, duration)
        assert.strictEqual(parsed.data.tick, 128n)
        assert.deepStrictEqual(codec.createPacketBuffer('packet', parsed.data), raw)
      }
    })
  }
})
