/* eslint-env mocha */
const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock HUD byte and signed VarInt version boundary', function () {
  for (const path of [...new Set(Object.values(paths).map(p => p.protocol))].filter(Boolean)) {
    const { types } = require(`../../../data/${path}/protocol.json`)
    if (!types.packet_set_hud) continue
    it(`${path} preserves HUD elements and visibility`, function () {
      const version = path.split('/')[1].split('.').map(Number)
      const signed = version[1] > 21 || (version[1] === 21 && version[2] >= 70)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ Element: types.Element, packet: types.packet_set_hud })
      const codec = compiler.compileProtoDefSync()
      for (const elements of [[], ['PaperDoll'], ['PaperDoll', 'Crosshair', 'HotBar']]) {
        for (const visibility of ['hide', 'reset']) {
          const codes = elements.map(e => ({ PaperDoll: 0, Crosshair: 4, HotBar: 5 })[e])
          const data = { elements, visibility }
          const expected = Buffer.from([elements.length, ...codes.map(n => signed ? n * 2 : n), visibility === 'hide' ? 0 : signed ? 2 : 1])
          assert.deepStrictEqual(codec.createPacketBuffer('packet', data), expected)
          const parsed = codec.parsePacketBuffer('packet', expected)
          assert.strictEqual(parsed.metadata.size, expected.length)
          assert.deepStrictEqual(parsed.data, data)
        }
      }
      // Undeclared enum values are wire diagnostics, not legal gameplay choices.
      if (!signed) {
        const raw = Buffer.from([1, 255, 255])
        const parsed = codec.parsePacketBuffer('packet', raw)
        assert.deepStrictEqual(parsed.data, { elements: [255], visibility: 255 })
        assert.deepStrictEqual(codec.createPacketBuffer('packet', parsed.data), raw)
      }
    })
  }
})
