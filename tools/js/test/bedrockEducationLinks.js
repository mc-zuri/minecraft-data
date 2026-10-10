/* eslint-env mocha */
const assert = require('assert')
const { ProtoDef } = require('protodef')
const { ProtoDefCompiler } = require('protodef').Compiler
const paths = require('../../../data/dataPaths.json').bedrock

describe('Bedrock education external links', function () {
  for (const dir of new Set(Object.values(paths).map(p => p.protocol).filter(Boolean))) {
    const { types } = require(`../../../data/${dir}/protocol.json`)
    const fields = types.packet_education_settings?.[1].filter(f => ['has_external_link_settings', 'external_link_settings'].includes(f.name))
    if (!fields?.length) continue
    it(`${dir} uses one presence flag before the link strings`, function () {
      const definitions = { string: types.string, probe: ['container', [...fields, { name: 'sentinel', type: 'u8' }]] }
      const proto = new ProtoDef(false)
      proto.addTypes(definitions)
      const compiler = new ProtoDefCompiler()
      compiler.addTypesToCompile(definitions)
      const compiled = compiler.compileProtoDefSync()
      const string = value => { const bytes = Buffer.from(value); return Buffer.concat([Buffer.from([bytes.length]), bytes]) }
      for (const link of [undefined, { url: '', display_name: '' }, { url: 'https://example.com/lesson', display_name: 'Lesson 1' }, { url: '', display_name: '§✓' }]) {
        const value = { has_external_link_settings: link !== undefined, external_link_settings: link, sentinel: 0xa5 }
        const wire = Buffer.concat([Buffer.from([Number(link !== undefined)]), ...(link ? [string(link.url), string(link.display_name)] : []), Buffer.from([0xa5])])
        // The compiled Bedrock runtime treats an omitted switch default as
        // void. The interpreted ProtoDef runtime requires an explicit default.
        for (const codec of link === undefined ? [compiled] : [proto, compiled]) {
          assert.deepStrictEqual(codec.createPacketBuffer('probe', value), wire)
          const parsed = codec.parsePacketBuffer('probe', wire)
          assert.deepStrictEqual(parsed.data, value)
          assert.strictEqual(parsed.metadata.size, wire.length)
        }
      }
    })
  }
})
