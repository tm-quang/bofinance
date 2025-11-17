import { useEffect, useState } from 'react'
import { getIconNodeFromCategory } from '../../utils/iconLoader'
import { CATEGORY_ICON_MAP } from '../../constants/categoryIcons'

type CategoryIconProps = {
  iconId: string
  iconUrl?: string | null // URL ảnh từ category (optional, ưu tiên nếu có)
  className?: string
  fallback?: React.ReactNode
}

/**
 * Component để load và hiển thị icon của category
 * Tự động load từ database hoặc fallback về hardcoded icon
 * Ưu tiên sử dụng icon_url nếu có
 */
export const CategoryIcon = ({ iconId, iconUrl, className = 'h-5 w-5', fallback = null }: CategoryIconProps) => {
  const [iconNode, setIconNode] = useState<React.ReactNode>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadIcon = async () => {
      if (!iconId) {
        if (isMounted) {
          setIconNode(fallback)
          setIsLoading(false)
        }
        return
      }

      try {
        // Ưu tiên sử dụng icon_url từ category nếu có, sau đó mới load từ database
        // Truyền className vào để ảnh fill vừa vặn container
        const node = await getIconNodeFromCategory(iconId, iconUrl, 'h-full w-full object-cover rounded-full')
        
        if (isMounted) {
          if (node) {
            // Wrap trong container với className để control kích thước, rounded-full
            setIconNode(
              <span className={`${className} flex items-center justify-center rounded-full overflow-hidden`}>
                {node}
              </span>
            )
          } else {
            // Fallback to hardcoded icon
            const hardcodedIcon = CATEGORY_ICON_MAP[iconId]
            if (hardcodedIcon?.icon) {
              const IconComponent = hardcodedIcon.icon
              setIconNode(<IconComponent className={className} />)
            } else {
              setIconNode(fallback)
            }
          }
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error loading category icon:', iconId, error)
        if (isMounted) {
          // Fallback to hardcoded icon on error
          const hardcodedIcon = CATEGORY_ICON_MAP[iconId]
          if (hardcodedIcon?.icon) {
            const IconComponent = hardcodedIcon.icon
            setIconNode(<IconComponent className={className} />)
          } else {
            setIconNode(fallback)
          }
          setIsLoading(false)
        }
      }
    }

    loadIcon()

    return () => {
      isMounted = false
    }
  }, [iconId, iconUrl, className, fallback])

  if (isLoading) {
    return <span className={`${className} animate-pulse bg-slate-200 rounded`} />
  }

  // Nếu không có icon, hiển thị fallback hoặc chữ cái đầu
  if (!iconNode) {
    if (fallback) {
      return <>{fallback}</>
    }
    // Fallback mặc định: hiển thị chữ cái đầu của iconId
    return (
      <span className={`${className} flex items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs font-semibold`}>
        {iconId?.[0]?.toUpperCase() || '?'}
      </span>
    )
  }

  return <>{iconNode}</>
}

