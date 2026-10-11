/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock creative catalogue entry IDs', function () {
  // Gophertunnel cc9a209 minecraft/protocol/creative.go uses Varuint32 for
  // CreativeItemNetworkID, while item.go uses Varint32 for inventory stack IDs.
  // BDS 1.16.201.02's captured catalogue begins with entry ID byte 01, not 02.
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    if (!types.packet_creative_content) continue
    it(`${dir} preserves unsigned catalogue IDs separately from inventory stack IDs`, function () {
      const resolve = type => typeof type === 'string' ? resolve(types[type]) : type
      const items = resolve(types.packet_creative_content[1].find(f => f.name === 'items').type)
      const entry = resolve(items[1].type)
      const field = entry[1].find(f => ['runtime_id', 'stack_id', 'entry_id'].includes(f.name))
      assert.strictEqual(field.type, 'varint')
      if (dir === 'bedrock/1.16.201') assert.strictEqual(types.ItemStack[1][0].type, 'zigzag32')
      const definitions = { probe: ['container', [field, { name: 'sentinel', type: 'u8' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      for (const [id, hex] of [[1, '01'], [127, '7f'], [128, '8001'], [129, '8101']]) {
        const expected = { [field.name]: id, sentinel: 0xa5 }, raw = Buffer.from(hex + 'a5', 'hex')
        for (const codec of [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('probe', expected), raw)
          const decoded = codec.parsePacketBuffer('probe', raw)
          assert.strictEqual(decoded.metadata.size, raw.length)
          assert.deepStrictEqual(decoded.data, expected)
        }
      }
    })
  }
})
