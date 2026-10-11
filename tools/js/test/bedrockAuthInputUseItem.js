/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler

describe('Bedrock 1.26.30 auth-input item use retains its older layout', function () {
  for (const version of ['1.26.20', '1.26.30']) {
    it(`${version} keeps action, trigger, face and held-item encodings`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const transaction = types.packet_player_auth_input[1].find(f => f.name === 'transaction').type[1].fields.true[1]
      const fields = types[transaction.find(f => f.name === 'data').type][1]
      assert.strictEqual(fields.find(f => f.name === 'held_item').type, 'Item')
      const definitions = { probe: ['container', fields], BlockCoordinates: types.BlockCoordinates, vec3f: types.vec3f, Item: 'zigzag32' }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      for (const codec of [proto, compiler.compileProtoDefSync()]) {
        const data = { action_type: 'click_air', trigger_type: 'player_input', block_position: { x: 0, y: 0, z: 0 }, face: -1, hotbar_slot: 0, held_item: 0, player_pos: { x: 0, y: 0, z: 0 }, click_pos: { x: 0, y: 0, z: 0 }, block_runtime_id: 0, client_prediction: 'success', client_cooldown_state: 'off' }
        // Empty held item is exactly one zero byte. Full Item codecs are also
        // tested against the game by the independent packet probes.
        const raw = Buffer.concat([Buffer.from('0101000000010000', 'hex'), Buffer.alloc(24), Buffer.from('000100', 'hex')])
        assert.deepStrictEqual(codec.createPacketBuffer('probe', data), raw)
        const decoded = codec.parsePacketBuffer('probe', raw)
        assert.strictEqual(decoded.metadata.size, raw.length)
        assert.deepStrictEqual(decoded.data, data)
      }
    })
  }
})
