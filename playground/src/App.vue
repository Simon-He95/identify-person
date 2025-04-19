<script setup lang="ts">
import { download } from 'lazy-js-utils'
import { onMounted, ref } from 'vue' // 确保导入 ref 和 onMounted
import identifyPerson from '../../src'

const color = ref('#0066cc')
const canvasBg = ref<HTMLCanvasElement>()
const cvs = ref<HTMLCanvasElement>()
const video = ref<HTMLVideoElement>()
const image = ref<HTMLImageElement>()
const disabled = ref(true)
const isLoading = ref(true)
const cropShape = ref<'square' | 'circle'>('square') // 新增：裁剪形状，默认为方形
let changeBgColor: (color: string) => void

onMounted(async () => {
  if (cvs.value && video.value && canvasBg.value) { // 添加 null 检查
    cvs.value.width = cvs.value.height = video.value.width = video.value.height = canvasBg.value.width = canvasBg.value.height = 400
    const { changeColor } = await identifyPerson(video.value, cvs.value, () => {
      isLoading.value = false
    })
    changeBgColor = changeColor
    changeBgColor(color.value)
  }
})

function change() {
  if (changeBgColor) // 添加 null 检查
    changeBgColor(color.value)
}

function takePhoto() {
  if (cvs.value && canvasBg.value && image.value) { // 添加 null 检查
    const ctxBg = canvasBg.value.getContext('2d')
    if (!ctxBg)
      return // 添加 context 检查

    const width = canvasBg.value.width
    const height = canvasBg.value.height

    // 清空背景画布
    ctxBg.clearRect(0, 0, width, height)

    // 应用裁剪
    ctxBg.save() // 保存当前状态
    if (cropShape.value === 'circle') {
      ctxBg.beginPath()
      ctxBg.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2, true)
      ctxBg.clip()
    }
    // 如果是方形，则不需要特殊裁剪，默认就是方形

    // 将 cvs 的内容绘制到背景画布上（应用了裁剪）
    ctxBg.drawImage(cvs.value, 0, 0, width, height)
    ctxBg.restore() // 恢复状态，移除裁剪效果，以便下次绘制

    // 从背景画布生成最终图像
    image.value.src = canvasBg.value.toDataURL('image/png')
    disabled.value = false
  }
}

function clickHandler() {
  if (image.value?.src) // 添加 null 检查
    download(image.value.src, `photo-${cropShape.value}.png`) // 可以根据形状命名
}
</script>

<template>
  <div class="container">
    <div class="media-area">
      <div class="video-container">
        <video ref="video" autoplay playsinline muted style="background-color: #000; width: 100%; height: 100%; object-fit: cover; border-radius: 8px;"></video>
        <div v-if="isLoading" class="loading-overlay">
          Initializing Camera...
        </div>
      </div>
      <div class="canvas-container">
        <canvas ref="cvs" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;"></canvas>
      </div>
      <div class="preview-container">
        <p>Preview</p>
        <!-- 使用 v-if 控制显示图片或占位符 -->
        <img v-if="image?.src && image?.src.startsWith('data:')" ref="image" :src="image?.src" alt="Captured photo" class="preview-image">
        <div v-else class="preview-placeholder">
          Photo preview will appear here.
        </div>
      </div>
    </div>

    <div class="controls">
      <div class="control-group">
        <label>Crop Shape:</label>
        <div class="shape-selector">
          <label>
            <input type="radio" v-model="cropShape" value="square" name="cropShape"> Square
          </label>
          <label>
            <input type="radio" v-model="cropShape" value="circle" name="cropShape"> Circle
          </label>
        </div>
      </div>
       <div class="control-group color-picker">
         <label for="bgColor">Background:</label>
         <input id="bgColor" v-model="color" type="color" @input="change">
       </div>
       <div class="control-group actions">
          <button class="btn btn-primary" @click="takePhoto">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-camera-fill" viewBox="0 0 16 16">
              <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/>
              <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
            </svg>
            Take Photo
          </button>
          <button class="btn" :disabled="disabled" @click="clickHandler">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
            </svg>
            Download
          </button>
       </div>
    </div>
  </div>
  <canvas ref="canvasBg" style="display: none;"></canvas> <!-- Hidden canvas for processing -->
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px; /* Increased gap */
  padding: 30px; /* Increased padding */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; /* System font */
  background-color: #f8f9fa; /* Light background */
  min-height: 100vh;
}

.media-area {
  display: flex;
  gap: 20px; /* Increased gap */
  justify-content: center;
  align-items: flex-start;
  flex-wrap: wrap;
  width: 100%;
  max-width: 1000px; /* Slightly wider */
}

.video-container, .canvas-container {
  position: relative;
  width: 320px; /* Slightly larger */
  height: 320px;
  border: none; /* Remove border, use shadow */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* Add shadow */
  border-radius: 8px; /* Rounded corners */
  background-color: #e9ecef; /* Placeholder background */
  overflow: hidden;
}

.preview-container {
  width: 320px; /* Match other containers */
  height: 320px; /* Match other containers */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* Center content vertically */
  border: 1px dashed #ced4da; /* Dashed border for placeholder */
  border-radius: 8px;
  background-color: #fff;
  padding: 10px;
  box-sizing: border-box; /* Include padding in size */
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); /* Lighter shadow */
}
.preview-container p {
  margin-bottom: 10px; /* Increased margin */
  font-size: 1em; /* Slightly larger font */
  color: #495057; /* Darker grey */
  font-weight: 500;
}

.preview-image {
  display: block; /* Remove extra space below image */
  max-width: 100%;
  max-height: calc(100% - 30px); /* Adjust max height considering the paragraph */
  border-radius: 4px; /* Slight rounding */
  object-fit: contain; /* Ensure image fits */
}

.preview-placeholder {
  font-size: 0.95em;
  color: #6c757d; /* Medium grey */
  padding: 20px;
}


.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6); /* Slightly lighter overlay */
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.1em;
  border-radius: 8px; /* Match container rounding */
  z-index: 10; /* Ensure it's above video/canvas */
}

.controls {
  display: flex;
  gap: 25px; /* Increased gap */
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  background-color: #fff; /* White background for controls */
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 1000px; /* Match media area */
  box-sizing: border-box;
}

.control-group {
  display: flex;
  flex-direction: column; /* Stack label and control */
  gap: 8px; /* Gap between label and control */
  align-items: flex-start; /* Align items to the start */
}

.control-group label {
  font-size: 0.9em;
  color: #495057;
  font-weight: 500;
  margin-bottom: 0; /* Remove default margin if any */
}

.shape-selector, .color-picker {
  display: flex;
  gap: 15px; /* Increased gap */
  align-items: center;
}
.shape-selector label, .color-picker label:first-child /* Target only the main label */ {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px; /* Slightly increased gap */
  font-size: 0.95em; /* Consistent font size */
  color: #343a40; /* Darker text */
}
/* Style radio buttons */
input[type="radio"] {
  cursor: pointer;
  margin-right: 3px;
}

.control-group.actions {
  flex-direction: row; /* Keep buttons side-by-side */
  align-items: center; /* Align buttons vertically */
  gap: 15px; /* Gap between buttons */
  margin-left: auto; /* Push actions to the right if space allows */
}


.btn {
  padding: 10px 18px; /* Larger padding */
  border: none; /* Remove border */
  background-color: #e9ecef; /* Light grey background */
  color: #343a40; /* Dark text */
  cursor: pointer;
  border-radius: 6px; /* Slightly more rounded */
  transition: background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  font-size: 0.95em;
  font-weight: 500;
  display: inline-flex; /* Align icon and text */
  align-items: center;
  gap: 8px; /* Gap between icon and text */
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.btn svg {
  margin-bottom: -2px; /* Fine-tune icon alignment */
}

.btn:hover {
  background-color: #dee2e6; /* Darker grey on hover */
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background-color: #e9ecef;
  box-shadow: none;
}

/* Primary button style */
.btn.btn-primary {
  background-color: #007bff; /* Blue */
  color: white;
}
.btn.btn-primary:hover {
  background-color: #0056b3; /* Darker blue */
}
.btn.btn-primary:disabled {
   background-color: #007bff;
   opacity: 0.6;
}


input[type="color"] {
  width: 35px; /* Slightly smaller */
  height: 35px;
  border: 1px solid #ced4da; /* Lighter border */
  padding: 2px;
  cursor: pointer;
  border-radius: 4px;
  vertical-align: middle; /* Align better with label */
}
</style>
