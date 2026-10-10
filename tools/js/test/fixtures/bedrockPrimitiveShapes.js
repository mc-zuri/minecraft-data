const vector = { x: 1, y: 2, z: 3 }
const vec3 = '0000803f0000004000004040'
const vec2 = '0000803f00000040'
const names = ['none', 'arrow', 'text', 'box', 'line', 'sphere', 'cylinder', 'pyramid', 'ellipsoid', 'cone']
const optionalNames = ['type', 'location', 'scale', 'rotation', 'total_time_left', 'max_render_distance', 'color', 'dimension_id', 'attached_to_entity_id']
const optionalValues = ['circle', vector, 0.5, vector, 0.25, 3, -1, -1, -42n]
const optionalHex = ['03', vec3, '0000003f', vec3, '0000803e', '00004040', 'ffffffff', '01', '53']

// Literal wire bytes are independent of the schema serializer. A shape's render
// type and extra-data tag are independent (including an absent render type).
module.exports = function cases (version) {
  const result = []
  const empty = Object.fromEntries(optionalNames.map(name => [name, undefined]))
  function add (id, tag, extra, hex, mask = 0) {
    const shape = { network_id: 1n, ...empty, extra_shape_data_type: names[tag], extra_shape_data: extra }
    const head = optionalNames.map((name, i) => {
      if (!(mask & (1 << i))) return '00'
      shape[name] = optionalValues[i]
      return '01' + optionalHex[i]
    }).join('')
    const wire = Buffer.from('0101' + head + tag.toString(16).padStart(2, '0') + hex, 'hex')
    result.push({ id, params: { shapes: [shape] }, wire })
  }
  result.push({ id: 'empty', params: { shapes: [] }, wire: Buffer.from([0]) })
  for (let mask = 0; mask < 512; mask++) add(`common_${mask}`, 0, undefined, '', mask)
  for (let mask = 0; mask < 16; mask++) {
    const fields = ['end_location', 'arrow_head_length', 'arrow_head_radius', 'segment_count']
    const values = [vector, 0.5, 0.25, 8]
    const bytes = [vec3, '0000003f', '0000803e', '08']
    const extra = Object.fromEntries(fields.map((name, i) => [name, mask & (1 << i) ? values[i] : undefined]))
    add(`arrow_${mask}`, 1, extra, bytes.map((hex, i) => mask & (1 << i) ? '01' + hex : '00').join(''))
  }
  for (let mask = 0; mask < 32; mask++) {
    const [rotate, background, depth, back, textBack] = [0, 1, 2, 3, 4].map(i => !!(mask & (1 << i)))
    // Each boolean is one byte; keep the non-symmetric bit patterns visible.
    const bytes = '03e29c93' + (rotate ? '01' : '00') + (background ? '01ffffffff' : '00') + (version === '1.26.51' ? '00002040' : '') + (depth ? '01' : '00') + (back ? '01' : '00') + (textBack ? '01' : '00')
    add(`text_${mask}`, 2, { text: '✓', use_rotation: rotate, background_color: background ? -1 : undefined, ...(version === '1.26.51' ? { line_gap_height: 2.5 } : {}), depth_test: depth, show_backface: back, show_backface_text: textBack }, bytes)
  }
  add('box', 3, { box_bound: vector }, vec3)
  add('line', 4, { end_location: vector }, vec3)
  add('sphere', 5, { segment_count: 20 }, '14')
  if (version !== '1.26.20') {
    add('cylinder', 6, { radius_x: { x: 1, z: 2 }, radius_z: { x: 1, z: 2 }, height: 3, segment_count: 20 }, vec2 + vec2 + '0000404014')
    add('pyramid_absent', 7, { width: 1, depth: undefined, height: 3 }, '0000803f0000004040')
    add('pyramid_present', 7, { width: 1, depth: 2, height: 3 }, '0000803f010000004000004040')
    add('ellipsoid', 8, { radii: vector, segments_per_axis: 20 }, vec3 + '14')
    add('cone', 9, { radii: { x: 1, z: 2 }, height: 3, segment_count: 20 }, vec2 + '0000404014')
  }
  const mixed = result.filter(c => ['arrow_15', 'text_31', 'box', 'line', 'sphere', 'cylinder', 'pyramid_present', 'ellipsoid', 'cone'].includes(c.id))
  result.push({ id: 'heterogeneous', params: { shapes: mixed.flatMap(c => c.params.shapes) }, wire: Buffer.concat([Buffer.from([mixed.length]), ...mixed.map(c => c.wire.subarray(1))]) })
  return result
}
