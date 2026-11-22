type View = {
  position: [number, number, number]
  yaw: number
  pitch: number
}

export interface Chapter {
  name: string
  downbeat: number | null
  view: View
  mist: string
  water: string
  tint: string
  amber: string
  warmth: number
  haze: number
}

export const chapters: Chapter[] = [
  { name: '港口未醒', downbeat: null, view: { position: [0, 5.2, 30], yaw: -.07, pitch: -.08 },
    mist: '#999492', water: '#4a6671', tint: '#d6dfee', amber: '#ef995f', warmth: .86, haze: .62 },
  { name: '穿过晨雾', downbeat: 8, view: { position: [-5, 2.7, 22], yaw: -.21, pitch: -.045 },
    mist: '#8f9c9e', water: '#426875', tint: '#d5e6f6', amber: '#fa996c', warmth: 1.03, haze: .41 },
  { name: '舟影', downbeat: 24, view: { position: [24, 4, -14], yaw: .32, pitch: -.11 },
    mist: '#9da2a1', water: '#53676e', tint: '#e1e4e9', amber: '#f6aa74', warmth: .93, haze: .48 },
  { name: '雾中桅杆', downbeat: 40, view: { position: [-18, 9.8, -60], yaw: .23, pitch: -.06 },
    mist: '#9a9fa9', water: '#3b596b', tint: '#c2d2ed', amber: '#e8a582', warmth: .64, haze: .94 },
  { name: '日光破水', downbeat: 48, view: { position: [11, 4.4, 11], yaw: -.30, pitch: -.085 },
    mist: '#baaaa2', water: '#596e7b', tint: '#f1d6c0', amber: '#ffaf69', warmth: 1.26, haze: .37 },
  { name: '港湾之上', downbeat: 64, view: { position: [-30, 30, 25], yaw: -.22, pitch: -.24 },
    mist: '#a8a5b1', water: '#4f637b', tint: '#e4def5', amber: '#ffc086', warmth: 1.16, haze: .46 },
  { name: '余晖', downbeat: 78, view: { position: [4, 5.5, 33], yaw: -.08, pitch: -.09 },
    mist: '#9c999d', water: '#475c6c', tint: '#cdd7ea', amber: '#ee9d76', warmth: .77, haze: .72 },
]
