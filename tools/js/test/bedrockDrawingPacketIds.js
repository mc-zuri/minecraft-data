/* eslint-env mocha */
const assert = require('assert')

describe('Bedrock drawing packet IDs', function () {
  for (const version of ['1.26.10', '1.26.20', '1.26.30', '1.26.40', '1.26.45', '1.26.51']) {
    it(`${version} keeps the debug renderer separate from script shapes`, function () {
      const { types } = require(`../../../data/bedrock/${version}/protocol.json`)
      const fields = types.mcpe_packet[1]
      const names = fields[0].type[1].mappings
      const payloads = fields.find(f => f.name === 'params').type[1].fields
      const shapes = version === '1.26.10' ? 'server_script_debug_drawer' : 'primitive_shapes'
      assert.strictEqual(names[164], 'debug_renderer')
      assert.strictEqual(names[328], shapes)
      assert.strictEqual(payloads.debug_renderer, 'packet_debug_renderer')
      assert.strictEqual(payloads[shapes], `packet_${shapes}`)
      assert.deepStrictEqual(types.packet_debug_renderer[1].map(f => f.name), ['type', 'has_data', 'data'])
    })
  }
})
