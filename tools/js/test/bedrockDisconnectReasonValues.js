/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

// Mojang d7117467, 7d1acc3b and 7573d190 html/enums.html (networks 827, 859, 893).
// Endstone f181ebcd / 1d73c1aa: networks 975 / 1001.
// Names and literal ZigZag bytes are frozen independently of the schema.
const reasons = [
  [122,"nethernet_data_channel_closed","f401","1.21.100"],
  [123,"discovery_environment_mismatch","f601","1.21.120"],
  [124,"host_without_keys","f801","1.21.120"],
  [125,"host_signed_out","fa01","1.21.130"],
  [126,"script_watchdog_exception","fc01","1.21.130"],
  [127,"script_memory_limit_exceeded","fe01","1.21.130"],
  [128,"storage_low_during_gameplay","8002","1.21.130"],
  [129,"storage_full_during_gameplay","8202","1.21.130"],
  [130,"level_storage_corruption","8402","1.21.130"],
  [131,"edition_mismatch_vanilla_to_edu","8602","1.21.130"],
  [132,"edition_mismatch_edu_to_vanilla","8802","1.21.130"],
  [133,"editor_mismatch_editor_to_vanilla","8a02","1.21.130"],
  [134,"editor_mismatch_vanilla_to_editor","8c02","1.21.130"],
  [135,"deny_listed","8e02","1.21.130"],
  [136,"nonce_missing","9002","1.26.20"],
  [137,"nonce_not_found","9202","1.26.20"],
  [138,"nonce_expired","9402","1.26.20"],
  [139,"nonce_not_valid","9602","1.26.20"],
  [140,"host_disconnected","9802","1.26.30"],
  [141,"editor_join_intent_policy_failure","9a02","1.26.30"]
]
const compare = (a, b) => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]
  return 0
}
describe('Bedrock disconnect reason numeric assignments', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require('../../../data/' + dir + '/protocol.json')
    if (!types.DisconnectFailReason) continue
    it(dir + ' retains documented reason IDs and introduction boundaries', function () {
      const version = dir.slice('bedrock/'.length)
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
      const codecs = [proto, compiler.compileProtoDefSync()]
      for (const [number, reason, hex, since] of reasons) {
        if (compare(version, since) < 0) {
          assert.strictEqual(types.DisconnectFailReason[1].mappings[number], undefined)
          continue
        }
        assert.strictEqual(types.DisconnectFailReason[1].mappings[number], reason)
        for (const codec of codecs) {
          const raw = Buffer.from(hex + 'a5', 'hex'), expected = { reason, sentinel: 0xa5 }
          assert.deepStrictEqual(codec.createPacketBuffer('probe', expected), raw)
          const decoded = codec.parsePacketBuffer('probe', raw)
          assert.strictEqual(decoded.metadata.size, raw.length)
          assert.deepStrictEqual(decoded.data, expected)
        }
      }
    })
  }
})
