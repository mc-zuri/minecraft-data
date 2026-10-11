/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

// Mojang EntityNetId (network 2193) is compressed uint32. Gophertunnel's
// 5fe8be4677a1dd1033ae5befcc3ff798d224e571 corrects both volume packet IDs.
// Exact readers/writers from 1.17.0 through 1.26.51 truncate overflow IDs.
const values = [[0, '00'], [1, '01'], [127, '7f'], [128, '8001'], [129, '8101'],
  [16383, 'ff7f'], [16384, '808001'], [16385, '818001'], [2097151, 'ffff7f'],
  [2097152, '80808001'], [2097153, '81808001'], [268435455, 'ffffff7f'],
  [268435456, '8080808001'], [268435457, '8180808001'], [0x99abcdef, 'ef9bafcd09'],
  [2147483647, 'ffffffff07'], [2147483648, '8080808008'], [4294967295, 'ffffffff0f']]

describe('Bedrock volume entity IDs are unsigned 32-bit VarInts', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require('../../../data/' + dir + '/protocol.json')
    for (const name of ['packet_add_volume_entity', 'packet_remove_volume_entity']) {
      if (!types[name]) continue
      it(dir + ' ' + name + ' preserves ID values and the following field', function () {
        const field = types[name][1][0]
        assert.ok(['entity_id', 'runtime_id'].includes(field.name))
        assert.strictEqual(field.type, 'varint')
        const packet = ['container', [field, { name: 'sentinel', type: 'u8' }]]
        const proto = new ProtoDef(false), [read, write, size] = proto.types.varint
        const unsigned = (buffer, offset) => { const r = read(buffer, offset); return { value: r.value >>> 0, size: r.size } }
        proto.addType('varint', [unsigned, write, size])
        proto.addType('packet', packet)
        const compiler = new ProtoDefCompiler()
        compiler.addTypes({ Read: { varint: ['native', unsigned] }, Write: { varint: ['native', write] }, SizeOf: { varint: ['native', size] } })
        compiler.addTypesToCompile({ packet })
        for (const codec of [proto, compiler.compileProtoDefSync()]) for (const [id, hex] of values) {
          const raw = Buffer.from(hex + 'a5', 'hex'), expected = { [field.name]: id, sentinel: 0xa5 }
          const parsed = codec.parsePacketBuffer('packet', raw)
          assert.strictEqual(parsed.metadata.size, raw.length)
          assert.deepStrictEqual(parsed.data, expected)
          assert.deepStrictEqual(codec.createPacketBuffer('packet', expected), raw)
        }
      })
    }
  }
})
