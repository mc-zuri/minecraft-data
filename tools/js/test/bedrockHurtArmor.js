/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock armor damage fields', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    // 0.14/0.15 use a single i8 health field, before the 1.16 format change.
    if (['bedrock/0.14', 'bedrock/0.15'].includes(dir)) continue
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_hurt_armor
    if (!packet) continue
    it(`${dir} preserves its version-specific damage fields`, function () {
      const fields = packet[1].filter(f => f.name !== 'armor_slots')
      assert.deepStrictEqual(fields.map(f => f.name), ['cause', 'damage'])
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      proto.addType('zigzag32', [
        (buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } },
        (value, buffer, offset) => write(encode(value), buffer, offset),
        value => size(encode(value))
      ])
      const definitions = { probe: ['container', fields] }
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      compiler.addTypes({ Read: { zigzag32: ['native', proto.types.zigzag32[0]] }, Write: { zigzag32: ['native', proto.types.zigzag32[1]] }, SizeOf: { zigzag32: ['native', proto.types.zigzag32[2]] } })
      const compiled = compiler.compileProtoDefSync()
      for (const [cause, damage, hex] of [[0, 0, '0000'], [2, 20, '0428'], [26, 1000, '34d00f'], [1, 64, '028001']]) {
        const value = { cause, damage }
        const wire = Buffer.from(hex, 'hex')
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
