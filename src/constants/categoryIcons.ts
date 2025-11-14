import type { IconType } from 'react-icons'
// Sử dụng Font Awesome 5
import {
  FaUtensils,
  FaShoppingBag,
  FaHome,
  FaTaxi,
  FaPills,
  FaRunning,
  FaCar,
  FaHotel,
  FaHeart,
  FaLeaf,
  FaDollarSign,
  FaChartLine,
  FaBriefcase,
  FaGift,
  FaHandHoldingHeart,
  FaEuroSign,
  FaLock,
  FaPlane,
  FaFilm,
  FaMusic,
  FaGamepad,
  FaGlassCheers,
  FaUsers,
  FaShoppingCart,
  FaCamera,
  FaPalette,
  FaCrown,
  FaBook,
  FaCommentDots,
  FaStore,
  FaDog,
  FaBeer,
  FaUsersCog,
  FaCalendarAlt,
  FaLightbulb,
  FaTools,
} from 'react-icons/fa'

export type IconOption = {
  id: string
  label: string
  icon: IconType
}

export type IconGroup = {
  id: string
  label: string
  icons: IconOption[]
}

export const CATEGORY_ICON_GROUPS: IconGroup[] = [
  {
    id: 'life',
    label: 'Sinh hoạt',
    icons: [
      { id: 'food', label: 'Ăn uống', icon: FaUtensils },
      { id: 'groceries', label: 'Đi chợ', icon: FaShoppingBag },
      { id: 'home', label: 'Gia đình', icon: FaHome },
      { id: 'transport', label: 'Đi lại', icon: FaTaxi },
      { id: 'health', label: 'Sức khỏe', icon: FaPills },
      { id: 'fitness', label: 'Thể thao', icon: FaRunning },
      { id: 'car', label: 'Xe cộ', icon: FaCar },
      { id: 'hotel', label: 'Lưu trú', icon: FaHotel },
      { id: 'wellness', label: 'Thư giãn', icon: FaHeart },
      { id: 'greenery', label: 'Cây cảnh', icon: FaLeaf },
    ],
  },
  {
    id: 'finance',
    label: 'Tài chính',
    icons: [
      { id: 'salary', label: 'Lương thưởng', icon: FaDollarSign },
      { id: 'investment', label: 'Đầu tư', icon: FaChartLine },
      { id: 'savings', label: 'Tiết kiệm', icon: FaBriefcase },
      { id: 'business', label: 'Kinh doanh', icon: FaBriefcase },
      { id: 'bonus', label: 'Thưởng', icon: FaGift },
      { id: 'charity', label: 'Từ thiện', icon: FaHandHoldingHeart },
      { id: 'stock', label: 'Chứng khoán', icon: FaChartLine },
      { id: 'forex', label: 'Ngoại tệ', icon: FaEuroSign },
      { id: 'safe', label: 'Két sắt', icon: FaLock },
    ],
  },
  {
    id: 'lifestyle',
    label: 'Giải trí',
    icons: [
      { id: 'travel', label: 'Du lịch', icon: FaPlane },
      { id: 'movie', label: 'Xem phim', icon: FaFilm },
      { id: 'music', label: 'Âm nhạc', icon: FaMusic },
      { id: 'gaming', label: 'Game', icon: FaGamepad },
      { id: 'party', label: 'Tiệc tùng', icon: FaGlassCheers },
      { id: 'friends', label: 'Bạn bè', icon: FaUsers },
      { id: 'shopping', label: 'Mua sắm', icon: FaShoppingCart },
      { id: 'photography', label: 'Nhiếp ảnh', icon: FaCamera },
      { id: 'art', label: 'Nghệ thuật', icon: FaPalette },
      { id: 'vip', label: 'Thành viên VIP', icon: FaCrown },
    ],
  },
  {
    id: 'others',
    label: 'Khác',
    icons: [
      { id: 'education', label: 'Học tập', icon: FaBook },
      { id: 'personal', label: 'Cá nhân', icon: FaCommentDots },
      { id: 'service', label: 'Dịch vụ', icon: FaStore },
      { id: 'pet', label: 'Thú cưng', icon: FaDog },
      { id: 'gift', label: 'Quà tặng', icon: FaGift },
      { id: 'other', label: 'Khác', icon: FaBeer },
      { id: 'community', label: 'Cộng đồng', icon: FaUsersCog },
      { id: 'event', label: 'Sự kiện', icon: FaCalendarAlt },
      { id: 'idea', label: 'Ý tưởng', icon: FaLightbulb },
      { id: 'maintenance', label: 'Sửa chữa', icon: FaTools },
    ],
  },
]

export const CATEGORY_ICON_MAP = CATEGORY_ICON_GROUPS.reduce<Record<string, IconOption>>((acc, group) => {
  group.icons.forEach((icon) => {
    acc[icon.id] = icon
  })
  return acc
}, {})
