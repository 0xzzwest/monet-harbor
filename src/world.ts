import * as THREE from 'three'
import type { Chapter } from './chapters'
import { buildHarbor } from './port'
import { noise, skyVertex, skyFragment, waterVertex, waterFragment } from './pigment'

const flightKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyC'])

export async function createWorld(host: HTMLElement, stage: HTMLElement, onManual: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.45))
  const camera = new THREE.PerspectiveCamera(55, 1, .14, 750)
  camera.rotation.order = 'YXZ'
  const scene = new THREE.Scene()
  const fog = new THREE.FogExp2('#9f9b97', .009)
  scene.fog = fog
  let canvas: THREE.Texture
  try {
    canvas = await new THREE.TextureLoader().loadAsync(import.meta.env.BASE_URL + 'sky.webp')
  } catch (error) {
    renderer.dispose()
    throw error
  }
  canvas.colorSpace = THREE.SRGBColorSpace
  canvas.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
  const palette = {
    uCanvas: { value: canvas },
    uTime: { value: 0 },
    uSun: { value: new THREE.Vector3(.38, .163, -1).normalize() },
    uMist: { value: new THREE.Color() },
    uTint: { value: new THREE.Color() },
    uWater: { value: new THREE.Color() },
    uAmber: { value: new THREE.Color() },
    uWarmth: { value: 1 },
    uAccent: { value: 0 },
    uHaze: { value: .6 },
  }
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(520, 32, 20),
    new THREE.ShaderMaterial({ uniforms: palette, vertexShader: skyVertex, fragmentShader: skyFragment, side: THREE.BackSide, depthWrite: false }),
  )
  sky.renderOrder = -10
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1100, 1100, 160, 160).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ uniforms: palette, vertexShader: waterVertex, fragmentShader: waterFragment }),
  )
  scene.add(sky, water)
  const animateBoats = buildHarbor(scene)

  const vaporGeometry = new THREE.PlaneGeometry(1, 1)
  const vapor = [
    [-53, 6.7, -59, 82, 11], [91, 8.5, -126, 131, 20], [-95, 11, -141, 106, 22],
    [1, 5.3, -107, 100, 15], [32, 2.9, -47, 77, 8], [-51, 5.2, -35, 57, 10],
  ].map(([x, y, z, w, h], i) => {
    const material = new THREE.ShaderMaterial({
      uniforms: { ...palette, uSeed: { value: i * 2.71 } },
      depthWrite: false, transparent: true, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `
        uniform vec3 uMist;
        uniform float uHaze;
        uniform float uTime;
        uniform float uSeed;
        varying vec2 vUv;
        ${noise}
        void main() {
          vec2 q = (vUv-.5)*2.;
          float weather = grain(vec2(q.x*5.-uTime*.021+uSeed,q.y*2.+uSeed));
          float fade = 1.-smoothstep(.13,1.,length(vec2(q.x,q.y+(weather-.5)*.26)));
          float vapor = fade*fade*(.39+weather*.61);
          gl_FragColor = vec4(uMist, vapor*(.22+.37*uHaze));
          #include <colorspace_fragment>
        }
      `,
    })
    const mesh = new THREE.Mesh(vaporGeometry, material)
    mesh.position.set(x, y, z)
    mesh.scale.set(w, h, 1)
    mesh.rotation.y = (i - 2) * .1
    scene.add(mesh)
    return { mesh, x }
  })

  const keys = new Set<string>()
  const activeTouches = new Map<number, string>()
  let dragPointer: number | undefined
  let dragX = 0
  let dragY = 0
  let yaw = 0
  let pitch = 0
  let dirty = true
  let drawnTime = -1
  let drawnPulse = -1
  let previousFrame = performance.now()
  const move = new THREE.Vector3()
  const forward = new THREE.Vector3()
  const right = new THREE.Vector3()
  const down = (code: string) => keys.has(code) || Array.from(activeTouches.values()).includes(code)

  function resize() {
    const { clientWidth: width, clientHeight: height } = host
    if (width < 1 || height < 1) return
    camera.aspect = width / height
    camera.fov = camera.aspect > 1.64 ? 48 : 54
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    dirty = true
  }
  host.append(renderer.domElement)
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  function setView(chapter: Chapter) {
    camera.position.set(...chapter.view.position)
    yaw = chapter.view.yaw
    pitch = chapter.view.pitch
    dirty = true
  }

  function setChapter(chapter: Chapter) {
    palette.uMist.value.set(chapter.mist)
    palette.uWater.value.set(chapter.water)
    palette.uTint.value.set(chapter.tint)
    palette.uAmber.value.set(chapter.amber)
    palette.uWarmth.value = chapter.warmth
    palette.uHaze.value = chapter.haze
    fog.color.copy(palette.uMist.value)
    fog.density = .0065 + chapter.haze * .005
    dirty = true
  }

  function render(now: number, time: number, pulse: number) {
    const dt = Math.min(.06, (now - previousFrame) / 1000)
    previousFrame = now
    move.set(0, 0, 0)
    if (keys.size || activeTouches.size) {
      forward.set(-Math.sin(yaw), 0, -Math.cos(yaw))
      right.set(Math.cos(yaw), 0, -Math.sin(yaw))
      move.addScaledVector(forward, Number(down('KeyW') || down('ArrowUp')) - Number(down('KeyS') || down('ArrowDown')))
      move.addScaledVector(right, Number(down('KeyD') || down('ArrowRight')) - Number(down('KeyA') || down('ArrowLeft')))
      move.y = Number(down('Space')) - Number(down('KeyC'))
      camera.position.addScaledVector(move.normalize(), dt * 13)
      camera.position.clampScalar(-211, 211)
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, .85, 70)
      dirty = true
    }
    if (!dirty && time === drawnTime && pulse === drawnPulse) return
    drawnTime = time
    drawnPulse = pulse
    dirty = false
    sky.position.copy(camera.position)
    camera.rotation.set(pitch, yaw, 0)
    palette.uTime.value = time
    palette.uAccent.value = pulse
    animateBoats(time)
    vapor.forEach(({ mesh, x }, i) => { mesh.position.x = x + 4.3 * Math.sin(time * .13 + i) })
    renderer.render(scene, camera)
  }

  function clearInput() {
    keys.clear()
    activeTouches.clear()
    dragPointer = undefined
    stage.classList.remove('is-dragging')
  }
  window.addEventListener('blur', clearInput)
  window.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !flightKeys.has(event.code)) return
    if (event.target instanceof HTMLElement) {
      if (event.target.closest('input, textarea, dialog, [contenteditable]')) return
      if (event.code === 'Space' && event.target.closest('button, a')) return
    }
    if (!stage.classList.contains('is-flying') || document.querySelector('dialog[open]')) return
    event.preventDefault()
    keys.add(event.code)
    onManual()
  })
  window.addEventListener('keyup', (event) => keys.delete(event.code))
  host.addEventListener('pointerdown', (event) => {
    if (dragPointer !== undefined || event.button !== 0) return
    dragPointer = event.pointerId
    dragX = event.clientX
    dragY = event.clientY
    host.setPointerCapture(event.pointerId)
    host.focus({ preventScroll: true })
    stage.classList.add('is-dragging')
    onManual()
  })
  host.addEventListener('pointermove', (event) => {
    if (dragPointer !== event.pointerId) return
    yaw -= (event.clientX - dragX) * .0031
    pitch = THREE.MathUtils.clamp(pitch - (event.clientY - dragY) * .0031, -1.36, 1.33)
    dragX = event.clientX
    dragY = event.clientY
    dirty = true
  })
  host.addEventListener('lostpointercapture', () => {
    dragPointer = undefined
    stage.classList.remove('is-dragging')
  })
  stage.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      const code = button.dataset.key
      if (!code) return
      event.preventDefault()
      button.setPointerCapture(event.pointerId)
      activeTouches.set(event.pointerId, code)
      onManual()
    })
    button.addEventListener('lostpointercapture', (event) => activeTouches.delete(event.pointerId))
  })

  return { render, setView, setChapter, clearInput, canvas: renderer.domElement }
}
