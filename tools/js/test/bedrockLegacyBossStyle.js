/* eslint-env mocha */
const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock legacy boss bar appearance', function () {
  for (const version of ['1.16.201', '1.16.210', '1.16.220']) {
    const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
    it(`${version} includes appearance fields in show and property updates`, function () {
      const fields = types.packet_boss_event[1].filter(f => f.name !== 'boss_entity_id')
      const compiler = new ProtoDefCompiler()
      // The anonymous payload contains player-ID alternatives outside these probes.
      compiler.addTypes({ Read: { zigzag64: ['native', () => { throw new Error('unexpected player ID') }] }, Write: { zigzag64: ['native', () => { throw new Error('unexpected player ID') }] }, SizeOf: { zigzag64: ['native', () => { throw new Error('unexpected player ID') }] } })
      compiler.addTypesToCompile({ string: types.string, probe: ['container', [...fields, { name: 'sentinel', type: 'u8' }]] })
      const codec = compiler.compileProtoDefSync()
      const oldNames = version !== '1.16.220'
      for (const [type, tag] of [['show_bar', '00'], ['update_properties', '06']]) {
        for (const darkness of [0, 1]) {
          const value = { type, ...(type === 'show_bar' ? { title: 'Boss', [oldNames ? 'bar_progress' : 'progress']: 0.5 } : {}), [oldNames ? 'darkness_factor' : 'screen_darkening']: darkness, color: 3, overlay: 4, sentinel: 0xa5 }
          const wire = Buffer.from(tag + (type === 'show_bar' ? '04426f73730000003f' : '') + (darkness ? '0100' : '0000') + '0304a5', 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, value)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
