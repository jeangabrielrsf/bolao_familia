import { DOMMatrix, ImageData } from 'canvas'

if (!globalThis.DOMMatrix) {
  globalThis.DOMMatrix = DOMMatrix as unknown as typeof globalThis.DOMMatrix
}
if (!globalThis.ImageData) {
  globalThis.ImageData = ImageData as unknown as typeof globalThis.ImageData
}
