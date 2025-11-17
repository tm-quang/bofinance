/**
 * Icon Loader Utility
 * Load icons from database hoặc fallback về hardcoded icons
 */

import React from 'react'
import type { IconType } from 'react-icons'
import { getIconByName, fetchIcons, type IconRecord } from '../lib/iconService'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'

// Lazy load icon libraries to avoid bundling all icons at once
const getIconLibrary = async (library: string): Promise<Record<string, IconType> | null> => {
  try {
    let module
    switch (library) {
      case 'fa':
        module = await import('react-icons/fa')
        break
      case 'bs':
        module = await import('react-icons/bs')
        break
      case 'lu':
        module = await import('react-icons/lu')
        break
      case 'hi2':
        module = await import('react-icons/hi2')
        break
      case 'md':
        module = await import('react-icons/md')
        break
      default:
        return null
    }
    // Remove default export and return only icon components
    const { default: _, ...icons } = module
    return icons as unknown as Record<string, IconType>
  } catch {
    return null
  }
}

// Cache for loaded libraries
const libraryCache: Record<string, Record<string, IconType>> = {}

// Get icon library with caching
export const getCachedIconLibrary = async (library: string): Promise<Record<string, IconType> | null> => {
  if (libraryCache[library]) {
    return libraryCache[library]
  }
  
  const lib = await getIconLibrary(library)
  if (lib) {
    libraryCache[library] = lib
  }
  return lib
}

/**
 * Get icon component from database hoặc fallback
 */
export const getIconComponent = async (iconId: string): Promise<IconType | null> => {
  try {
    // Try to get from database first
    const icon = await getIconByName(iconId)
    
    if (icon) {
      if (icon.icon_type === 'react-icon' && icon.react_icon_name && icon.react_icon_library) {
        const library = await getCachedIconLibrary(icon.react_icon_library)
        if (library && library[icon.react_icon_name]) {
          return library[icon.react_icon_name]
        }
      }
      // If image type, return null (will be handled by image rendering)
      return null
    }
  } catch (error) {
    // Fallback to hardcoded icons
  }

  // Fallback to hardcoded CATEGORY_ICON_MAP
  const hardcodedIcon = CATEGORY_ICON_MAP[iconId]
  return hardcodedIcon?.icon || null
}

/**
 * Get icon as ReactNode từ category (ưu tiên icon_url nếu có)
 * @param iconId - ID của icon
 * @param iconUrl - URL ảnh trực tiếp từ category (optional, ưu tiên nếu có)
 * @param className - CSS class cho ảnh (optional, default: 'h-6 w-6 object-contain')
 */
export const getIconNodeFromCategory = async (
  iconId: string,
  iconUrl?: string | null,
  className?: string
): Promise<React.ReactNode> => {
  // Nếu có icon_url trực tiếp, sử dụng nó
  if (iconUrl) {
    // Sử dụng className được truyền vào hoặc default (fill vừa vặn container)
    const imgClassName = className || 'h-full w-full object-cover rounded-full'
    return React.createElement('img', {
      src: iconUrl,
      alt: '',
      className: imgClassName,
      onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
        console.warn(`Failed to load category icon_url: ${iconUrl} for iconId: ${iconId}`)
        e.currentTarget.style.display = 'none'
      },
    })
  }

  // Nếu không có icon_url, fallback về getIconNode
  return getIconNode(iconId, className)
}

/**
 * Get icon as ReactNode (component hoặc image)
 * @param iconId - ID của icon
 * @param className - CSS class cho ảnh (optional, default: 'h-6 w-6 object-contain')
 */
export const getIconNode = async (iconId: string, className?: string): Promise<React.ReactNode> => {
  // Sử dụng className được truyền vào hoặc default (fill vừa vặn container)
  const imgClassName = className || 'h-full w-full object-cover rounded-full'
  
  // Ưu tiên load từ database trước (vì database là nguồn chính)
  try {
    const icon = await getIconByName(iconId)
    
    if (icon) {
      // SVG URL
      if (icon.icon_type === 'svg-url' && icon.image_url) {
        return React.createElement('img', {
          src: icon.image_url,
          alt: icon.label,
          className: imgClassName,
          onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
            // Fallback nếu SVG URL không load được
            e.currentTarget.style.display = 'none'
          },
        })
      }

      // SVG file hoặc Image
      if ((icon.icon_type === 'svg' || icon.icon_type === 'image') && icon.image_url) {
        return React.createElement('img', {
          src: icon.image_url,
          alt: icon.label,
          className: imgClassName,
          onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
            // Fallback nếu image không load được
            console.warn(`Failed to load image icon: ${icon.image_url} for iconId: ${iconId}`)
            e.currentTarget.style.display = 'none'
          },
        })
      }
      
      // React Icon
      if (icon.icon_type === 'react-icon' && icon.react_icon_name && icon.react_icon_library) {
        try {
          const library = await getCachedIconLibrary(icon.react_icon_library)
          if (library && library[icon.react_icon_name]) {
            const IconComponent = library[icon.react_icon_name]
            return React.createElement(IconComponent, { className: 'h-6 w-6 text-slate-700' })
          } else {
            // Icon name không đúng trong library - fallback về hardcoded
            console.warn(`Icon not found in library: ${icon.react_icon_library}.${icon.react_icon_name} for iconId: ${iconId}, falling back to hardcoded icon`)
            // Sẽ fallback về hardcoded icon ở cuối function
          }
        } catch (libError) {
          // Library không load được - fallback về hardcoded
          console.error(`Error loading icon library ${icon.react_icon_library} for iconId ${iconId}:`, libError)
          // Sẽ fallback về hardcoded icon ở cuối function
        }
      }
    }
  } catch (error) {
    // Chỉ log error nếu không phải là lỗi "not found" (đó là trường hợp bình thường)
    if (error instanceof Error && !error.message.includes('not found') && !error.message.includes('PGRST116')) {
      console.error('Error loading icon from database:', iconId, error)
    }
  }

  // Fallback về hardcoded map nếu không có trong database
  const hardcodedIcon = CATEGORY_ICON_MAP[iconId]
  if (hardcodedIcon?.icon) {
    const IconComponent = hardcodedIcon.icon
    return React.createElement(IconComponent, { className: 'h-6 w-6 text-slate-700' })
  }

  // Return null để component tự xử lý fallback
  return null
}

/**
 * Load all icons grouped by group_id
 */
export const loadIconsGrouped = async (): Promise<Record<string, IconRecord[]>> => {
  try {
    const icons = await fetchIcons({ is_active: true })
    const grouped: Record<string, IconRecord[]> = {}

    icons.forEach((icon) => {
      if (!grouped[icon.group_id]) {
        grouped[icon.group_id] = []
      }
      grouped[icon.group_id].push(icon)
    })

    // Sắp xếp icons trong mỗi group theo display_order
    Object.keys(grouped).forEach((groupId) => {
      grouped[groupId].sort((a, b) => 
        (a.display_order || 0) - (b.display_order || 0)
      )
    })

    return grouped
  } catch (error) {
    // Fallback to empty
    return {}
  }
}

/**
 * Get available react-icon libraries
 */
export const getAvailableIconLibraries = async () => {
  const [fa, bs, lu, hi2, md] = await Promise.all([
    getCachedIconLibrary('fa'),
    getCachedIconLibrary('bs'),
    getCachedIconLibrary('lu'),
    getCachedIconLibrary('hi2'),
    getCachedIconLibrary('md'),
  ])
  
  return [
    { value: 'fa', label: 'Font Awesome 5 (Fa)', icons: fa ? Object.keys(fa).slice(0, 50) : [] },
    { value: 'bs', label: 'Bootstrap Icons (Bs)', icons: bs ? Object.keys(bs).slice(0, 50) : [] },
    { value: 'lu', label: 'Lucide Icons (Lu)', icons: lu ? Object.keys(lu).slice(0, 50) : [] },
    { value: 'hi2', label: 'Heroicons 2 (Hi2)', icons: hi2 ? Object.keys(hi2).slice(0, 50) : [] },
    { value: 'md', label: 'Material Design (Md)', icons: md ? Object.keys(md).slice(0, 50) : [] },
  ]
}

/**
 * Search react-icons by name
 */
export const searchReactIcons = async (library: string, searchTerm: string): Promise<string[]> => {
  const libraryMap = await getCachedIconLibrary(library)
  if (!libraryMap) return []

  const searchLower = searchTerm.toLowerCase()
  return Object.keys(libraryMap)
    .filter((name) => name.toLowerCase().includes(searchLower))
    .slice(0, 100) // Limit results
}

