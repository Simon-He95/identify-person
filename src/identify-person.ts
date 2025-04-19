import type { Callback, Return } from './types'
import * as tf from '@tensorflow/tfjs'

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
  // Initialize recurrent states. Must be TF Tensors.
  let [r1i, r2i, r3i, r4i] = [tf.tensor(0.0), tf.tensor(0.0), tf.tensor(0.0), tf.tensor(0.0)]
  let animationFrameId: number | null = null // Store the animation frame ID

  const downsample_ratio = tf.tensor(0.5)

  // Start the loop
  animationFrameId = requestAnimationFrame(loop)

  const stop = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null // Reset the ID
      // Dispose of the final recurrent state tensors and the downsample ratio
      tf.dispose([r1i, r2i, r3i, r4i, downsample_ratio])
      // Nullify to prevent reuse
      r1i = r2i = r3i = r4i = null!
      webcam.stop() // Stop the webcam stream
      console.log('Loop stopped and resources disposed.')
    }
  }
  async function loop() {
    let img: tf.Tensor | null = null
    let src: tf.Tensor | null = null
    let fgr: tf.Tensor | null = null
    let pha: tf.Tensor | null = null
    let r1o: tf.Tensor | null = null
    let r2o: tf.Tensor | null = null
    let r3o: tf.Tensor | null = null
    let r4o: tf.Tensor | null = null

    try {
      img = await webcam.capture()
      // tf.tidy is used for intermediate tensors like 'src'
      src = tf.tidy(() => img!.expandDims(0).div(255))

      // Execute the model. Note: Explicitly declare output tensor types if known.
      const outputs = await model.executeAsync(
        { src, r1i, r2i, r3i, r4i, downsample_ratio },
        ['fgr', 'pha', 'r1o', 'r2o', 'r3o', 'r4o'],
      ) as tf.Tensor[]; // Assuming the output is an array of Tensors

      [fgr, pha, r1o, r2o, r3o, r4o] = outputs

      // Pass original tensors directly to drawMatte
      const base64 = await drawMatte(fgr, pha, canvas as HTMLCanvasElement, container)
      callback && callback(base64)

      // Dispose tensors from the *previous* iteration's recurrent state
      tf.dispose([r1i, r2i, r3i, r4i]);
      // Update recurrent state tensors for the next iteration
      [r1i, r2i, r3i, r4i] = [r1o, r2o, r3o, r4o]
      // Nullify references to prevent accidental reuse before disposal in the next iteration
      r1o = r2o = r3o = r4o = null
    }
    catch (error) {
      console.error('Error in loop:', error)
      // Consider stopping the loop or handling the error appropriately
      stop() // Example: stop on error
      return
    }
    finally {
      // Dispose tensors created in *this* iteration that are not passed to the next
      tf.dispose([img!, src!, fgr!, pha!])
      // Ensure r1o-r4o are disposed if an error occurred before reassignment
      tf.dispose([r1o!, r2o!, r3o!, r4o!])
    }

    // Schedule the next frame
    if (animationFrameId !== null) { // Check if stop() was called during the loop
      animationFrameId = requestAnimationFrame(loop)
    }
  }

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

// drawMatte now receives original tensors and should not dispose them.
// tf.tidy handles intermediate tensors created within drawMatte.
export async function drawMatte(fgr: tf.Tensor | null, pha: tf.Tensor | null, canvas: HTMLCanvasElement, container: HTMLCanvasElement) {
  const rgba = tf.tidy(() => {
    // Ensure tensors are valid before accessing properties
    // Check shape length to ensure it's a tensor with spatial dimensions
    const fgrValid = fgr instanceof tf.Tensor && fgr.shape.length > 2
    const phaValid = pha instanceof tf.Tensor && pha.shape.length > 2

    if (!fgrValid && !phaValid) {
      // Handle case where both inputs might be invalid/null
      console.error('Both fgr and pha are invalid or null in drawMatte')
      // Return a default tensor matching canvas size if possible, otherwise a small default
      const defaultHeight = canvas.height > 0 ? canvas.height : 1
      const defaultWidth = canvas.width > 0 ? canvas.width : 1
      return tf.zeros([defaultHeight, defaultWidth, 4], 'int32')
    }

    // Determine height and width safely
    let h: number, w: number
    if (phaValid) {
      h = pha.shape[1]!
      w = pha.shape[2]!
    }
    else if (fgrValid) { // Should be fgrValid if !phaValid and the initial check passed
      h = fgr.shape[1]!
      w = fgr.shape[2]!
    }
    else {
      // This case should theoretically not be reached due to the initial check
      console.error('Unexpected state: No valid tensor found for shape determination.')
      return tf.zeros([1, 1, 4], 'int32') // Fallback
    }

    const rgb = fgrValid
      ? fgr.squeeze([0]).mul(255).cast('int32') // Use squeeze([0]) for clarity
      : tf.fill([h, w, 3], 255, 'int32') // Use determined h, w

    const a = phaValid
      ? pha.squeeze([0]).mul(255).cast('int32') // Use squeeze([0]) for clarity
      : tf.fill([h, w, 1], 255, 'int32') // Use determined h, w

    // Ensure rgb and a are valid tensors before concat
    if (!(rgb instanceof tf.Tensor) || !(a instanceof tf.Tensor)) {
      console.error('Failed to create rgb or alpha tensor.')
      return tf.zeros([h, w, 4], 'int32') // Fallback
    }

    return tf.concat([rgb, a], -1) // Axis -1 is correct for channel dimension
  })

  // Ensure rgba is a valid tensor before proceeding
  if (!(rgba instanceof tf.Tensor) || rgba.isDisposed) {
    console.error('rgba tensor is invalid or disposed after tidy block.')
    return '' // Return empty string or handle error
  }

  const [height, width] = rgba.shape.slice(0, 2) // Get height/width from the final rgba tensor

  // Check for zero dimensions which can cause errors
  if (height === 0 || width === 0) {
    console.error('rgba tensor has zero height or width.')
    rgba.dispose()
    return ''
  }

  let pixelData: Uint8ClampedArray | null = null
  try {
    pixelData = new Uint8ClampedArray(await rgba.data()) // await rgba.data() is correct
  }
  catch (error) {
    console.error('Error getting data from rgba tensor:', error)
    rgba.dispose()
    return ''
  }
  finally {
    // Dispose rgba tensor after data extraction, regardless of success/failure
    if (!rgba.isDisposed) {
      rgba.dispose()
    }
  }

  // pixelData could be null if await rgba.data() failed and was caught
  if (!pixelData) {
    console.error('Failed to get pixel data.')
    return ''
  }

  const imageData = new ImageData(pixelData, width, height)

  // Ensure canvas dimensions match before putting image data
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) {
    console.error('Failed to get 2D context from canvas')
    // No need to dispose rgba here, it's handled in the finally block
    return '' // Or handle error appropriately
  }
  context.putImageData(imageData, 0, 0)
  context.globalCompositeOperation = 'destination-over'
  context.drawImage(container, 0, 0, width, height) // Ensure drawImage uses correct dimensions

  // Reset composite operation if needed elsewhere
  // context.globalCompositeOperation = 'source-over'; // Optional: Reset to default

  return canvas.toDataURL()
}
