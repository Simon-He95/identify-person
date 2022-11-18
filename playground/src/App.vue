<script setup lang="ts">
import { download } from 'simon-js-tool'
import identifyPerson from '../../src'
const color = ref('#0066cc')
const canvasBg = ref()
const cvs = ref()
const video = ref()
const image = ref()
const disabled = ref(true)
const isLoading = ref(true)
let changeBgColor: (color: string) => void
onMounted(async () => {
  cvs.value.width = cvs.value.height = video.value.width = video.value.height = canvasBg.value.width = canvasBg.value.height = 400
  const { changeColor } = await identifyPerson(video.value, cvs.value, () => {
    isLoading.value = false
  })
  changeBgColor = changeColor
  changeBgColor(color.value)
})
function change() {
  changeBgColor(color.value)
}
function takePhoto() {
  image.value.src = cvs.value.toDataURL('image/png')
  disabled.value = false
}
const clickHandler = () => download(image.value.src)
</script>

<template>
  <div flex="~ gap-3">
    <video ref="video" autoplay style="background-color: #000" />
    <div v-show="isLoading">
      initializing...
    </div>
    <canvas ref="cvs" />
    <canvas ref="canvasBg" style="display: none" />
    <img ref="image" src="">
  </div>
  <div flex="~ gap3" justify-center mt4>
    <button btn @click="takePhoto">
      拍照
    </button>
    <input v-model="color" type="color" @input="change">
    <button :disabled="disabled" btn @click="clickHandler">
      下载
    </button>
  </div>
</template>

<style scoped>
</style>
