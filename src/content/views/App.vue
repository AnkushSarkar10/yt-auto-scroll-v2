<script setup lang="ts">
import Logo from '@/assets/crx.svg'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const show = ref(false)
const isPositioned = ref(false)
const position = ref({ top: '0px', right: '0px' })
const toggle = () => show.value = !show.value

// position the toggle top right of the short

let animationFrame: number | null = null
let observedVideo: HTMLVideoElement | null = null
let mutationObserver: MutationObserver | null = null
let resizeObserver: ResizeObserver | null = null

function findVisibleShortVideo() {
  const activeVideo = document.querySelector<HTMLVideoElement>(
    'ytd-reel-video-renderer[is-active] video',
  )

  if (activeVideo) return activeVideo

  const viewportCenter = window.innerHeight / 2

  return [...document.querySelectorAll<HTMLVideoElement>('ytd-reel-video-renderer video')]
    .filter((video) => {
      const rect = video.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight
    })
    .sort((first, second) => {
      const firstRect = first.getBoundingClientRect()
      const secondRect = second.getBoundingClientRect()
      const firstCenter = firstRect.top + firstRect.height / 2
      const secondCenter = secondRect.top + secondRect.height / 2
      return Math.abs(firstCenter - viewportCenter) - Math.abs(secondCenter - viewportCenter)
    })[0] ?? null
}

function updatePosition() {
  const video = findVisibleShortVideo()

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
  const buttonSize = 40
  const actions = video
    .closest('ytd-reel-video-renderer')
    ?.querySelector<HTMLElement>('#actions')
  const actionsRect = actions?.getBoundingClientRect()
  const buttonLeft = actionsRect && actionsRect.width > 0
    ? actionsRect.left + (actionsRect.width - buttonSize) / 2
    : rect.right + inset

  position.value = {
    top: `${Math.max(inset, rect.top + inset)}px`,
    right: `${Math.max(inset, window.innerWidth - buttonLeft - buttonSize)}px`,
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

onMounted(() => {
  resizeObserver = new ResizeObserver(schedulePositionUpdate)
  mutationObserver = new MutationObserver(schedulePositionUpdate)
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['is-active'],
  })

  window.addEventListener('resize', schedulePositionUpdate)
  document.addEventListener('scroll', schedulePositionUpdate, true)
  schedulePositionUpdate()
})

onBeforeUnmount(() => {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame)
  mutationObserver?.disconnect()
  resizeObserver?.disconnect()
  window.removeEventListener('resize', schedulePositionUpdate)
  document.removeEventListener('scroll', schedulePositionUpdate, true)
})
</script>

<template>
  <div
    v-show="isPositioned"
    class="crx:fixed crx:z-100 crx:flex crx:items-start crx:font-sans crx:leading-none crx:select-none"
    :style="position"
  >
    <div
      v-show="show"
      class="crx:mt-0 crx:mr-2 crx:mb-0 crx:ml-0 crx:h-min crx:w-max crx:rounded-lg crx:bg-white crx:px-4 crx:py-2 crx:text-gray-800 crx:shadow-md crx:transition-opacity crx:duration-300"
      :class="show ? 'crx:opacity-100' : 'crx:opacity-0'"
    >
      <h1>HELLO BLAZEKUSH</h1>
    </div>
    <button
      class="crx:flex crx:h-10 crx:w-10 crx:cursor-pointer crx:justify-center crx:rounded-full crx:border-none crx:bg-[#288cd7] crx:shadow-sm crx:hover:bg-[#1e6aa3]"
      @click="toggle()"
    >
      <img :src="Logo" alt="CRXJS logo" class="crx:p-1">
    </button>
  </div>
</template>
