import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaSearch, FaCheck, FaSpinner, FaSave, 
  FaPlus, FaTrash, FaUpload, FaDownload,
  FaChevronDown
} from 'react-icons/fa'
import type { IconType } from 'react-icons'
import { 
  getCachedIconLibrary, 
  searchReactIcons,
  getIconNode 
} from '../utils/iconLoader'
import { 
  fetchDefaultCategoriesHierarchical, 
  createDefaultCategory,
  updateDefaultCategory,
  deleteDefaultCategory,
  type DefaultCategoryRecord 
} from '../lib/defaultCategoryService'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants/defaultCategories'
import { createIcon, getIconByName, type IconInsert } from '../lib/iconService'
import { uploadToCloudinary } from '../lib/cloudinaryService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { getCachedAdminStatus } from '../lib/adminService'
import HeaderBar from '../components/layout/HeaderBar'

const ICON_LIBRARIES = [
  { value: 'fa', label: 'Font Awesome 5 (Fa)', color: 'bg-blue-500' },
  { value: 'bs', label: 'Bootstrap Icons (Bs)', color: 'bg-purple-500' },
  { value: 'lu', label: 'Lucide Icons (Lu)', color: 'bg-green-500' },
  { value: 'hi2', label: 'Heroicons 2 (Hi2)', color: 'bg-red-500' },
  { value: 'md', label: 'Material Design (Md)', color: 'bg-orange-500' },
]

type CategoryWithSource = {
  id?: string
  name: string
  type: 'Chi tiêu' | 'Thu nhập'
  icon_id: string
  parent_id?: string | null
  display_order: number
  source: 'database' | 'hardcode'
  children?: CategoryWithSource[]
}

type IconSource = 'react-icon' | 'image-upload' | 'svg-url' | 'image-url'

export default function AdminCategoriesIcon() {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  
  const [categories, setCategories] = useState<CategoryWithSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithSource | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'Chi tiêu' as 'Chi tiêu' | 'Thu nhập',
    icon_id: '',
    parent_id: null as string | null,
    display_order: 0,
  })
  
  // Icon selection state
  const [iconSource, setIconSource] = useState<IconSource>('react-icon')
  const [selectedLibrary, setSelectedLibrary] = useState('fa')
  const [iconSearchTerm, setIconSearchTerm] = useState('')
  const [iconResults, setIconResults] = useState<string[]>([])
  const [isSearchingIcons, setIsSearchingIcons] = useState(false)
  const [iconLibraryCache, setIconLibraryCache] = useState<Record<string, Record<string, IconType>>>({})
  const [selectedReactIcon, setSelectedReactIcon] = useState<{ library: string; name: string } | null>(null)
  
  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [svgUrl, setSvgUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Filter state
  const [filterType, setFilterType] = useState<'all' | 'Chi tiêu' | 'Thu nhập'>('all')
  const [categorySearchTerm, setCategorySearchTerm] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  // Data source selector
  const [dataSource, setDataSource] = useState<'local' | 'database'>('local')
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  
  // Admin check
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)

  // Load categories from both sources
  useEffect(() => {
    checkAdminStatus()
    loadCategories()
    preloadIconLibraries()
  }, [])

  const checkAdminStatus = async () => {
    setIsCheckingAdmin(true)
    try {
      const adminStatus = await getCachedAdminStatus()
      setIsUserAdmin(adminStatus)
      if (!adminStatus) {
        showError('Bạn không có quyền truy cập trang này. Chỉ admin mới có thể quản lý default categories.')
      }
    } catch (err) {
      console.error('Error checking admin status:', err)
      setIsUserAdmin(false)
    } finally {
      setIsCheckingAdmin(false)
    }
  }

  // Search icons when search term changes
  useEffect(() => {
    if (iconSearchTerm.trim() && iconSource === 'react-icon') {
      searchIcons()
    } else {
      setIconResults([])
    }
  }, [iconSearchTerm, selectedLibrary, iconSource])

  const preloadIconLibraries = async () => {
    const libraries = ['fa', 'bs', 'lu', 'hi2', 'md']
    const loaded: Record<string, Record<string, IconType>> = {}
    
    await Promise.all(
      libraries.map(async (lib) => {
        const library = await getCachedIconLibrary(lib)
        if (library) {
          loaded[lib] = library
        }
      })
    )
    
    setIconLibraryCache(loaded)
  }

  const loadCategories = async () => {
    setIsLoading(true)
    try {
      if (dataSource === 'database') {
        // Load from database only
        const dbCategories = await fetchDefaultCategoriesHierarchical()
        
        const dbCategoriesFormatted: CategoryWithSource[] = dbCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          type: cat.type,
          icon_id: cat.icon_id,
          parent_id: cat.parent_id,
          display_order: cat.display_order,
          source: 'database',
          children: cat.children?.map(child => ({
            id: child.id,
            name: child.name,
            type: child.type,
            icon_id: child.icon_id,
            parent_id: child.parent_id,
            display_order: child.display_order,
            source: 'database',
          }))
        }))

        setCategories(dbCategoriesFormatted.sort((a, b) => a.display_order - b.display_order))
      } else {
        // Load from local file (defaultCategories.ts)
        const hardcodeCategories: CategoryWithSource[] = [
          ...DEFAULT_EXPENSE_CATEGORIES.map(cat => ({
            name: cat.name,
            type: cat.type as 'Chi tiêu' | 'Thu nhập',
            icon_id: cat.icon_id,
            parent_id: null,
            display_order: cat.display_order,
            source: 'hardcode' as const,
            children: cat.children?.map(child => ({
              name: child.name,
              type: child.type as 'Chi tiêu' | 'Thu nhập',
              icon_id: child.icon_id,
              parent_id: cat.name,
              display_order: child.display_order,
              source: 'hardcode' as const,
            }))
          })),
          ...DEFAULT_INCOME_CATEGORIES.map(cat => ({
            name: cat.name,
            type: cat.type as 'Chi tiêu' | 'Thu nhập',
            icon_id: cat.icon_id,
            parent_id: null,
            display_order: cat.display_order,
            source: 'hardcode' as const,
          }))
        ]

        setCategories(hardcodeCategories.sort((a, b) => a.display_order - b.display_order))
      }
    } catch (err) {
      showError('Không thể tải danh sách hạng mục')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Reload when data source changes
  useEffect(() => {
    loadCategories()
  }, [dataSource])

  const searchIcons = async () => {
    if (!iconSearchTerm.trim() || iconSource !== 'react-icon') {
      setIconResults([])
      return
    }

    setIsSearchingIcons(true)
    try {
      const results = await searchReactIcons(selectedLibrary, iconSearchTerm)
      setIconResults(results.slice(0, 300)) // Limit to 300 results
    } catch (err) {
      console.error('Error searching icons:', err)
      setIconResults([])
    } finally {
      setIsSearchingIcons(false)
    }
  }

  const filteredCategories = useMemo(() => {
    let filtered = categories

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(cat => cat.type === filterType)
    }

    // Filter by search term
    if (categorySearchTerm.trim()) {
      const searchLower = categorySearchTerm.toLowerCase()
      filtered = filtered.filter(cat => 
        cat.name.toLowerCase().includes(searchLower) ||
        cat.children?.some(child => child.name.toLowerCase().includes(searchLower))
      )
    }

    return filtered
  }, [categories, filterType, categorySearchTerm])

  const handleSelectReactIcon = (library: string, iconName: string) => {
    setSelectedReactIcon({ library, name: iconName })
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateNew = () => {
    setIsCreating(true)
    setIsEditing(false)
    setSelectedCategory(null)
    setFormData({
      name: '',
      type: 'Chi tiêu',
      icon_id: '',
      parent_id: null,
      display_order: 0,
    })
    setIconSource('react-icon')
    setSelectedReactIcon(null)
    setImageFile(null)
    setImagePreview(null)
    setSvgUrl('')
    setImageUrl('')
  }

  const handleEdit = (category: CategoryWithSource) => {
    setIsEditing(true)
    setIsCreating(false)
    setSelectedCategory(category)
    
    // For local file, parent_id might be a name, for database it's an ID
    let parentId: string | null = category.parent_id || null
    if (dataSource === 'local' && parentId) {
      // Keep as name for local file
      parentId = parentId
    }
    
    setFormData({
      name: category.name,
      type: category.type,
      icon_id: category.icon_id,
      parent_id: parentId,
      display_order: category.display_order,
    })
    
    // Parse icon_id to determine source
    if (category.icon_id.includes(':')) {
      const [library, iconName] = category.icon_id.split(':')
      setIconSource('react-icon')
      setSelectedLibrary(library)
      setSelectedReactIcon({ library, name: iconName })
    } else if (category.icon_id.startsWith('http')) {
      if (category.icon_id.endsWith('.svg')) {
        setIconSource('svg-url')
        setSvgUrl(category.icon_id)
      } else {
        setIconSource('image-url')
        setImageUrl(category.icon_id)
      }
    } else {
      // Old icon_id format, try to find in react-icons
      setIconSource('react-icon')
      // Don't set selectedReactIcon, let user choose new icon
    }
    
    setImageFile(null)
    setImagePreview(null)
  }

  const handleDelete = async (category: CategoryWithSource) => {
    if (!category.id || category.source !== 'database') {
      showError('Chỉ có thể xóa hạng mục từ database')
      return
    }

    // Check admin permission
    if (!isUserAdmin) {
      showError('Chỉ admin mới có thể xóa default categories')
      return
    }

    if (!confirm(`Bạn có chắc muốn xóa hạng mục "${category.name}"?`)) {
      return
    }

    try {
      await deleteDefaultCategory(category.id)
      success('Đã xóa hạng mục thành công!')
      await loadCategories()
      if (selectedCategory?.id === category.id) {
        setSelectedCategory(null)
        setIsEditing(false)
      }
    } catch (err) {
      showError('Không thể xóa hạng mục')
      console.error(err)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Vui lòng nhập tên hạng mục')
      return
    }

    // Check admin permission
    if (!isUserAdmin) {
      showError('Chỉ admin mới có thể thay đổi default categories')
      return
    }

    // When editing from local file, we need to sync to database
    // When editing from database, we update directly

    setIsSaving(true)
    try {
      let iconId: string | null = null

      // Handle icon based on source - prioritize new selection
      if (iconSource === 'react-icon') {
        if (selectedReactIcon) {
          iconId = `${selectedReactIcon.library}:${selectedReactIcon.name}`
          
          // Create icon in database if not exists
          try {
            await getIconByName(iconId)
          } catch {
            const iconData: IconInsert = {
              name: iconId,
              label: `${selectedReactIcon.library.toUpperCase()}: ${selectedReactIcon.name}`,
              icon_type: 'react-icon',
              react_icon_name: selectedReactIcon.name,
              react_icon_library: selectedReactIcon.library,
              group_id: 'categories',
              group_label: 'Categories',
              display_order: 0,
            }
            await createIcon(iconData)
          }
        } else {
          // If no new icon selected, use existing icon_id
          iconId = formData.icon_id || null
        }
      } else if (iconSource === 'image-upload') {
        if (imageFile) {
          setIsUploading(true)
          const uploadResult = await uploadToCloudinary(imageFile, {
            useDefaultIconFolder: true, // Sử dụng VITE_CLOUDINARY_ICON_FOLDER nếu có, nếu không thì dùng 'category-icons'
            folder: 'category-icons', // Fallback nếu không có VITE_CLOUDINARY_ICON_FOLDER
          })
          const uploadedUrl = uploadResult.secure_url
          
          // Create icon in database
          const iconData: IconInsert = {
            name: `image:${Date.now()}`,
            label: formData.name,
            icon_type: 'image',
            image_url: uploadedUrl,
            group_id: 'categories',
            group_label: 'Categories',
            display_order: 0,
          }
          const createdIcon = await createIcon(iconData)
          iconId = createdIcon.name
          setIsUploading(false)
        } else {
          // If no new file, use existing icon_id
          iconId = formData.icon_id || null
        }
      } else if (iconSource === 'svg-url') {
        if (svgUrl.trim()) {
          const svgUrlValue = svgUrl.trim()
          
          // Create icon in database
          const iconData: IconInsert = {
            name: `svg:${Date.now()}`,
            label: formData.name,
            icon_type: 'svg-url',
            image_url: svgUrlValue,
            group_id: 'categories',
            group_label: 'Categories',
            display_order: 0,
          }
          const createdIcon = await createIcon(iconData)
          iconId = createdIcon.name
        } else {
          // If no new URL, use existing icon_id
          iconId = formData.icon_id || null
        }
      } else if (iconSource === 'image-url') {
        if (imageUrl.trim()) {
          const imageUrlValue = imageUrl.trim()
          
          // Create icon in database
          const iconData: IconInsert = {
            name: `img:${Date.now()}`,
            label: formData.name,
            icon_type: 'image',
            image_url: imageUrlValue,
            group_id: 'categories',
            group_label: 'Categories',
            display_order: 0,
          }
          const createdIcon = await createIcon(iconData)
          iconId = createdIcon.name
        } else {
          // If no new URL, use existing icon_id
          iconId = formData.icon_id || null
        }
      } else {
        // Fallback to existing icon_id
        iconId = formData.icon_id || null
      }

      if (!iconId) {
        showError('Vui lòng chọn hoặc tải lên icon')
        setIsSaving(false)
        setIsUploading(false)
        return
      }

      if (isCreating) {
        // Only allow create when data source is database
        if (dataSource !== 'database') {
          showError('Vui lòng chuyển sang chế độ "Database" để tạo hạng mục mới')
          return
        }
        
        // Create new category
        await createDefaultCategory({
          name: formData.name.trim(),
          type: formData.type,
          icon_id: iconId,
          parent_id: formData.parent_id,
          display_order: formData.display_order,
        })
        success('Đã tạo hạng mục mới thành công!')
      } else if (isEditing) {
        if (dataSource === 'database' && selectedCategory?.id) {
          // Update existing category in database
          await updateDefaultCategory(selectedCategory.id, {
            name: formData.name.trim(),
            type: formData.type,
            icon_id: iconId,
            parent_id: formData.parent_id,
            display_order: formData.display_order,
          })
          success('Đã cập nhật hạng mục thành công!')
        } else if (dataSource === 'local') {
          // Sync single category from local to database
          // Check if category exists in database
          const existingCategories = await fetchDefaultCategoriesHierarchical()
          const existing = existingCategories
            .flatMap(cat => [cat, ...(cat.children || [])])
            .find(cat => cat.name === selectedCategory?.name && cat.type === formData.type)
          
          // Resolve parent_id if needed
          let resolvedParentId: string | null = null
          if (formData.parent_id) {
            // formData.parent_id might be a name (from local) or ID (from database)
            const parentCategory = existingCategories
              .flatMap(cat => [cat, ...(cat.children || [])])
              .find(cat => cat.id === formData.parent_id || cat.name === formData.parent_id)
            resolvedParentId = parentCategory?.id || null
          }
          
          if (existing) {
            // Update existing
            await updateDefaultCategory(existing.id, {
              name: formData.name.trim(),
              type: formData.type,
              icon_id: iconId,
              parent_id: resolvedParentId,
              display_order: formData.display_order,
            })
            success('Đã cập nhật hạng mục trong Database thành công!')
          } else {
            // Create new
            await createDefaultCategory({
              name: formData.name.trim(),
              type: formData.type,
              icon_id: iconId,
              parent_id: resolvedParentId,
              display_order: formData.display_order,
            })
            success('Đã tạo hạng mục mới trong Database thành công!')
          }
        }
      }

      // Reload categories to show updated icon
      await loadCategories()
      
      // Reset form state
      setIsCreating(false)
      setIsEditing(false)
      setSelectedCategory(null)
      setFormData({
        name: '',
        type: 'Chi tiêu',
        icon_id: '',
        parent_id: null,
        display_order: 0,
      })
      // Reset icon selection state
      setSelectedReactIcon(null)
      setImageFile(null)
      setImagePreview(null)
      setSvgUrl('')
      setImageUrl('')
      setIconSource('react-icon')
    } catch (err) {
      showError('Không thể lưu hạng mục: ' + (err instanceof Error ? err.message : 'Unknown error'))
      console.error(err)
    } finally {
      setIsSaving(false)
      setIsUploading(false)
    }
  }

  // Sync all local categories to database
  const handleSyncToDatabase = async () => {
    if (dataSource !== 'local') {
      showError('Chỉ có thể đồng bộ khi đang xem dữ liệu từ Local File')
      return
    }

    // Check admin permission
    if (!isUserAdmin) {
      showError('Chỉ admin mới có thể đồng bộ default categories')
      return
    }

    if (!confirm('Bạn có chắc muốn đồng bộ tất cả hạng mục từ Local File lên Database? Các hạng mục đã tồn tại sẽ được cập nhật, hạng mục mới sẽ được tạo.')) {
      return
    }

    setIsSyncing(true)
    try {
      // Get all categories from local file (flat list with hierarchy)
      const allLocalCategories: Array<{
        name: string
        type: 'Chi tiêu' | 'Thu nhập'
        icon_id: string
        parent_id: string | null
        display_order: number
        parentName?: string
      }> = []

      // Process expense categories
      DEFAULT_EXPENSE_CATEGORIES.forEach(parent => {
        allLocalCategories.push({
          name: parent.name,
          type: 'Chi tiêu',
          icon_id: parent.icon_id,
          parent_id: null,
          display_order: parent.display_order,
        })

        if (parent.children) {
          parent.children.forEach(child => {
            allLocalCategories.push({
              name: child.name,
              type: 'Chi tiêu',
              icon_id: child.icon_id,
              parent_id: parent.name, // Temporary, will resolve to ID
              display_order: child.display_order,
              parentName: parent.name,
            })
          })
        }
      })

      // Process income categories
      DEFAULT_INCOME_CATEGORIES.forEach(cat => {
        allLocalCategories.push({
          name: cat.name,
          type: 'Thu nhập',
          icon_id: cat.icon_id,
          parent_id: null,
          display_order: cat.display_order,
        })
      })

      // Get existing categories from database
      const existingCategories = await fetchDefaultCategoriesHierarchical()
      const existingMap = new Map<string, DefaultCategoryRecord>()
      const existingByName = new Map<string, DefaultCategoryRecord>()

      const flattenCategories = (cats: typeof existingCategories) => {
        cats.forEach(cat => {
          existingMap.set(cat.id, cat)
          existingByName.set(cat.name, cat)
          if (cat.children) {
            flattenCategories(cat.children)
          }
        })
      }
      flattenCategories(existingCategories)

      // Create parent mapping: name -> id
      const parentNameToId = new Map<string, string>()
      existingCategories.forEach(cat => {
        parentNameToId.set(cat.name, cat.id)
      })

      // Process parents first
      const parentCategories = allLocalCategories.filter(cat => !cat.parentName)
      const parentIdMap = new Map<string, string>()

      for (const localCat of parentCategories) {
        const existing = existingByName.get(localCat.name)
        
        // Ensure icon exists in database
        let iconId = localCat.icon_id
        if (!iconId.includes(':') && !iconId.startsWith('http')) {
          // Try to find in hardcoded icons or create placeholder
          try {
            await getIconByName(iconId)
          } catch {
            // Icon doesn't exist, create a placeholder
            const iconData: IconInsert = {
              name: iconId,
              label: localCat.name,
              icon_type: 'react-icon',
              react_icon_name: iconId,
              react_icon_library: 'fa',
              group_id: 'categories',
              group_label: 'Categories',
              display_order: 0,
            }
            try {
              await createIcon(iconData)
            } catch {
              // If creation fails, use existing icon_id
            }
          }
        }

        if (existing) {
          // Update existing
          await updateDefaultCategory(existing.id, {
            name: localCat.name,
            type: localCat.type,
            icon_id: iconId,
            parent_id: null,
            display_order: localCat.display_order,
          })
          parentIdMap.set(localCat.name, existing.id)
        } else {
          // Create new
          const created = await createDefaultCategory({
            name: localCat.name,
            type: localCat.type,
            icon_id: iconId,
            parent_id: null,
            display_order: localCat.display_order,
          })
          parentIdMap.set(localCat.name, created.id)
        }
      }

      // Process children
      const childCategories = allLocalCategories.filter(cat => cat.parentName)
      for (const localCat of childCategories) {
        const parentId = parentIdMap.get(localCat.parentName!)
        if (!parentId) {
          console.warn(`Parent not found for ${localCat.name}`)
          continue
        }

        // Ensure icon exists
        let iconId = localCat.icon_id
        if (!iconId.includes(':') && !iconId.startsWith('http')) {
          try {
            await getIconByName(iconId)
          } catch {
            const iconData: IconInsert = {
              name: iconId,
              label: localCat.name,
              icon_type: 'react-icon',
              react_icon_name: iconId,
              react_icon_library: 'fa',
              group_id: 'categories',
              group_label: 'Categories',
              display_order: 0,
            }
            try {
              await createIcon(iconData)
            } catch {
              // Continue with existing icon_id
            }
          }
        }

        // Check if child exists (by name and parent)
        const existingChildren = existingCategories
          .flatMap(cat => cat.children || [])
          .find(cat => cat.name === localCat.name && cat.parent_id === parentId)

        if (existingChildren) {
          // Update existing
          await updateDefaultCategory(existingChildren.id, {
            name: localCat.name,
            type: localCat.type,
            icon_id: iconId,
            parent_id: parentId,
            display_order: localCat.display_order,
          })
        } else {
          // Create new
          await createDefaultCategory({
            name: localCat.name,
            type: localCat.type,
            icon_id: iconId,
            parent_id: parentId,
            display_order: localCat.display_order,
          })
        }
      }

      success('Đã đồng bộ tất cả hạng mục lên Database thành công!')
      
      // Switch to database view
      setDataSource('database')
      await loadCategories()
    } catch (err) {
      showError('Không thể đồng bộ: ' + (err instanceof Error ? err.message : 'Unknown error'))
      console.error(err)
    } finally {
      setIsSyncing(false)
    }
  }

  const renderIconPreview = (library: string, iconName: string) => {
    const libraryMap = iconLibraryCache[library]
    if (!libraryMap || !libraryMap[iconName]) {
      return <div className="h-8 w-8 flex items-center justify-center text-gray-400">?</div>
    }

    const IconComponent = libraryMap[iconName]
    return <IconComponent className="h-8 w-8" />
  }

  // Component to render category icon
  const CategoryIcon = ({ iconId, key }: { iconId: string; key?: string }) => {
    const [iconNode, setIconNode] = useState<React.ReactNode>(null)
    
    useEffect(() => {
      let isMounted = true
      setIconNode(null) // Clear previous icon while loading
      
      getIconNode(iconId)
        .then((node) => {
          if (isMounted) {
            setIconNode(node)
          }
        })
        .catch(() => {
          if (isMounted) {
            setIconNode(<div className="h-6 w-6 flex items-center justify-center text-gray-400">?</div>)
          }
        })
      
      return () => {
        isMounted = false
      }
    }, [iconId, key])
    
    return <>{iconNode || <div className="h-6 w-6 flex items-center justify-center text-gray-400">?</div>}</>
  }

  const parentCategories = useMemo(() => {
    return categories.filter(cat => !cat.parent_id)
  }, [categories])

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName)
      } else {
        newSet.add(categoryName)
      }
      return newSet
    })
  }

  // Close expanded categories when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if click is outside category list
      if (!target.closest('.category-list-container')) {
        setExpandedCategories(new Set())
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Show loading or access denied
  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-sky-500 text-3xl mx-auto mb-4" />
          <p className="text-slate-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    )
  }

  if (!isUserAdmin) {
    return (
      <div className="min-h-screen bg-[#F7F9FC]">
        <HeaderBar 
          variant="page" 
          title="QUẢN LÝ ICON HẠNG MỤC" 
          onBack={() => navigate('/settings')}
        />
        <main className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Không có quyền truy cập</h2>
            <p className="text-slate-600 mb-4">
              Chỉ admin mới có thể truy cập trang quản lý default categories.
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition"
            >
              Quay lại
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <HeaderBar 
        variant="page" 
        title="QUẢN LÝ ICON HẠNG MỤC" 
        onBack={() => navigate('/settings')}
      />

      <main className="w-full h-[calc(100vh-80px)]">
        <div className="grid grid-cols-12 gap-4 h-full p-4">
          {/* Left Panel: Categories List - 3 columns */}
          <div className="col-span-3 bg-white rounded-xl shadow-lg p-4 flex flex-col overflow-hidden">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Danh sách Hạng mục</h2>
              
              {/* Data Source Selector */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nguồn dữ liệu
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDataSource('local')}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                      dataSource === 'local'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Local File
                  </button>
                  <button
                    onClick={() => setDataSource('database')}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                      dataSource === 'database'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Database
                  </button>
                </div>
              </div>

              {/* Sync Button (only show when viewing local) */}
              {dataSource === 'local' && (
                <button
                  onClick={handleSyncToDatabase}
                  disabled={isSyncing}
                  className="w-full mb-3 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Đang đồng bộ...
                    </>
                  ) : (
                    <>
                      <FaDownload />
                      Đồng bộ lên Database
                    </>
                  )}
                </button>
              )}

              {/* Add New Button (only show when viewing database) */}
              {dataSource === 'database' && (
                <button
                  onClick={handleCreateNew}
                  className="w-full mb-3 px-3 py-1.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition flex items-center justify-center gap-2 text-sm"
                >
                  <FaPlus className="text-xs" />
                  Thêm mới
                </button>
              )}
            </div>
            
            {/* Filters */}
            <div className="mb-4 space-y-2">
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterType('all')}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                    filterType === 'all'
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setFilterType('Chi tiêu')}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                    filterType === 'Chi tiêu'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Chi tiêu
                </button>
                <button
                  onClick={() => setFilterType('Thu nhập')}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                    filterType === 'Thu nhập'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Thu nhập
                </button>
              </div>

              <div className="relative">
                <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  value={categorySearchTerm}
                  onChange={(e) => setCategorySearchTerm(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto category-list-container min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-sky-500 text-xl" />
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Không tìm thấy hạng mục nào
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCategories.map((category) => {
                    const isExpanded = expandedCategories.has(category.name)
                    const hasChildren = category.children && category.children.length > 0
                    
                    return (
                      <div key={`${category.source}-${category.name}`}>
                        <div
                          className={`group p-2 rounded-lg border transition cursor-pointer ${
                            selectedCategory?.name === category.name && selectedCategory?.source === category.source
                              ? 'border-sky-500 bg-sky-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (hasChildren) {
                              toggleCategory(category.name)
                            }
                            handleEdit(category)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {hasChildren ? (
                              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                <FaChevronDown 
                                  className={`text-xs text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                />
                              </div>
                            ) : (
                              <div className="w-4" />
                            )}
                            <div className="h-6 w-6 flex items-center justify-center shrink-0">
                              <CategoryIcon key={`${category.source}-${category.name}-${category.icon_id}`} iconId={category.icon_id} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-900 truncate">{category.name}</div>
                              <div className="text-xs text-slate-500">
                                {category.type} • {category.source === 'database' ? 'DB' : 'HC'}
                                {hasChildren && category.children && ` • ${category.children.length} con`}
                              </div>
                            </div>
                            {category.source === 'database' && category.id && dataSource === 'database' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(category)
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:bg-rose-50 rounded transition"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Children - Only show when expanded */}
                        {hasChildren && isExpanded && category.children && (
                          <div className="ml-6 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                            {category.children.map((child) => (
                              <div
                                key={`${child.source}-${child.name}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEdit(child)
                                }}
                                className={`p-1.5 rounded border text-xs transition cursor-pointer ${
                                  selectedCategory?.name === child.name && selectedCategory?.source === child.source
                                    ? 'border-sky-500 bg-sky-50'
                                    : 'border-slate-100 hover:border-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="h-5 w-5 flex items-center justify-center shrink-0">
                                    <CategoryIcon key={`${child.source}-${child.name}-${child.icon_id}`} iconId={child.icon_id} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-700 truncate">{child.name}</div>
                                  </div>
                                  {child.source === 'database' && child.id && dataSource === 'database' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDelete(child)
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 text-rose-500 hover:bg-rose-50 rounded transition"
                                    >
                                      <FaTrash className="text-[10px]" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Middle Panel: Form - 4 columns */}
          <div className="col-span-4 bg-white rounded-xl shadow-lg p-4 flex flex-col overflow-hidden">
            <h2 className="text-lg font-bold text-slate-900 mb-4 shrink-0">
              {isCreating ? 'Thêm Hạng mục mới' : isEditing ? 'Chỉnh sửa Hạng mục' : 'Chọn hạng mục để chỉnh sửa'}
            </h2>

            {(isCreating || isEditing) && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tên hạng mục <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nhập tên hạng mục..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-sky-500 focus:outline-none"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Loại <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Chi tiêu' | 'Thu nhập' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-sky-500 focus:outline-none"
                  >
                    <option value="Chi tiêu">Chi tiêu</option>
                    <option value="Thu nhập">Thu nhập</option>
                  </select>
                </div>

                {/* Parent */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Hạng mục cha (tùy chọn)
                  </label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-sky-500 focus:outline-none"
                  >
                    <option value="">Không có (Hạng mục cha)</option>
                    {parentCategories
                      .filter(cat => cat.type === formData.type)
                      .map(cat => (
                        <option key={cat.id || cat.name} value={dataSource === 'database' ? (cat.id || '') : cat.name}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Display Order */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-sky-500 focus:outline-none"
                  />
                </div>

                {/* Icon Source Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nguồn Icon <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIconSource('react-icon')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        iconSource === 'react-icon'
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      React Icons
                    </button>
                    <button
                      onClick={() => setIconSource('image-upload')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        iconSource === 'image-upload'
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Tải ảnh lên
                    </button>
                    <button
                      onClick={() => setIconSource('svg-url')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        iconSource === 'svg-url'
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      SVG URL
                    </button>
                    <button
                      onClick={() => setIconSource('image-url')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        iconSource === 'image-url'
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Ảnh URL
                    </button>
                  </div>
                </div>

                {/* Icon Preview */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-sm font-medium text-slate-700 mb-2">Preview Icon:</div>
                  <div className="flex items-center gap-3">
                    {iconSource === 'react-icon' && selectedReactIcon && (
                      <div className="h-12 w-12 flex items-center justify-center bg-white rounded-lg border border-slate-200">
                        {renderIconPreview(selectedReactIcon.library, selectedReactIcon.name)}
                      </div>
                    )}
                    {iconSource === 'image-upload' && imagePreview && (
                      <img src={imagePreview} alt="Preview" className="h-12 w-12 object-contain bg-white rounded-lg border border-slate-200" />
                    )}
                    {iconSource === 'svg-url' && svgUrl && (
                      <img src={svgUrl} alt="SVG" className="h-12 w-12 object-contain bg-white rounded-lg border border-slate-200" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    )}
                    {iconSource === 'image-url' && imageUrl && (
                      <img src={imageUrl} alt="Image" className="h-12 w-12 object-contain bg-white rounded-lg border border-slate-200" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    )}
                    <div className="text-xs text-slate-500">
                      {iconSource === 'react-icon' && selectedReactIcon && `${selectedReactIcon.library}:${selectedReactIcon.name}`}
                      {iconSource === 'image-upload' && imageFile && imageFile.name}
                      {iconSource === 'svg-url' && svgUrl}
                      {iconSource === 'image-url' && imageUrl}
                    </div>
                  </div>
                </div>

                {/* Buttons - Using ModalFooterButtons style but vertical layout */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || isUploading}
                    className="w-full py-3 bg-blue-600 text-white font-semibold rounded-3xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    {isSaving || isUploading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        {isUploading ? 'Đang tải ảnh...' : 'Đang lưu...'}
                      </>
                    ) : (
                      <>
                        <FaSave />
                        {isCreating ? 'Tạo mới' : 'Cập nhật'}
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setIsEditing(false)
                      setSelectedCategory(null)
                    }}
                    className="w-full py-2 border-2 border-red-200 bg-white text-red-600 font-medium rounded-xl hover:bg-red-50 hover:border-red-300 transition"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Icon Search - 5 columns */}
          <div className="col-span-5 bg-white rounded-xl shadow-lg p-4 flex flex-col overflow-hidden">
            <h2 className="text-lg font-bold text-slate-900 mb-4 shrink-0">Tìm kiếm Icon</h2>

            {iconSource === 'react-icon' && (
              <>
                {/* Library Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Thư viện Icon
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ICON_LIBRARIES.map((lib) => (
                      <button
                        key={lib.value}
                        onClick={() => {
                          setSelectedLibrary(lib.value)
                          setIconSearchTerm('')
                          setIconResults([])
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          selectedLibrary === lib.value
                            ? `${lib.color} text-white`
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {lib.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Search */}
                <div className="mb-4">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={iconSearchTerm}
                      onChange={(e) => setIconSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm icon (ví dụ: home, user, star...)"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:border-sky-500 focus:outline-none"
                    />
                    {isSearchingIcons && (
                      <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Icon Results */}
                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                  <div className="text-sm text-slate-600 mb-2 shrink-0">
                    {iconResults.length > 0 
                      ? `Tìm thấy ${iconResults.length} icon${iconResults.length > 1 ? 's' : ''}`
                      : iconSearchTerm.trim() 
                        ? 'Không tìm thấy icon nào'
                        : 'Nhập từ khóa để tìm kiếm icon'
                    }
                  </div>
                  
                  <div className="grid grid-cols-8 gap-2 pb-2">
                    {iconResults.map((iconName) => {
                      const isSelected = selectedReactIcon?.library === selectedLibrary && selectedReactIcon?.name === iconName
                      return (
                        <button
                          key={iconName}
                          onClick={() => handleSelectReactIcon(selectedLibrary, iconName)}
                          className={`relative p-2 rounded-lg border-2 transition hover:scale-105 ${
                            isSelected
                              ? 'border-sky-500 bg-sky-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          title={iconName}
                        >
                          <div className="flex flex-col items-center gap-1">
                            {renderIconPreview(selectedLibrary, iconName)}
                            <div className="text-[9px] text-slate-600 truncate w-full text-center">
                              {iconName}
                            </div>
                            {isSelected && (
                              <div className="absolute top-0.5 right-0.5 bg-sky-500 rounded-full p-0.5">
                                <FaCheck className="text-white text-[8px]" />
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {iconSource === 'image-upload' && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition flex items-center gap-2"
                >
                  <FaUpload />
                  Chọn ảnh để tải lên
                </button>
                {imagePreview && (
                  <div className="text-center">
                    <img src={imagePreview} alt="Preview" className="max-w-full max-h-64 mx-auto rounded-lg border border-slate-200" />
                    <p className="text-sm text-slate-600 mt-2">{imageFile?.name}</p>
                  </div>
                )}
                <p className="text-xs text-slate-500 text-center">
                  Ảnh sẽ được tải lên Cloudinary và lưu vào database
                </p>
              </div>
            )}

            {iconSource === 'svg-url' && (
              <div className="flex-1 flex flex-col space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    SVG URL
                  </label>
                  <input
                    type="url"
                    value={svgUrl}
                    onChange={(e) => setSvgUrl(e.target.value)}
                    placeholder="https://example.com/icon.svg"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-sky-500 focus:outline-none"
                  />
                </div>
                {svgUrl && (
                  <div className="flex-1 flex items-center justify-center">
                    <img src={svgUrl} alt="SVG Preview" className="max-w-full max-h-64 rounded-lg border border-slate-200" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  </div>
                )}
              </div>
            )}

            {iconSource === 'image-url' && (
              <div className="flex-1 flex flex-col space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/icon.png"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-sky-500 focus:outline-none"
                  />
                </div>
                {imageUrl && (
                  <div className="flex-1 flex items-center justify-center">
                    <img src={imageUrl} alt="Image Preview" className="max-w-full max-h-64 rounded-lg border border-slate-200" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
