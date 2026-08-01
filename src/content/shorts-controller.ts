export type PlaybackMode = 'loop' | 'auto'

const END_THRESHOLD_SECONDS = 0.35

export function findActiveShortVideo() {
  const isVisible = (video: HTMLVideoElement) => {
    const rect = video.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight
  }

  const activeVideo = document.querySelector<HTMLVideoElement>(
    'ytd-reel-video-renderer[is-active] video',
  )

  if (activeVideo && isVisible(activeVideo)) return activeVideo

  const viewportCenter = window.innerHeight / 2

  return [...document.querySelectorAll<HTMLVideoElement>('ytd-reel-video-renderer video')]
    .filter(isVisible)
    .sort((first, second) => {
      const firstRect = first.getBoundingClientRect()
      const secondRect = second.getBoundingClientRect()
      const firstCenter = firstRect.top + firstRect.height / 2
      const secondCenter = secondRect.top + secondRect.height / 2
      return Math.abs(firstCenter - viewportCenter) - Math.abs(secondCenter - viewportCenter)
    })[0] ?? null
}

export class ShortsController {
  private mode: PlaybackMode = 'loop'
  private started = false
  private activeVideo: HTMLVideoElement | null = null
  private advancedVideo: HTMLVideoElement | null = null
  private mutationObserver: MutationObserver | null = null
  private animationFrame: number | null = null

  start(mode: PlaybackMode = this.mode) {
    if (this.started) return

    this.started = true
    this.setMode(mode)
  }

  stop() {
    this.started = false
    this.stopAutoMode()
  }

  setMode(mode: PlaybackMode) {
    this.mode = mode

    if (!this.started) return

    if (mode === 'auto') {
      this.startAutoMode()
    } else {
      this.stopAutoMode()
    }
  }

  private startAutoMode() {
    if (!this.mutationObserver) {
      this.mutationObserver = new MutationObserver(this.scheduleActiveVideoUpdate)
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['is-active'],
      })
      document.addEventListener('yt-navigate-finish', this.scheduleActiveVideoUpdate)
    }

    this.scheduleActiveVideoUpdate()
  }

  private stopAutoMode() {
    this.mutationObserver?.disconnect()
    this.mutationObserver = null
    document.removeEventListener('yt-navigate-finish', this.scheduleActiveVideoUpdate)

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    this.setActiveVideo(null)
    this.advancedVideo = null
  }

  private scheduleActiveVideoUpdate = () => {
    if (this.animationFrame !== null) return

    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = null

      if (this.mode === 'auto') {
        this.setActiveVideo(findActiveShortVideo())
      }
    })
  }

  private setActiveVideo(video: HTMLVideoElement | null) {
    if (video === this.activeVideo) return

    this.activeVideo?.removeEventListener('timeupdate', this.handlePlaybackProgress)
    this.activeVideo?.removeEventListener('ended', this.handlePlaybackEnd)
    this.activeVideo = video
    this.advancedVideo = null
    this.activeVideo?.addEventListener('timeupdate', this.handlePlaybackProgress)
    this.activeVideo?.addEventListener('ended', this.handlePlaybackEnd)

    if (this.activeVideo) {
      this.handlePlaybackProgress()
    }
  }

  private handlePlaybackProgress = () => {
    const video = this.activeVideo

    if (
      video
      && video === this.advancedVideo
      && Number.isFinite(video.duration)
      && video.duration - video.currentTime > END_THRESHOLD_SECONDS
    ) {
      // YouTube can reuse one video element for consecutive Shorts.
      this.advancedVideo = null
    }

    if (
      !video
      || video.paused
      || !Number.isFinite(video.duration)
      || video.duration <= 0
      || video.duration - video.currentTime > END_THRESHOLD_SECONDS
    ) {
      return
    }

    this.advanceFrom(video)
  }

  private handlePlaybackEnd = () => {
    if (this.activeVideo) {
      this.advanceFrom(this.activeVideo)
    }
  }

  private advanceFrom(video: HTMLVideoElement) {
    if (this.mode !== 'auto' || video !== this.activeVideo || video === this.advancedVideo) return

    this.advancedVideo = video

    const nextButton = document.querySelector<HTMLButtonElement>(
      'ytd-shorts #navigation-button-down button:not([disabled])',
    )

    if (nextButton) {
      nextButton.click()
      return
    }

    const currentRenderer = video.closest('ytd-reel-video-renderer')
    const renderers = [...document.querySelectorAll<HTMLElement>('ytd-reel-video-renderer')]
    const currentIndex = currentRenderer ? renderers.indexOf(currentRenderer as HTMLElement) : -1

    if (currentIndex >= 0) {
      renderers[currentIndex + 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
}
