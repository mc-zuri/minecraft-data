/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock editor network payloads', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_editor_network
    if (!packet) continue
    it(`${dir} uses the version-specific editor payload`, function () {
      const modern = ['1.26.10', '1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51'].some(v => dir.endsWith('/' + v))
      if (!modern) {
        assert.strictEqual(packet[1].find(f => f.name === 'payload').type, 'nbt')
        return
      }
      const definitions = { string: types.string, probe: packet }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      for (const route of [false, true]) {
        for (const [name, data, hex] of [['', '', '0000'], ['hello', '', '0568656c6c6f00'], ['', '{}', '00027b7d'], ['地图', '✓', '06e59cb0e59bbe03e29c93']]) {
          const value = { route_to_manager: route, raw_variant_name: name, raw_variant_data: data }
          const wire = Buffer.concat([Buffer.from([Number(route)]), Buffer.from(hex, 'hex')])
          for (const codec of [proto, compiled]) {
            assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
            const parsed = codec.parsePacketBuffer('probe', wire)
            assert.deepStrictEqual(parsed.data, value)
            assert.strictEqual(parsed.metadata.size, wire.length)
          }
        }
      }
    })
  }
})
