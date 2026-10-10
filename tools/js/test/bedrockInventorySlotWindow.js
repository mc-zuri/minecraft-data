/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock inventory slot window width', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_inventory_slot
    if (!packet) continue
    it(`${dir} reads the slot immediately after the version-specific window ID`, function () {
      const byteWindow = ['1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51'].some(v => dir.endsWith('/' + v))
      const fields = packet[1].filter(f => ['window_id', 'slot'].includes(f.name))
      const definitions = { WindowID: types.WindowID, WindowIDVarint: types.WindowIDVarint, probe: ['container', fields] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      // 1.26.20 switched to a fixed byte. 0xff is the game's default
      // container ID: interpreting it as a VarInt consumes the slot byte.
      const cases = [['inventory', '00'], ['offhand', '77'], ['hotbar', '7a'], ['none', byteWindow ? 'ff' : 'ffffffff0f']]
      for (const [window, hex] of cases) {
        const value = { window_id: window, slot: 128 }
        const wire = Buffer.from(hex + '8001', 'hex')
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
