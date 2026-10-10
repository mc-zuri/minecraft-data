/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock material reducer output collections', function () {
  for (const version of [...new Set(Object.values(paths).map(p => p.protocol))].filter(p => /^bedrock\/1\./.test(p))) {
    const { types } = require(`../../../data/${version}/protocol.json`)
    if (!types.MaterialReducer) continue
    it(`${version} preserves the output count and every output entry`, function () {
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      const zz = [(buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } }, (value, buffer, offset) => write(encode(value), buffer, offset), value => size(encode(value))]
      proto.addType('zigzag32', zz)
      const definitions = { MaterialReducer: types.MaterialReducer, probe: ['container', [{ name: 'reducers', type: ['array', { countType: 'varint', type: 'MaterialReducer' }] }, { name: 'sentinel', type: 'lu32' }]] }
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypes({ Read: { zigzag32: ['native', zz[0]] }, Write: { zigzag32: ['native', zz[1]] }, SizeOf: { zigzag32: ['native', zz[2]] } })
      compiler.addTypesToCompile(definitions)
      const cases = [
        [[], '00'],
        [[{ mix: 0, items: [] }], '010000'],
        [[{ mix: 0, items: [{ network_id: 0, count: 0 }] }], '0100010000'],
        [[{ mix: 0, items: [] }, { mix: 0, items: [{ network_id: 0, count: 0 }, { network_id: 0, count: 0 }] }], '020000000200000000']
      ]
      // Nonzero signed values also match the recorded education recipes.
      if (types.MaterialReducer[1][0].type === 'zigzag32') cases.push([[{ mix: -1, items: [{ network_id: -27, count: 64 }, { network_id: -12, count: 36 }] }], '0101023580011748'])
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [reducers, hex] of cases) {
          const data = { reducers, sentinel: 0x12345678 }
          const wire = Buffer.from(hex + '78563412', 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
