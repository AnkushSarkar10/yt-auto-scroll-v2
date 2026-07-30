<script setup lang="ts">
import HelloWorld from '@/components/HelloWorld.vue'
</script>

<template>
  <div class="flex flex-wrap items-center justify-center">
    <a href="https://vite.dev" target="_blank">
      <img
        src="@/assets/vite.svg"
        class="h-24 shrink-0 p-6 transition-[filter] duration-300 will-change-[filter] hover:drop-shadow-[0_0_2rem_#646cffaa]"
        alt="Vite logo"
      >
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img
        src="@/assets/vue.svg"
        class="h-24 shrink-0 p-6 transition-[filter] duration-300 will-change-[filter] hover:drop-shadow-[0_0_2rem_#42b883aa]"
        alt="Vue logo"
      >
    </a>
    <a href="https://crxjs.dev/vite-plugin" target="_blank">
      <img
        src="@/assets/crx.svg"
        class="h-24 shrink-0 p-6 transition-[filter] duration-300 will-change-[filter] hover:drop-shadow-[0_0_2rem_#f2bae4aa]"
        alt="crx logo"
      >
    </a>
  </div>
  <HelloWorld msg="Vite + Vue + CRXJS" />
</template>
