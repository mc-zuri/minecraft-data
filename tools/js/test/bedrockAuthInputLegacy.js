/* eslint-env mocha */
const assert = require('assert')
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock auth input legacy transaction rule', function () {
  for (const path of [...new Set(Object.values(paths).map(p => p.protocol))].filter(Boolean)) {
    const { types } = require(`../../../data/${path}/protocol.json`)
    const field = types.packet_player_auth_input?.[1]?.find?.(f => f.name === 'transaction')
    if (!field || field.type[0] !== 'switch') continue
    it(`${path} separates the auth-input legacy condition from ordinary inventory transactions`, function () {
      const legacy = field.type[1].fields.true[1].find(f => f.name === 'legacy')
      assert.strictEqual(legacy.type, 'TransactionLegacyAuthInput')
      assert.deepStrictEqual(types.TransactionLegacyAuthInput, ['container', [
        { name: 'legacy_request_id', type: 'zigzag32' },
        { name: 'legacy_transactions', type: ['legacyTransactionSlots', { requestId: 'legacy_request_id', type: 'LegacyTransactionSlots' }] }
      ]])
      assert.deepStrictEqual(types.LegacyTransactionSlots, ['array', {
        countType: 'varint',
        type: ['container', [
          { name: 'container_id', type: 'u8' },
          { name: 'changed_slots', type: ['array', { countType: 'varint', type: ['container', [{ name: 'slot_id', type: 'u8' }]] }] }
        ]]
      }])
      assert.strictEqual(types.Transaction[1].find(f => f.name === 'legacy').type, 'TransactionLegacy')
      assert.notDeepStrictEqual(types.TransactionLegacy, types.TransactionLegacyAuthInput)
    })
  }
})
