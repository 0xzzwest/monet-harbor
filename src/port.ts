import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const postGeometry = new THREE.CylinderGeometry(1, 1, 1, 6)
const coneGeometry = new THREE.CylinderGeometry(.72, 1, 1, 7)
const headGeometry = new THREE.IcosahedronGeometry(1, 1)
const up = new THREE.Vector3(0, 1, 0)
const from = new THREE.Vector3()
const to = new THREE.Vector3()
const direction = new THREE.Vector3()
const materials = new Map<string, THREE.MeshBasicMaterial>()

function pigment(color: string) {
  let material = materials.get(color)
  if (!material) {
    material = new THREE.MeshBasicMaterial({ color })
    materials.set(color, material)
  }
  return material
}

function shape(group: THREE.Group, geometry: THREE.BufferGeometry, color: string, p: number[], scale: number[]) {
  const mesh = new THREE.Mesh(geometry, pigment(color))
  mesh.position.set(p[0], p[1], p[2])
  mesh.scale.set(scale[0], scale[1], scale[2])
  group.add(mesh)
  return mesh
}

function box(group: THREE.Group, color: string, p: number[], scale: number[]) {
  return shape(group, boxGeometry, color, p, scale)
}

function beam(group: THREE.Group, color: string, start: number[], end: number[], radius: number) {
  from.set(start[0], start[1], start[2])
  to.set(end[0], end[1], end[2])
  direction.subVectors(to, from)
  const length = direction.length()
  const mesh = new THREE.Mesh(postGeometry, pigment(color))
  mesh.position.copy(from).lerp(to, .5)
  mesh.quaternion.setFromUnitVectors(up, direction.divideScalar(length))
  mesh.scale.set(radius, length, radius)
  group.add(mesh)
}

function hull(group: THREE.Group, length: number, width: number, height: number, palette: string[]) {
  const stations = [[-.5, .03, .19], [-.34, .66, .02], [-.17, .92, 0], [.13, 1, 0], [.33, .71, .075], [.5, .015, .42]]
  const rows = stations.map(([x, w, lift]) => [
    [x * length, height * (.07 + lift), -w * width * .5],
    [x * length, height * (-.43 + lift), -w * width * .35],
    [x * length, height * (-.62 + lift), 0],
    [x * length, height * (-.43 + lift), w * width * .35],
    [x * length, height * (.07 + lift), w * width * .5],
  ])
  const faces = palette.map(() => [] as number[])
  for (let s = 0; s < rows.length - 1; s++) {
    const a = rows[s], b = rows[s + 1]
    for (let f = 0; f < 4; f++) {
      const positions = faces[f === 0 || f === 3 ? s % 2 : 2]
      positions.push(...a[f], ...a[f + 1], ...b[f], ...b[f], ...a[f + 1], ...b[f + 1])
    }
    faces[3].push(...a[0], ...b[0], ...a[4], ...b[0], ...b[4], ...a[4])
    beam(group, palette[3], a[0], b[0], height * .105)
    beam(group, palette[3], a[4], b[4], height * .105)
  }
  const ends = [rows[0], rows[rows.length - 1]]
  for (const end of ends) faces[1].push(...end[0], ...end[1], ...end[3], ...end[0], ...end[3], ...end[4])
  faces.forEach((positions, i) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.computeVertexNormals()
    shape(group, geometry, palette[i], [0, 0, 0], [1, 1, 1]).material.side = THREE.DoubleSide
  })
}

function figure(group: THREE.Group, x: number, height: number, lean: number, coat: string) {
  const z = .02
  const torso = shape(group, coneGeometry, coat, [x, height * .38, z], [.29, height * .56, .22])
  torso.rotation.z = lean
  shape(group, headGeometry, '#413534', [x - lean * .37, height * .74, z], [.14, .19, .14])
  shape(group, postGeometry, '#252a2b', [x - lean * .38, height * .84, z], [.21, .064, .19])
  shape(group, coneGeometry, '#303333', [x - lean * .40, height * .89, z], [.14, .16, .12])
  beam(group, coat, [x, height * .53, z - .18], [x + .3, height * .31, z - .33], .09)
  beam(group, coat, [x, height * .53, z + .18], [x + .29, height * .31, z + .30], .095)
}

function rowboat(secondPerson: boolean) {
  const group = new THREE.Group()
  hull(group, 5.6, 1.35, .49, ['#292e32', '#373638', '#24292c', '#464044'])
  box(group, '#3f3c3b', [0, .07, 0], [.27, .11, 1.2])
  figure(group, -.78, 1.76, -.14, '#303333')
  if (secondPerson) figure(group, .74, 1.17, .22, '#39383a')
  beam(group, '#6d5a4d', [-.56, .61, -.42], [.66, -.12, 2.45], .044)
  beam(group, '#463f3d', [.50, -.06, 2.16], [.72, -.138, 2.55], .091)
  const paintShadow = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 3.8), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec2 q = vUv*2.-1.;
        float edge = 1.-smoothstep(.18,1.,length(q));
        float bristle = .62+.38*sin(q.y*47.+sin(q.x*7.)*1.6);
        gl_FragColor = vec4(.12,.16,.18,edge*bristle*.50);
        #include <colorspace_fragment>
      }
    `,
  }))
  paintShadow.rotation.x = -Math.PI / 2
  paintShadow.position.set(.12, -.07, .45)
  group.add(paintShadow)
  return group
}

function sailboat(length: number, height: number, steamship: boolean) {
  const group = new THREE.Group()
  const wood = steamship ? '#4d5058' : '#4e5259'
  const cable = '#666566'
  hull(group, length, length * .23, length * .16, [wood, '#606165', '#474f57', '#656163'])
  for (const x of [-length * .24, length * .15]) {
    const h = height * (x < 0 ? 1 : .86)
    beam(group, wood, [x, 0, 0], [x + 1.05, h, 0], .21)
    beam(group, wood, [x - h * .26, h * .76, 0], [x + h * .35, h * .79, 0], .14)
    beam(group, cable, [-length * .43, 0, .85], [x + 1.05, h - .5, 0], .06)
    beam(group, cable, [length * .43, 0, .45], [x + 1.05, h - .5, 0], .07)
    beam(group, cable, [x - h * .24, h * .76, 0], [x - .75, 0, .9], .06)
  }
  if (steamship) {
    box(group, '#646267', [0, 1.1, 0], [length * .4, 2, length * .14])
    shape(group, coneGeometry, '#535761', [length * .06, 4, 0], [.87, 6.6, .87])
  }
  return group
}

function seeded() {
  let state = 98271
  return () => {
    state = Math.imul(1664525, state) + 1013904223 | 0
    return (state >>> 0) / 4294967296
  }
}

function quayside() {
  const random = seeded()
  const group = new THREE.Group()
  const gray = ['#505864', '#61636b', '#575d67', '#67676c', '#6a686b']
  const mainDocks = [[-106, -137], [-65, -172], [92, -162], [139, -126], [-148, -51], [169, 10]]
  for (const [x, z] of mainDocks) {
    const dock = new THREE.Group()
    dock.position.set(x, 0, z)
    box(dock, '#535d66', [0, -.24, 0], [62, 2.3, 20])
    box(dock, '#77716e', [0, 1.1, 4], [62, .55, 16])
    for (let i = 0; i < 16; i++) {
      const bx = -30 + i * 3.9
      const height = 2.8 + random() * 8.7
      box(dock, gray[i % gray.length], [bx, height * .5, -2 - random() * 6], [2.9 + random() * 6, height, 3.4 + random() * 6])
      beam(dock, '#515761', [bx, -.15, 11.4], [bx, 1.8, 11.4], .3)
    }
    for (let i = 0; i < 4; i++) {
      const bx = -23 + i * 16 + random() * 5
      const h = 11.2 + random() * 12
      const end = bx + (i % 2 ? -1 : 1) * (5 + random() * 8)
      const steel = gray[(i + 2) % gray.length]
      beam(dock, steel, [bx - 1.7, 0, 6], [bx, h, 6], .22)
      beam(dock, steel, [bx + 1.7, 0, 6], [bx, h, 6], .22)
      beam(dock, steel, [bx, h * .66, 6], [end, h * 1.29, 8.4], .28)
      beam(dock, steel, [bx, h * .84, 6], [end, h * 1.29, 8.4], .11)
      beam(dock, steel, [end, h * 1.29, 8.4], [end, h * .51, 8.4], .073)
    }
    for (let i = 0; i < 3; i++) {
      const h = 11 + random() * 16
      const bx = -25 + i * 20 + random() * 11
      shape(dock, coneGeometry, gray[i], [bx, h * .5, -9.8], [.7+random(), h, 1.05])
    }
    group.add(dock)
  }
  for (const [x, z, length, h, angle] of [
    [-75, -101, 31, 29, -.24], [-42, -115, 20, 23, .14], [42, -149, 24, 21, -.17],
    [79, -115, 38, 24, .08], [103, -75, 27, 22, .24], [-101, -59, 23, 20, .84],
    [63, -87, 18, 15, -.23], [25, -115, 14, 14, .15], [106, 54, 24, 16, .48],
  ]) {
    const ship = sailboat(length, h, length > 23)
    ship.position.set(x, .35, z)
    ship.rotation.y = angle
    group.add(ship)
  }
  group.updateMatrixWorld(true)
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>()
  group.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return
    const geometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone()
    geometry.deleteAttribute('uv')
    geometry.applyMatrix4(node.matrixWorld)
    const items = buckets.get(node.material) ?? []
    items.push(geometry)
    buckets.set(node.material, items)
  })
  const port = new THREE.Group()
  for (const [material, items] of buckets) {
    const merged = mergeGeometries(items)
    if (merged) port.add(new THREE.Mesh(merged, material))
    items.forEach((geometry) => geometry.dispose())
  }
  return port
}

export function buildHarbor(scene: THREE.Scene) {
  scene.add(quayside())
  const boats = [
    { x: 6.3, z: 10, angle: -.12, scale: 1.13, two: true },
    { x: 24, z: -20, angle: .49, scale: .93, two: false },
    { x: 18, z: -36, angle: -.11, scale: 1, two: true },
    { x: -25, z: -44, angle: .48, scale: .8, two: false },
    { x: -31, z: -67, angle: -.61, scale: .91, two: false },
    { x: 48, z: -60, angle: .27, scale: .93, two: true },
    { x: -53, z: 46, angle: .6, scale: 1.08, two: true },
  ].map((config) => {
    const boat = rowboat(config.two)
    boat.position.set(config.x, .18, config.z)
    boat.rotation.y = config.angle
    boat.scale.setScalar(config.scale)
    scene.add(boat)
    return boat
  })

  return (seconds: number) => {
    boats.forEach((boat, i) => {
      boat.position.y = .17 + .066 * Math.sin(seconds * .97 + i * 1.3)
      boat.rotation.z = .025 * Math.cos(seconds * .75 + i)
      boat.rotation.x = .035 * Math.sin(seconds * .83 + i * .79)
    })
  }
}
