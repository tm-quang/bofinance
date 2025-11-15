import { useEffect, useState } from 'react'
import { getIconNode } from '../../utils/iconLoader'
import { CATEGORY_ICON_MAP } from '../../constants/categoryIcons'

type CategoryIconProps = {
  iconId: string
  className?: string
  fallback?: React.ReactNode
}

/**
 * Component để load và hiển thị icon của category
 * Tự động load từ database hoặc fallback về hardcoded icon
 */
export const CategoryIcon = ({ iconId, className = 'h-5 w-5', fallback = null }: CategoryIconProps) => {
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
        // Try to load from database first, then fallback to hardcoded
        const node = await getIconNode(iconId)
        
        if (isMounted) {
          if (node) {
            // Clone the node and apply className if it's a React element
            if (typeof node === 'object' && node !== null && 'props' in node) {
              setIconNode(
                <span className={className}>
                  {node}
                </span>
              )
            } else {
              setIconNode(node)
            }
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
  }, [iconId, className, fallback])

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

