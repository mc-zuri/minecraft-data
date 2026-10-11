/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock guest-without-host disconnect reason', function () {
  // Endstone 0db6185921974b5aba4a30af33a5eed842dd2cb9:
  // Connection::DisconnectFailReason guestwithouthost = 120.
  // Gophertunnel 4e2e0ed: DisconnectReasonGuestWithoutHost, also 120.
  const named = new Set(['1.21.90', '1.21.93', '1.21.100', '1.21.111', '1.21.120', '1.21.124', '1.21.130',
    '1.26.0', '1.26.10', '1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51'])
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    if (!types.DisconnectFailReason) continue
    it(`${dir} preserves reason 120 and its version-scoped name`, function () {
      assert.strictEqual(types.DisconnectFailReason[1].type, 'zigzag32')
      assert.ok(!Object.values(types.DisconnectFailReason[1].mappings).includes('guest_withough_host'))
      if (!named.has(dir.slice('bedrock/'.length))) {
        assert.strictEqual(types.DisconnectFailReason[1].mappings['120'], undefined)
        return
      }
      const reason = 'guest_without_host'
      const proto = new ProtoDef(false), [read, write, size] = proto.types.varint
      const encode = v => ((v << 1) ^ (v >> 31)) >>> 0
      const zz = [
        (buffer, offset) => { const r = read(buffer, offset); return { value: (r.value >>> 1) ^ -(r.value & 1), size: r.size } },
        (value, buffer, offset) => write(encode(value), buffer, offset),
        value => size(encode(value))
      ]
      const definitions = { DisconnectFailReason: types.DisconnectFailReason, probe: ['container', [
        { name: 'reason', type: 'DisconnectFailReason' }, { name: 'sentinel', type: 'u8' }
      ]] }
      proto.addType('zigzag32', zz)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypes({ Read: { zigzag32: ['native', zz[0]] }, Write: { zigzag32: ['native', zz[1]] }, SizeOf: { zigzag32: ['native', zz[2]] } })
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        const raw = Buffer.from('f001a5', 'hex'), expected = { reason, sentinel: 0xa5 }
        assert.deepStrictEqual(codec.createPacketBuffer('probe', expected), raw)
        const decoded = codec.parsePacketBuffer('probe', raw)
        assert.strictEqual(decoded.metadata.size, raw.length)
        assert.deepStrictEqual(decoded.data, expected)
      }
    })
  }
})
