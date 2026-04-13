import { AutoModel, AutoProcessor, RawImage, env } from '@huggingface/transformers'

// Kör i huvudtråden (enklare setup)
env.backends.onnx.wasm.proxy = false

// Modellen cachas i minnet efter första laddning
let cachedModel     = null
let cachedProcessor = null

const MODEL_ID = 'briaai/RMBG-1.4'

const PROCESSOR_CONFIG = {
  do_normalize:            true,
  do_pad:                  false,
  do_rescale:              true,
  do_resize:               true,
  image_mean:              [0.5, 0.5, 0.5],
  image_std:               [1, 1, 1],
  feature_extractor_type:  'ImageFeatureExtractor',
  resample:                2,
  rescale_factor:          0.00392156862745098,
  size:                    { width: 1024, height: 1024 },
}

/**
 * Laddar modellen (cachas efter första laddning).
 * @param {function} onProgress - (status: 'loading'|'ready', progress?: number) => void
 */
export async function loadModel(onProgress) {
  if (cachedModel && cachedProcessor) {
    onProgress?.('ready')
    return { model: cachedModel, processor: cachedProcessor }
  }

  onProgress?.('loading', 0)

  cachedModel = await AutoModel.from_pretrained(MODEL_ID, {
    config: { model_type: 'custom' },
    progress_callback: (info) => {
      if (info.status === 'progress') {
        onProgress?.('loading', Math.round(info.progress ?? 0))
      }
    },
  })

  cachedProcessor = await AutoProcessor.from_pretrained(MODEL_ID, {
    config: PROCESSOR_CONFIG,
  })

  onProgress?.('ready')
  return { model: cachedModel, processor: cachedProcessor }
}

/**
 * Tar bort bakgrunden från en bildfil.
 * @param {File} file         - Originalbilden
 * @param {function} onProgress
 * @returns {Promise<Blob>}   - PNG med transparent bakgrund
 */
export async function removeBackground(file, onProgress) {
  const { model, processor } = await loadModel(onProgress)

  onProgress?.('processing')

  // Läs bilden
  const objectUrl = URL.createObjectURL(file)
  const image     = await RawImage.fromURL(objectUrl)
  URL.revokeObjectURL(objectUrl)

  // Kör modellen
  const { pixel_values } = await processor(image)
  const { output }       = await model({ input: pixel_values })

  // Skapa mask i originalstorlek
  const maskTensor  = output[0].mul(255).to('uint8')
  const maskImage   = await RawImage.fromTensor(maskTensor)
  const maskResized = await maskImage.resize(image.width, image.height)

  // Rita originalbild på canvas och applicera masken som alpha-kanal
  const canvas = document.createElement('canvas')
  canvas.width  = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image.toCanvas(), 0, 0)

  const imageData = ctx.getImageData(0, 0, image.width, image.height)
  for (let i = 0; i < maskResized.data.length; i++) {
    imageData.data[4 * i + 3] = maskResized.data[i]
  }
  ctx.putImageData(imageData, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png')
  })
}
