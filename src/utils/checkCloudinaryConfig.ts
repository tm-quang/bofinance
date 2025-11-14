/**
 * Utility to check Cloudinary configuration
 * Use this to debug environment variables
 */

export const checkCloudinaryConfig = () => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  const baseFolder = import.meta.env.VITE_CLOUDINARY_BASE_FOLDER || 'bofin'

  return {
    cloudName,
    uploadPreset,
    baseFolder,
    isValid: !!cloudName && !!uploadPreset,
  }
}

