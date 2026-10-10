/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock command request versions', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    if (!types.packet_command_request) continue
    const version = types.packet_command_request[1].find(f => f.name === 'version')
    if (!version) continue // Before 1.19.60 the packet has no command version.
    it(`${dir} preserves the command version's wire value`, function () {
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      proto.addType('zigzag32', [
        (buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } },
        (value, buffer, offset) => write(encode(value), buffer, offset),
        value => size(encode(value))
      ])
      proto.addType('string', types.string)
      proto.addType('version', version.type)
      // Game-written mVersion=1 is 02 in 1.19.60--1.21.124. From
      // 1.21.130 the enum is a lowercase string (latest, initial, ...).
      // Numeric extremes below test the wire codec, not gameplay validity.
      const textOrigin = types.CommandOrigin[1].find(f => f.name === 'type').type === 'string'
      const cases = textOrigin
        ? [['latest', '066c6174657374'], ['initial', '07696e697469616c']]
        : [[1, '02'], [33, '42'], [44, '58'], [-1, '01'], [63, '7e'], [64, '8001'], [-64, '7f'], [-65, '8101'], [2147483647, 'feffffff0f'], [-2147483648, 'ffffffff0f']]
      for (const [value, hex] of cases) {
        const bytes = Buffer.from(hex, 'hex')
        assert.deepStrictEqual(proto.createPacketBuffer('version', value), bytes)
        const decoded = proto.parsePacketBuffer('version', bytes)
        assert.strictEqual(decoded.data, value)
        assert.strictEqual(decoded.metadata.size, bytes.length)
      }
    })
  }
})
