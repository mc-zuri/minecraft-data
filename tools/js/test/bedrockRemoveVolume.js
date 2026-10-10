/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock remove volume entity layout', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_remove_volume_entity
    if (!packet) continue
    it(`${dir} preserves the ID and version-specific dimension`, function () {
      const dimension = !['1.17.0', '1.17.10', '1.17.30', '1.17.40', '1.18.0', '1.18.11'].includes(dir.split('/')[1])
      assert.strictEqual(packet[1].find(f => f.name === 'entity_id').type, 'varint64')
      assert.strictEqual(packet[1].some(f => f.name === 'dimension'), dimension)
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      proto.addType('zigzag32', [
        (buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } },
        (value, buffer, offset) => write(encode(value), buffer, offset),
        value => size(encode(value))
      ])
      proto.addType('packet', packet)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile({ packet })
      compiler.addTypes({ Read: { zigzag32: ['native', proto.types.zigzag32[0]] }, Write: { zigzag32: ['native', proto.types.zigzag32[1]] }, SizeOf: { zigzag32: ['native', proto.types.zigzag32[2]] } })
      const compiled = compiler.compileProtoDefSync()
      // Independent wire expectations, including uint32 max and signed
      // dimension boundaries. Boundary probes do not imply valid gameplay IDs.
      for (const [id, idHex, dim, dimHex] of [[0, '00', 0, '00'], [1, '01', 1, '02'], [127, '7f', 2, '04'], [128, '8001', 3, '06'], [4294967295, 'ffffffff0f', -1, '01'], [1000, 'e807', -2147483648, 'ffffffff0f']]) {
        const value = { entity_id: BigInt(id), ...(dimension ? { dimension: dim } : {}) }
        const wire = Buffer.from(idHex + (dimension ? dimHex : ''), 'hex')
        for (const codec of [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('packet', value), wire)
          const parsed = codec.parsePacketBuffer('packet', wire)
          assert.deepStrictEqual(parsed.data, value)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
