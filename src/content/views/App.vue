<script setup lang="ts">
import Logo from '@/assets/crx.svg'
import { ref } from 'vue'

const show = ref(false)
const toggle = () => show.value = !show.value
</script>

<template>
  <div class="crx:fixed crx:right-0 crx:bottom-0 crx:z-100 crx:m-5 crx:flex crx:items-end crx:font-sans crx:leading-none crx:select-none">
    <div
      v-show="show"
      class="crx:mt-auto crx:mr-2 crx:mb-0 crx:ml-0 crx:h-min crx:w-max crx:rounded-lg crx:bg-white crx:px-4 crx:py-2 crx:text-gray-800 crx:shadow-md crx:transition-opacity crx:duration-300"
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
