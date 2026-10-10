/* eslint-env mocha */

const fs = require('fs')
const { join } = require('path')
const assert = require('assert')

describe('audit dataPaths', function () {
  const dataPaths = require('../../../data/dataPaths.json')
  for (const [version, paths] of Object.entries(dataPaths.bedrock)) {
    if (!paths.proto) continue
    it(`Bedrock ${version} selects matching protocol sources`, function () {
      const source = join(__dirname, '../../../data', paths.proto, 'proto.yml')
      const declaredVersion = /^!version: (.+)$/m.exec(fs.readFileSync(source, 'utf8'))[1].trim()
      assert.strictEqual(`bedrock/${declaredVersion}`, paths.protocol, 'building the mapped source must regenerate this protocol')
      assert.strictEqual(paths.types, paths.proto, 'types must match the relative types.yml import')
    })
  }
  it('should have a dataPath for each file', function () {
    require('./version_iterator')(function (p, versionString) {
      const [type, version] = versionString.split(' ')
      const dp = dataPaths[type][version]
      if (fs.existsSync(p)) {
        const files = fs.readdirSync(p).map(f => f.split('.')[0])
        for (const file of files) {
          assert(dp[file], `missing dataPath for ${type} ${version} ${file}`)
        }
      }
    })
  })

  it('dataPath should point to valid files', function () {
    for (const version in dataPaths) {
      for (const type in dataPaths[version]) {
        const dp = dataPaths[version][type]
        for (const file in dp) {
          const path = dp[file]
          const p = join(__dirname, '../../../data/' + path + '/' + file)
          const exists = fs.existsSync(p + '.json') || fs.existsSync(p + '.yml')
          assert(exists, `missing file for ${type} ${version} ${file}, path: ${p}`)
        }
      }
    }
  })
})
