// CDN基础路径 (使用腾讯云COS默认域名)
const CDN_BASE = 'https://fireworks-1234567890.cos.ap-guangzhou.myqcloud.com';
// 或者使用CDN加速域名
// const CDN_BASE = 'https://fireworks-1234567890.file.myqcloud.com';

export const RESOURCES = {
  // 场景图片
  scenes: {
    night: `${CDN_BASE}/scenes/night.png`,
    grassland: `${CDN_BASE}/scenes/grassland.png`,
    sea: `${CDN_BASE}/scenes/sea.png`,
    city: `${CDN_BASE}/scenes/city.png`,
    village: `${CDN_BASE}/scenes/village.png`
  },
  
  // UI图标
  ui: {
    settings: `${CDN_BASE}/ui/settings.png`,
    play: `${CDN_BASE}/ui/play.png`,
    pause: `${CDN_BASE}/ui/pause.png`,
    mute: `${CDN_BASE}/ui/mute.png`,
    volume: `${CDN_BASE}/ui/volume.png`,
    share: `${CDN_BASE}/ui/share.png`,
    fuse: `${CDN_BASE}/ui/fuse.png`
  },

  // 音频资源
  audio: {
    launch: `${CDN_BASE}/audio/launch.mp3`,
    explosion: `${CDN_BASE}/audio/explosion.mp3`,
    fuse: `${CDN_BASE}/audio/fuse.mp3`
  }
}; 