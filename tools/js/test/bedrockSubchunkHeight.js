/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock subchunk update coordinates', function () {
  for (const version of [...new Set(Object.values(paths).map(p => p.protocol))].filter(p => /^bedrock\/1\./.test(p))) {
    const { types } = require(`../../../data/${version}/protocol.json`)
    if (!types.packet_update_subchunk_blocks) continue
    it(`${version} decodes the actual subchunk height`, function () {
      const [, minor, patch] = version.slice(8).split('.').map(Number)
      const signed = minor > 26 || (minor === 26 && patch >= 10)
      const definitions = { probe: ['container', types.packet_update_subchunk_blocks[1].slice(0, 3)] }
      const proto = new ProtoDef(false)
      const [read, write, size] = proto.types.varint
      const encode = n => ((n << 1) ^ (n >> 31)) >>> 0
      const zz = [(buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } }, (value, buffer, offset) => write(encode(value), buffer, offset), value => size(encode(value))]
      proto.addType('zigzag32', zz)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypes({ Read: { zigzag32: ['native', zz[0]] }, Write: { zigzag32: ['native', zz[1]] }, SizeOf: { zigzag32: ['native', zz[2]] } })
      compiler.addTypesToCompile(definitions)
      const cases = [[0, '00', '00'], [1, '01', '02'], [64, '40', '8001'], [127, '7f', 'fe01'], [128, '8001', '8002'], [319, 'bf02', 'fe04'], [2147483647, 'ffffffff07', 'feffffff0f']]
      if (signed) cases.push([-64, '', '7f'], [-2147483648, '', 'ffffffff0f'])
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        for (const [y, unsignedHex, signedHex] of cases) {
          const data = { x: -123, y, z: 456 }
          const wire = Buffer.from('f501' + (signed ? signedHex : unsignedHex) + '9007', 'hex')
          assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, data)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
