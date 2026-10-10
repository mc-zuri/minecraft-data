/* eslint-env mocha */
const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock sound update variants', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_clientbound_update_sound_data
    if (!packet || packet[1].some(f => f.name === 'sound_event')) continue
    it(`${dir} encodes seven mandatory tagged updates`, function () {
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ ServerSoundHandle: types.ServerSoundHandle, ...(types.SoundDataUpdate ? { SoundDataUpdate: types.SoundDataUpdate } : {}), probe: packet })
      const codec = compiler.compileProtoDefSync()
      const names = ['stop', 'volume', 'pitch', 'fade', 'seek_to', 'pause', 'resume']
      const cases = [['stop', undefined, '00'], ['set_volume', 0.5, '010000003f'], ['set_pitch', 1.5, '020000c03f'], ['fade', { duration: 2, target_volume: 0.25 }, '03000000400000803e'], ['seek_to', 12.75, '0400004c41'], ['pause', undefined, '05'], ['resume', undefined, '06']]
      for (const [type, value, hex] of cases) {
        const input = { server_sound_handle: 0x0102030405060708n, ...Object.fromEntries(names.map(n => [n, { type, value }])) }
        const wire = Buffer.from('0807060504030201' + hex.repeat(7), 'hex')
        assert.deepStrictEqual(codec.createPacketBuffer('probe', input), wire)
        const parsed = codec.parsePacketBuffer('probe', wire)
        parsed.data.server_sound_handle = BigInt(parsed.data.server_sound_handle)
        assert.deepStrictEqual(parsed.data, input)
        assert.strictEqual(parsed.metadata.size, wire.length)
      }
    })
  }
})
