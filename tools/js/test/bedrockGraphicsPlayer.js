/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock graphics override player field order', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const packet = types.packet_graphics_override_parameter
    if (!packet) continue
    it(`${dir} places an optional player before the parameter ID and reset flag`, function () {
      const hasPlayer = ['1.26.30', '1.26.40', '1.26.45', '1.26.51'].some(v => dir.endsWith('/' + v))
      const fields = packet[1].filter(f => ['biome_identifier', 'player_id', 'parameter_type', 'reset'].includes(f.name))
      assert.strictEqual(fields.some(f => f.name === 'player_id'), hasPlayer)
      const definitions = { string: types.string, GraphicsOverrideParameterType: types.GraphicsOverrideParameterType, probe: ['container', fields] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      for (const [player, playerHex] of [[undefined, '00'], ['', '0100'], ['42', '01023432']]) {
        for (const reset of [false, true]) {
          const input = { biome_identifier: 'minecraft:plains', ...(hasPlayer ? { player_id: player } : {}), parameter_type: 'sky_zenith_color', reset }
          const wire = Buffer.concat([Buffer.from([16]), Buffer.from('minecraft:plains'), Buffer.from(hasPlayer ? playerHex : '', 'hex'), Buffer.from([0, Number(reset)])])
          for (const codec of [proto, compiled]) {
            assert.deepStrictEqual(codec.createPacketBuffer('probe', input), wire)
            const parsed = codec.parsePacketBuffer('probe', wire)
            assert.deepStrictEqual(parsed.data, input)
            assert.strictEqual(parsed.metadata.size, wire.length)
          }
        }
      }
    })
  }
})
