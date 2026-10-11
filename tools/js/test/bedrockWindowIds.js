/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const { varint } = require('protodef/src/datatypes/varint')
const paths = require('../../../data/dataPaths.json').bedrock

// ContainerID is signed int8, promoted to uint32 on this wire path. Keep
// the legacy signed reader aliases as well as the unsigned wire values.
const cases = [
  ['none', 'ffffffff0f'], ['crafting_add_ingredient', 'feffffff0f'],
  ['beacon', 'e8ffffff0f'], ['drop_contents', '9cffffff0f'],
  ['inventory', '00'], ['ui', '7c']
]
describe('Bedrock VarUInt window ID names', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require('../../../data/' + dir + '/protocol.json')
    if (!types.WindowIDVarint) continue
    it(dir + ' preserves names with unsigned and legacy signed readers', function () {
      const packet = ['container', [{ name: 'id', type: types.WindowIDVarint }, { name: 'sentinel', type: 'u8' }]]
      for (const unsigned of [false, true]) {
        const read = (buffer, offset) => {
          const result = varint[0](buffer, offset)
          return { value: unsigned ? result.value >>> 0 : result.value, size: result.size }
        }
        const proto = new ProtoDef(false)
        proto.addType('varint', [read, varint[1], varint[2]])
        proto.addType('packet', packet)
        const compiler = new ProtoDefCompiler()
        compiler.addTypesToCompile({ packet })
        compiler.addTypes({ Read: { varint: ['native', read] }, Write: {}, SizeOf: {} })
        for (const codec of [proto, compiler.compileProtoDefSync()]) for (const [id, hex] of cases) {
          const raw = Buffer.from(hex + 'a5', 'hex'), expected = { id, sentinel: 0xa5 }
          const parsed = codec.parsePacketBuffer('packet', raw)
          assert.strictEqual(parsed.metadata.size, raw.length)
          assert.deepStrictEqual(parsed.data, expected)
          assert.deepStrictEqual(codec.createPacketBuffer('packet', expected), raw)
        }
      }
    })
  }
})
