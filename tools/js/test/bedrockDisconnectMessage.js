/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock conditional disconnect messages', function () {
  for (const version of [...new Set(Object.values(paths).map(p => p.protocol))].filter(p => /^bedrock\/1\./.test(p))) {
    it(`${version} omits messages when the disconnection screen is hidden`, function () {
      const { types } = require(`../../../data/${version}/protocol.json`)
      const packet = types.packet_disconnect
      const reason = packet[1].some(f => f.name === 'reason')
      const filtered = JSON.stringify(packet).includes('filtered_message')
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      const zz = [(buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } }, (value, buffer, offset) => write(encode(value), buffer, offset), value => size(encode(value))]
      proto.addType('zigzag32', zz)
      const definitions = { string: types.string, ...(reason ? { DisconnectFailReason: types.DisconnectFailReason } : {}), probe: packet }
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypes({ Read: { zigzag32: ['native', zz[0]] }, Write: { zigzag32: ['native', zz[1]] }, SizeOf: { zigzag32: ['native', zz[2]] } })
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const hidden of [false, true]) {
          for (const [message, hex] of [['', '00'], ['✓', '03e29c93'], ['A', '0141']]) {
            const data = { ...(reason ? { reason: 'unknown' } : {}), hide_disconnect_reason: hidden, ...(!hidden ? { message, ...(filtered ? { filtered_message: 'B' } : {}) } : {}) }
            const wire = Buffer.from((reason ? '00' : '') + (hidden ? '01' : '00' + hex + (filtered ? '0142' : '')), 'hex')
            assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
            const parsed = codec.parsePacketBuffer('probe', wire)
            assert.deepStrictEqual(parsed.data, data)
            assert.strictEqual(parsed.metadata.size, wire.length)
          }
        }
      }
    })
  }
})
