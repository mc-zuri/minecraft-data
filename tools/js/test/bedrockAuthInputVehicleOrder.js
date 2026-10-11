/* eslint-env mocha */
const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock auth input block actions before vehicle data', function () {
  for (const path of [...new Set(Object.values(paths).map(p => p.protocol))].filter(Boolean)) {
    const { types } = require(`../../../data/${path}/protocol.json`)
    const fields = types.packet_player_auth_input?.[1]
    if (!Array.isArray(fields)) continue
    const selected = fields.filter(f => f.name === 'block_action' || f.type?.[1]?.compareTo === 'input_data.client_predicted_vehicle')
    if (selected.length !== 2) continue
    it(`${path} preserves combined block and vehicle payloads`, function () {
      const definitions = {
        Action: types.Action,
        vec3i: types.vec3i,
        vec2f: types.vec2f,
        probe: ['container', [
          { name: 'input_data', type: ['container', [{ name: 'client_predicted_vehicle', type: 'bool' }, { name: 'block_action', type: 'bool' }]] },
          ...selected,
          { name: 'sentinel', type: 'u8' }
        ]]
      }
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const codec = compiler.compileProtoDefSync()
      const rotation = selected.some(f => f.anon)
      for (const vehicle of [false, true]) {
        for (const block of [false, true]) {
          for (const populated of [false, true]) {
            const data = { input_data: { client_predicted_vehicle: vehicle, block_action: block }, sentinel: 254 }
            if (block) data.block_action = populated ? [{ action: 'start_break', position: { x: 1, y: 2, z: 3 }, face: 1 }] : []
            if (vehicle) {
              data.predicted_vehicle = -4n
              if (rotation) data.vehicle_rotation = { x: 10, z: -20 }
            }
            const wire = Buffer.concat([Buffer.from([Number(vehicle), Number(block)]), Buffer.from(block ? populated ? '020002040602' : '00' : '', 'hex'), Buffer.from(vehicle ? (rotation ? '000020410000a0c1' : '') + '07' : '', 'hex'), Buffer.from([254])])
            assert.deepStrictEqual(codec.createPacketBuffer('probe', data), wire)
            const parsed = codec.parsePacketBuffer('probe', wire)
            assert.strictEqual(parsed.metadata.size, wire.length)
            assert.strictEqual(parsed.data.sentinel, 254)
            if (vehicle) assert.strictEqual(BigInt(parsed.data.predicted_vehicle), -4n)
            if (block) assert.deepStrictEqual(parsed.data.block_action, data.block_action)
          }
        }
      }
    })
  }
})
