/**
 * Image compression utility
 * Compresses and resizes images before upload
 */

/**
 * Compress and resize image to fit avatar requirements
 * @param file - Original image file
 * @param maxWidth - Maximum width (default: 200)
 * @param maxHeight - Maximum height (default: 200)
 * @param maxSizeKB - Maximum file size in KB (default: 250)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Compressed File or null if compression fails
 */
export const compressImageForAvatar = async (
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200,
  maxSizeKB: number = 250,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width
        let height = img.height

        // Resize if needed while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Không thể tạo canvas context'))
          return
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)

        // Try different quality levels to meet size requirement
        const tryCompress = (q: number): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Không thể nén ảnh'))
                return
              }

              const sizeKB = blob.size / 1024

              // If size is acceptable or quality is too low, use this
              if (sizeKB <= maxSizeKB || q <= 0.1) {
                const compressedFile = new File(
                  [blob],
                  file.name,
                  {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  }
                )
                resolve(compressedFile)
              } else {
                // Try lower quality
                tryCompress(q - 0.1)
              }
            },
            'image/jpeg',
            q
          )
        }

        tryCompress(quality)
      }

      img.onerror = () => {
        reject(new Error('Không thể load ảnh'))
      }

      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }

    reader.onerror = () => {
      reject(new Error('Không thể đọc file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Check if file size is acceptable
 * @param file - File to check
 * @param maxSizeKB - Maximum size in KB
 * @returns true if file size is acceptable
 */
export const isFileSizeAcceptable = (file: File, maxSizeKB: number): boolean => {
  return file.size / 1024 <= maxSizeKB
}

