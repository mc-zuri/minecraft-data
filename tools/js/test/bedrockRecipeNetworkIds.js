/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock crafting recipe network IDs', function () {
  // Gophertunnel 44101ba recipe.go: Multi, shaped and shapeless recipe writers
  // use Varuint32 for RecipeNetworkID. Ingredient item IDs remain signed.
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    if (!types.Recipes) continue
    const resolve = type => typeof type === 'string' ? resolve(types[type]) : type
    const recipes = resolve(types.Recipes), entry = resolve(recipes[1].type)
    const branch = entry[1].find(f => f.name === 'recipe')
    if (!branch) continue
    for (const [name, type] of Object.entries(resolve(branch.type)[1].fields)) {
      const payload = resolve(type)
      if (!Array.isArray(payload) || payload[0] !== 'container') continue
      const field = payload[1].find(f => f.name === 'network_id')
      if (!field) continue
      it(`${dir} ${name} keeps recipe IDs unsigned`, function () {
        assert.strictEqual(field.type, 'varint')
        const definitions = { probe: ['container', [field, { name: 'sentinel', type: 'u8' }]] }
        const proto = new ProtoDef(false)
        proto.addTypes(definitions)
        const compiler = new ProtoDefCompiler()
        compiler.addTypesToCompile(definitions)
        const compiled = compiler.compileProtoDefSync()
        for (const [id, hex] of [[1, '01'], [127, '7f'], [128, '8001'], [129, '8101'], [1961, 'a90f'], [16383, 'ff7f'], [16384, '808001']]) {
          const expected = { network_id: id, sentinel: 0xa5 }, raw = Buffer.from(hex + 'a5', 'hex')
          for (const codec of [proto, compiled]) {
            assert.deepStrictEqual(codec.createPacketBuffer('probe', expected), raw)
            const decoded = codec.parsePacketBuffer('probe', raw)
            assert.strictEqual(decoded.metadata.size, raw.length)
            assert.deepStrictEqual(decoded.data, expected)
          }
        }
      })
    }
  }
})
