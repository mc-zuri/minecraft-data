/* eslint-env mocha */
const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock early movement correction types', function () {
  for (const version of ['1.20.50', '1.20.61', '1.20.71', '1.20.80']) {
    const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
    it(`${version} places the prediction type at the version-specific position`, function () {
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ vec2f: types.vec2f, vec3f: types.vec3f, probe: types.packet_correct_player_move_prediction })
      const codec = compiler.compileProtoDefSync()
      const old = version === '1.20.50'
      const prefix = version === '1.20.80'
      for (const type of old ? ['player'] : ['player', 'vehicle']) {
        const value = { ...(old ? {} : { prediction_type: type }), position: { x: 1, y: 64, z: -2 }, delta: { x: 0, y: 0.5, z: 0 }, ...(prefix ? { vehicle_rotation: type === 'vehicle' ? { x: 45, z: -90 } : undefined } : {}), on_ground: true, tick: 128n }
        const tag = type === 'player' ? '00' : '01'
        const wire = Buffer.from((prefix ? tag : '') + '0000803f00008042000000c0000000000000003f00000000' + (prefix && type === 'vehicle' ? '000034420000b4c2' : '') + '018001' + (!old && !prefix ? tag : ''), 'hex')
        assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
        const parsed = codec.parsePacketBuffer('probe', wire)
        assert.deepStrictEqual(parsed.data, value)
        assert.strictEqual(parsed.metadata.size, wire.length)
      }
    })
  }
})
