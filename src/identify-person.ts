import * as tf from '@tensorflow/tfjs'
import type { Callback, Return } from './types'

export async function identifyPerson(video: HTMLVideoElement, canvas: HTMLCanvasElement | Callback = document.createElement('canvas'), callback: Callback = () => { }): Promise<Return> {
  if (typeof canvas === 'function') {
    callback = canvas as Callback
    canvas = document.createElement('canvas')
  }
  const url = new URL('./model/model.json', import.meta.url).href
  const webcam = await tf.data.webcam(video)
  const model = await tf.loadGraphModel(url)
  const container: HTMLCanvasElement = document.createElement('canvas')
  container.width = video.width
  container.height = video.height
  let [r1i, r2i, r3i, r4i] = [tf.tensor(0.0), tf.tensor(0.0), tf.tensor(0.0), tf.tensor(0.0)]

  const downsample_ratio = tf.tensor(0.5)
  const loop = async () => {
    await tf.nextFrame()
    const img = await webcam.capture()
    const src = tf.tidy(() => img.expandDims(0).div(255))
    const [fgr, pha, r1o, r2o, r3o, r4o] = await model.executeAsync(
      { src, r1i, r2i, r3i, r4i, downsample_ratio },
      ['fgr', 'pha', 'r1o', 'r2o', 'r3o', 'r4o'],
    ) as any[]
    const base64 = await drawMatte(fgr.clone(), pha.clone(), canvas as HTMLCanvasElement, container)
    callback && callback(base64)
    tf.dispose([img, src, fgr, pha, r1i, r2i, r3i, r4i]);
    [r1i, r2i, r3i, r4i] = [r1o, r2o, r3o, r4o]
  }

  const timer = setInterval(loop, 1000 / 60)

  const stop = () => clearInterval(timer)
  const changeColor = (color: string) => {
    const containerBg = container.getContext('2d')!
    const { width, height } = canvas as HTMLCanvasElement
    containerBg.clearRect(0, 0, width, height)
    containerBg.fillStyle = color
    containerBg.fillRect(0, 0, width, height)
  }
  return {
    changeColor,
    stop,
  }
}

export async function drawMatte(fgr: any, pha: any, canvas: HTMLCanvasElement, container: HTMLCanvasElement) {
  const rgba = tf.tidy(() => {
    const rgb = (fgr !== null)
      ? fgr.squeeze(0).mul(255).cast('int32')
      : tf.fill([pha.shape[1], pha.shape[2], 3], 255, 'int32')
    const a = (pha !== null)
      ? pha.squeeze(0).mul(255).cast('int32')
      : tf.fill([fgr.shape[1], fgr.shape[2], 1], 255, 'int32')
    return tf.concat([rgb, a], -1)
  })

  fgr && fgr.dispose()
  pha && pha.dispose()
  const [height, width] = rgba.shape.slice(0, 2)
  const pixelData = new Uint8ClampedArray(await rgba.data())
  const imageData = new ImageData(pixelData, width, height)
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  context.putImageData(imageData, 0, 0)
  context.getImageData(0, 0, width, height)
  context.globalCompositeOperation = 'destination-over'
  context.drawImage(container, 0, 0)
  rgba.dispose()
  return canvas.toDataURL()
}
