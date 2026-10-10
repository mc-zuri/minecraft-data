module.exports = function cases (version) {
  const variant = version === '1.26.10'
  const noise = !['1.26.10', '1.26.20'].includes(version)
  const cases = []
  const settingsCases = []
  for (const [weight, hex] of [[0, '00000000'], [0.75, '0000403f'], [1, '0000803f'], ...(variant ? [['query.time_of_day', '1171756572792e74696d655f6f665f646179']] : [])]) {
    for (let flags = 0; flags < 4; flags++) {
      const enabled = !!(flags & 1)
      const paused = !!(flags & 2)
      const string = typeof weight === 'string'
      const settings = { priority: -5, ...(variant ? string ? { weight_type: 'string', string_weight: weight } : { weight_type: 'float', float_weight: weight } : { weight }), enabled, transitions_paused: paused }
      const bytes = 'fbffffff' + (variant ? string ? '01' : '00' : '') + hex + (enabled ? '01' : '00') + (paused ? '01' : '00')
      settingsCases.push({ settings, bytes })
      cases.push({ id: `settings_${settingsCases.length}`, params: { payload_type: 'update_settings', layer_name: 'layer', dimension_id: 2, settings }, wire: Buffer.from('01056c6179657204' + bytes, 'hex') })
    }
  }
  cases.push({ id: 'layers_empty', params: { payload_type: 'update_layers', layers: [] }, wire: Buffer.from('0000', 'hex') })
  const layers = [0, 1].map(i => ({ name: i ? 'B' : 'A', ...(noise ? { noise_name: i ? 'noise' : undefined } : {}), dimension_id: i, settings: settingsCases[i].settings, environment_attributes: [] }))
  const layerBytes = ['0141' + (noise ? '00' : '') + '00' + settingsCases[0].bytes + '00', '0142' + (noise ? '01056e6f697365' : '') + '02' + settingsCases[1].bytes + '00']
  cases.push({ id: 'layer_single', params: { payload_type: 'update_layers', layers: layers.slice(0, 1) }, wire: Buffer.from('0001' + layerBytes[0], 'hex') })
  cases.push({ id: 'layers_heterogeneous', params: { payload_type: 'update_layers', layers }, wire: Buffer.from('0002' + layerBytes.join(''), 'hex') })
  cases.push({ id: 'environment_empty', params: { payload_type: 'update_environment', layer_name: 'layer', dimension_id: 0, environment_attributes: [] }, wire: Buffer.from('02056c617965720000', 'hex') })
  cases.push({ id: 'remove_empty', params: { payload_type: 'remove_environment', layer_name: 'layer', dimension_id: 0, remove_attribute_names: [] }, wire: Buffer.from('03056c617965720000', 'hex') })
  cases.push({ id: 'remove_multiple', params: { payload_type: 'remove_environment', layer_name: 'layer', dimension_id: 1, remove_attribute_names: ['A', 'B'] }, wire: Buffer.from('03056c61796572020201410142', 'hex') })
  return cases
}
