declare module 'image-size' {
  export interface ImageInfo {
    width?: number
    height?: number
    type?: string
  }

  export default function imageSize(input: Buffer | ArrayBuffer | Uint8Array): ImageInfo
}
