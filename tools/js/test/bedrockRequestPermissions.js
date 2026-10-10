/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock requested permission levels', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_request_permissions
    if (!packet) continue
    it(`${dir} reads the requested level as a signed ZigZag enum`, function () {
      const level = packet[1].find(f => f.name === 'permission_level')
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      proto.addType('zigzag32', [
        (buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } },
        (value, buffer, offset) => write(encode(value), buffer, offset),
        value => size(encode(value))
      ])
      const definitions = { PermissionLevel: types.PermissionLevel, probe: ['container', [level, { name: 'flags', type: 'lu16' }]] }
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      compiler.addTypes({ Read: { zigzag32: ['native', proto.types.zigzag32[0]] }, Write: { zigzag32: ['native', proto.types.zigzag32[1]] }, SizeOf: { zigzag32: ['native', proto.types.zigzag32[2]] } })
      const compiled = compiler.compileProtoDefSync()
      for (const [name, hex] of [['visitor', '00'], ['member', '02'], ['operator', '04'], ['custom', '06']]) {
        const value = { permission_level: name, flags: 0x1234 }
        const wire = Buffer.from(hex + '3412', 'hex')
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
