<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  findActiveShortVideo,
  ShortsController,
  type PlaybackMode,
} from '../shorts-controller'

const mode = ref<PlaybackMode>('loop')
const isPositioned = ref(false)
const position = ref({ top: '0px', right: '0px' })
const shortsController = new ShortsController()

function toggleMode() {
  mode.value = mode.value === 'loop' ? 'auto' : 'loop'
}

// position the toggle top right of the short

let animationFrame: number | null = null
let observedVideo: HTMLVideoElement | null = null
let observedMutationTarget: Element | null = null
let mutationObserver: MutationObserver | null = null
let resizeObserver: ResizeObserver | null = null

function updatePosition() {
  const video = findActiveShortVideo()

  if (!video) {
    isPositioned.value = false
    return
  }

  if (video !== observedVideo) {
    resizeObserver?.disconnect()
    resizeObserver?.observe(video)
    observedVideo = video
  }

  const rect = video.getBoundingClientRect()
  const inset = 12
  const controlWidth = 96
  const mastheadBottom = document
    .querySelector<HTMLElement>('ytd-masthead')
    ?.getBoundingClientRect().bottom ?? 0
  const actions = video
    .closest('ytd-reel-video-renderer')
    ?.querySelector<HTMLElement>('#actions')
  const actionsRect = actions?.getBoundingClientRect()
  const buttonLeft = actionsRect && actionsRect.width > 0
    ? actionsRect.left + (actionsRect.width - controlWidth) / 2
    : rect.right + inset

  position.value = {
    top: `${Math.max(mastheadBottom + inset, rect.top + inset)}px`,
    right: `${Math.max(inset, window.innerWidth - buttonLeft - controlWidth)}px`,
  }
  isPositioned.value = true
}

function schedulePositionUpdate() {
  if (animationFrame !== null) return

  animationFrame = requestAnimationFrame(() => {
    animationFrame = null
    updatePosition()
  })
}

function observeShortsMutations() {
  const shortsContainer = document.querySelector('ytd-shorts')
    ?? document.querySelector('#shorts-container')
  const target = shortsContainer ?? document.body

  if (target === observedMutationTarget) return

  mutationObserver?.disconnect()
  mutationObserver?.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['is-active'],
  })
  observedMutationTarget = target
}

onMounted(() => {
  shortsController.start(mode.value)
  resizeObserver = new ResizeObserver(schedulePositionUpdate)
  mutationObserver = new MutationObserver(() => {
    schedulePositionUpdate()
    observeShortsMutations()
  })
  observeShortsMutations()

  window.addEventListener('resize', schedulePositionUpdate)
  document.addEventListener('scroll', schedulePositionUpdate, true)
  schedulePositionUpdate()
})

onBeforeUnmount(() => {
  shortsController.stop()
  if (animationFrame !== null) cancelAnimationFrame(animationFrame)
  mutationObserver?.disconnect()
  resizeObserver?.disconnect()
  observedMutationTarget = null
  window.removeEventListener('resize', schedulePositionUpdate)
  document.removeEventListener('scroll', schedulePositionUpdate, true)
})

watch(mode, newMode => shortsController.setMode(newMode))
</script>

<template>
  <div
    v-show="isPositioned"
    class="crx:fixed crx:z-100 crx:font-sans crx:leading-none crx:select-none"
    :style="position"
  >
    <button
      class="shorts-mode-toggle"
      :class="`shorts-mode-toggle--${mode}`"
      type="button"
      :aria-label="`Playback mode: ${mode}. Click to switch.`"
      @click="toggleMode"
    >
      <span class="shorts-mode-toggle__slider" aria-hidden="true" />
      <span
        class="shorts-mode-toggle__option"
        :class="{ 'shorts-mode-toggle__option--active': mode === 'loop' }"
      >
        loop
      </span>
      <span
        class="shorts-mode-toggle__option"
        :class="{ 'shorts-mode-toggle__option--active': mode === 'auto' }"
      >
        auto
      </span>
    </button>
  </div>
</template>
