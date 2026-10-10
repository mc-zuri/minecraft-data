/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock legacy boat animation branches', function () {
  for (const version of ['1.17.30', '1.17.40', '1.18.0']) {
    it(`${version} maps rowing IDs 128/129 and includes their float payload`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      // Test the action and its conditional payload directly. Full packets,
      // including runtime IDs, are also checked against exact native exports.
      const definitions = { probe: ['container', types.packet_animate[1].filter(f => f.name !== 'runtime_entity_id')] }
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      const zz = [(buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } }, (value, buffer, offset) => write(encode(value), buffer, offset), value => size(encode(value))]
      proto.addType('zigzag32', zz)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypes({ Read: { zigzag32: ['native', zz[0]] }, Write: { zigzag32: ['native', zz[1]] }, SizeOf: { zigzag32: ['native', zz[2]] } })
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      assert.deepStrictEqual(compiled.createPacketBuffer('probe', { action_id: 'swing_arm' }), Buffer.from('02', 'hex'))
      for (const codec of [proto, compiled]) {
        for (const [data, hex] of [[{ action_id: 'row_right', boat_rowing_time: 1.25 }, '80020000a03f'], [{ action_id: 'row_left', boat_rowing_time: -0.5 }, '8202000000bf']]) {
          const wire = Buffer.from(hex, 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
