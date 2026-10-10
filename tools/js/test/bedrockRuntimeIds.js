/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock entity runtime ID widths', function () {
  const packets = ['add_player', 'add_entity', 'add_item_entity', 'take_item_entity', 'move_entity', 'entity_event', 'mob_effect', 'mob_equipment', 'mob_armor_equipment', 'interact', 'player_action', 'set_entity_data', 'set_entity_motion', 'respawn', 'show_credits', 'npc_request']
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    if (dir === 'bedrock/0.14' || dir === 'bedrock/0.15') continue
    const { types } = require(`../../../data/${dir}/protocol.json`)
    it(`${dir} preserves full unsigned entity IDs`, function () {
      for (const name of packets) {
        const fieldName = name === 'interact' ? (dir === 'bedrock/1.16.201' ? 'target_runtime_entity_id' : 'target_entity_id') : 'runtime_entity_id'
        const field = types['packet_' + name][1].find(f => f.name === fieldName || (['add_player', 'add_entity'].includes(name) && f.name === 'runtime_id'))
        assert.strictEqual(field.type, 'varint64', name)
        const definitions = { probe: ['container', [field, { name: 'sentinel', type: 'u8' }]] }
        const proto = new ProtoDef(false)
        proto.addTypes(definitions)
        const compiler = new ProtoDefCompiler()
        compiler.addTypesToCompile(definitions)
        const compiled = compiler.compileProtoDefSync()
        for (const [id, hex] of [[0n, '00'], [1n, '01'], [127n, '7f'], [128n, '8001'], [4294967295n, 'ffffffff0f'], [4294967296n, '8080808010'], [9007199254740991n, 'ffffffffffffff0f'], [9007199254740992n, '8080808080808010'], [9007199254740993n, '8180808080808010'], [18446744073709551615n, 'ffffffffffffffffff01']]) {
          const value = { [field.name]: id, sentinel: 0xa5 }
          const wire = Buffer.from(hex + 'a5', 'hex')
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
