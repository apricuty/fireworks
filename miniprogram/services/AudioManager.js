export default class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.soundPaths = {
      launch: '/assets/sounds/launch.mp3',
      explode: '/assets/sounds/explode.mp3',
      fuse: '/assets/sounds/fuse.mp3'
    };
    this.loadSounds();
  }

  // 加载音效
  async loadSounds() {
    const soundFiles = {
      launch: {
        src: '/assets/sounds/launch.mp3',
        volume: 0.8,
        playbackRate: 1.0
      },
      explode: {
        src: '/assets/sounds/explode.mp3',
        volume: 0.7,
        playbackRate: 1.0
      },
      whistle: {
        src: '/assets/sounds/whistle.mp3',
        volume: 0.4,
        playbackRate: 1.2,
        loop: false
      },
      fire: {
        src: '/assets/sounds/fire.mp3',
        volume: 0.5,
        playbackRate: 1.0,
        loop: true
      }
    };

    for (const [name, config] of Object.entries(soundFiles)) {
      try {
        const sound = wx.createInnerAudioContext();
        sound.src = config.src;
        sound.volume = config.volume;
        sound.playbackRate = config.playbackRate;
        sound.loop = config.loop || false;
        this.sounds.set(name, sound);
      } catch (error) {
        console.error(`Failed to load sound: ${name}`, error);
      }
    }
  }

  // 播放发射音效
  async playLaunchSound() {
    try {
      await this.sounds.get('launch').play();
    } catch (error) {
      console.warn('Launch sound playback failed:', error);
    }
  }

  // 播放爆炸音效
  playExplodeSound() {
    const sound = this.sounds.get('explode');
    if (sound) {
      sound.volume = 0.6 + Math.random() * 0.2;
      this.playSound('explode');
    }
  }

  // 播放呼啸音效
  async playWhistleSound() {
    try {
      await this.sounds.get('whistle').play();
    } catch (error) {
      console.warn('Whistle sound playback failed:', error);
    }
  }

  // 播放引线燃烧音效
  playFuseSound() {
    this.playSound('fire');
  }

  // 停止引线燃烧音效
  stopFuseSound() {
    const sound = this.sounds.get('fire');
    if (sound) {
      sound.stop();
    }
  }

  // 播放指定音效
  playSound(name) {
    const sound = this.sounds.get(name);
    if (sound) {
      // 确保从头开始播放
      sound.stop();
      sound.seek(0);
      sound.play();
    }
  }

  // 设置音量
  setVolume(name, volume) {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.volume = Math.max(0, Math.min(1, volume));
    }
  }

  // 设置播放速度
  setPlaybackRate(name, rate) {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    }
  }

  // 停止所有音效
  stopAll() {
    this.sounds.forEach(sound => {
      sound.stop();
    });
  }

  // 清理资源
  dispose() {
    this.sounds.forEach(sound => {
      sound.destroy();
    });
    this.sounds.clear();
  }

  // 添加全局音量控制方法
  setAllVolume(volume) {
    this.sounds.forEach(sound => {
      sound.volume = Math.max(0, Math.min(1, volume));
    });
  }
} 