import './style.css'
import scoreMap from './beats.json'
import { chapters } from './chapters'
import { indexAt, clock } from './timing'
import { drawIcon, icons } from './icons'
import type { createWorld } from './world'

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const stage = element('stage')
const host = element('world')
const audio = element<HTMLAudioElement>('score')
const enter = element<HTMLButtonElement>('enter')
const player = element<HTMLButtonElement>('play')
const sound = element<HTMLButtonElement>('sound')
const seek = element<HTMLInputElement>('seek')
const mode = element<HTMLButtonElement>('mode')
const progress = element('progress')
const chapterLabel = element('flight-chapter')
const stageError = element('stage-error')
const guide = element<HTMLDialogElement>('guide')
const timeLabel = element('current')
const exitFullscreen = element<HTMLButtonElement>('exit-fullscreen')
const fullscreen = element<HTMLButtonElement>('fullscreen')
const beatDots = [...element('beat-pattern').children]

for (const slot of document.querySelectorAll<HTMLElement>('i[data-icon]')) {
  const name = slot.dataset.icon as keyof typeof icons
  if (name in icons) drawIcon(slot, name)
}

const { bpm, downbeats, duration } = scoreMap
const beatDuration = 60 / bpm
const chapterTimes = chapters.map(({ downbeat }) => downbeat === null ? 0 : downbeats[downbeat])
const cueSet = new Set(chapterTimes)
element('bpm').textContent = bpm.toFixed(2)
for (const time of downbeats) {
  const tick = document.createElement('span')
  tick.style.left = `${time / duration * 100}%`
  tick.classList.toggle('cue', cueSet.has(time))
  element('beat-ticks').append(tick)
}

const chapterButtons = chapters.map((chapter, i) => {
  const button = document.createElement('button')
  const time = document.createElement('time')
  button.className = 'chapter'
  button.type = 'button'
  time.textContent = clock(chapterTimes[i], i !== 0)
  button.append(chapter.name, time)
  button.addEventListener('click', () => {
    seekTo(chapterTimes[i])
    void startFlight(false)
  })
  element('chapters').append(button)
  return button
})

let world: Awaited<ReturnType<typeof createWorld>> | undefined
let loading: Promise<void> | undefined
let chapterIndex = -1
let barIndex = -2
let dotIndex = -2
let follow = true
let pendingSeek: number | undefined
let revealAt = 0

function showError(message: string) {
  stageError.textContent = message
  stageError.hidden = false
}

function usingSound(playing: boolean) {
  drawIcon(player.querySelector('i')!, playing ? 'pause' : 'play')
  player.setAttribute('aria-label', playing ? '暂停' : '播放')
}

function playAudio() {
  return audio.play().catch((error: DOMException) => {
    if (error.name !== 'AbortError') showError('音乐播放失败。请点播放键重试。')
  })
}

function setFollow(next: boolean) {
  if (follow === next) return
  follow = next
  mode.setAttribute('aria-pressed', String(follow))
  mode.querySelector('span')!.textContent = follow ? '随乐漫游' : '自由飞行'
  if (follow && chapterIndex >= 0) world?.setView(chapters[chapterIndex])
}

function seekTo(seconds: number) {
  if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
    pendingSeek = seconds
  } else {
    audio.currentTime = seconds
  }
  compose(performance.now())
}

function startFlight(play: boolean) {
  if (play && audio.paused) void playAudio()
  if (world || loading) return
  enter.disabled = true
  enter.setAttribute('aria-busy', 'true')
  stageError.hidden = true
  loading = import('./world')
    .then(({ createWorld }) => createWorld(host, stage, () => setFollow(false)))
    .then((loaded) => {
      world = loaded
      const now = audio.currentTime
      const nextBar = downbeats[indexAt(downbeats, now) + 1]
      revealAt = play && !audio.paused && !audio.seeking ? nextBar ?? now : now
      chapterIndex = -1
      compose(performance.now())
      world.canvas.addEventListener('webglcontextlost', () => {
        audio.pause()
        showError('3D 画布已断开。刷新页面可重新进入。')
      })
    })
    .catch((error: unknown) => {
      console.error(error)
      showError('3D 画境加载失败。请检查浏览器的 WebGL 2 支持，再重试。')
    })
    .finally(() => {
      enter.disabled = false
      enter.removeAttribute('aria-busy')
      loading = undefined
    })
  return loading
}

function revealWorld() {
  stage.classList.add('is-flying')
  element('intro').hidden = true
  element('touch-pad').hidden = false
  element('flight-toolbar').hidden = false
  host.removeAttribute('aria-hidden')
  host.tabIndex = -1
  host.focus({ preventScroll: true })
}

function compose(now: number) {
  const time = pendingSeek ?? audio.currentTime
  const chapter = Math.max(0, indexAt(chapterTimes, time))
  if (chapterIndex !== chapter) {
    chapterIndex = chapter
    const scene = chapters[chapter]
    chapterLabel.textContent = scene.name
    stage.dataset.chapter = String(chapter)
    chapterButtons.forEach((button, i) => button.setAttribute('aria-current', String(i === chapter)))
    world?.setChapter(scene)
    if (follow) world?.setView(scene)
  }

  const bar = indexAt(downbeats, time)
  const age = bar >= 0 ? time - downbeats[bar] : Infinity
  const dot = age < 4 * beatDuration ? Math.min(3, Math.floor(age / beatDuration)) : -1
  if (barIndex !== bar || dotIndex !== dot) {
    barIndex = bar
    dotIndex = dot
    stage.dataset.bar = String(bar + 1)
    beatDots.forEach((circle, i) => circle.classList.toggle('active', i === dot))
  }
  const max = Number(seek.max)
  progress.style.width = Math.min(100, (time / max) * 100) + '%'
  if (Math.abs(Number(seek.value) - time) > .005) seek.value = String(time)
  timeLabel.textContent = audio.ended ? element('length').textContent : clock(time)
  world?.render(now, time, audio.paused || audio.seeking ? 0 : Math.exp(-age * 7))
  if (world && !stage.classList.contains('is-flying') && (time >= revealAt || audio.paused || audio.seeking)) revealWorld()
}

function frame(now: number) {
  compose(now)
  requestAnimationFrame(frame)
}

enter.addEventListener('click', () => void startFlight(true))
player.addEventListener('click', () => {
  if (audio.paused) void startFlight(true)
  else audio.pause()
})
sound.addEventListener('click', () => { audio.muted = !audio.muted })
audio.addEventListener('volumechange', () => {
  drawIcon(sound.querySelector('i')!, audio.muted ? 'mute' : 'sound')
  sound.setAttribute('aria-label', audio.muted ? '取消静音' : '静音')
  sound.setAttribute('aria-pressed', String(audio.muted))
})
audio.addEventListener('playing', () => usingSound(true))
audio.addEventListener('pause', () => usingSound(false))
audio.addEventListener('ended', () => usingSound(false))
audio.addEventListener('error', () => showError('音乐无法加载。可以继续在港湾中飞行。'))
audio.addEventListener('loadedmetadata', () => {
  seek.max = String(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : duration)
  element('length').textContent = clock(Math.round(Number(seek.max)))
  if (pendingSeek !== undefined) {
    audio.currentTime = pendingSeek
    pendingSeek = undefined
  }
})
seek.addEventListener('input', () => seekTo(Number(seek.value)))
mode.addEventListener('click', () => {
  world?.clearInput()
  setFollow(!follow)
  host.focus({ preventScroll: true })
})
element('reset-view').addEventListener('click', () => {
  world?.clearInput()
  world?.setView(chapters[chapterIndex])
  host.focus({ preventScroll: true })
})
element('guide-open').addEventListener('click', () => {
  world?.clearInput()
  guide.showModal()
})
element('guide-close').addEventListener('click', () => guide.close())

fullscreen.hidden = !document.fullscreenEnabled
fullscreen.addEventListener('click', () => {
  void stage.requestFullscreen().catch(() => showError('当前浏览器无法打开全屏。'))
})
exitFullscreen.addEventListener('click', () => { void document.exitFullscreen() })
document.addEventListener('fullscreenchange', () => {
  exitFullscreen.hidden = document.fullscreenElement !== stage
})

compose(performance.now())
requestAnimationFrame(frame)
