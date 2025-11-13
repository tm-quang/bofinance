import type { IconType } from 'react-icons'
import {
  RiBankCardLine,
  RiBeerLine,
  RiBook3Line,
  RiBriefcase4Line,
  RiCalendarEventLine,
  RiCamera3Line,
  RiCapsuleLine,
  RiCarLine,
  RiChatSmile3Line,
  RiCommunityLine,
  RiFlightTakeoffLine,
  RiGamepadLine,
  RiGiftLine,
  RiHomeSmile2Line,
  RiHotelLine,
  RiKnifeLine,
  RiLightbulbLine,
  RiMentalHealthLine,
  RiMoneyDollarCircleLine,
  RiMoneyEuroCircleLine,
  RiMusic2Line,
  RiPaletteLine,
  RiPantoneLine,
  RiPlantLine,
  RiRestaurantLine,
  RiRunLine,
  RiSafeLine,
  RiShoppingBag3Line,
  RiShoppingCartLine,
  RiSparkling2Line,
  RiStockLine,
  RiSuitcase3Line,
  RiTaxiWifiLine,
  RiTeamLine,
  RiToolsLine,
  RiUserHeartLine,
  RiVipCrownLine,
} from 'react-icons/ri'

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
      { id: 'food', label: 'Ăn uống', icon: RiKnifeLine },
      { id: 'groceries', label: 'Đi chợ', icon: RiShoppingBag3Line },
      { id: 'home', label: 'Gia đình', icon: RiHomeSmile2Line },
      { id: 'transport', label: 'Đi lại', icon: RiTaxiWifiLine },
      { id: 'health', label: 'Sức khỏe', icon: RiCapsuleLine },
      { id: 'fitness', label: 'Thể thao', icon: RiRunLine },
      { id: 'car', label: 'Xe cộ', icon: RiCarLine },
      { id: 'hotel', label: 'Lưu trú', icon: RiHotelLine },
      { id: 'wellness', label: 'Thư giãn', icon: RiMentalHealthLine },
      { id: 'greenery', label: 'Cây cảnh', icon: RiPlantLine },
    ],
  },
  {
    id: 'finance',
    label: 'Tài chính',
    icons: [
      { id: 'salary', label: 'Lương thưởng', icon: RiMoneyDollarCircleLine },
      { id: 'investment', label: 'Đầu tư', icon: RiBankCardLine },
      { id: 'savings', label: 'Tiết kiệm', icon: RiSuitcase3Line },
      { id: 'business', label: 'Kinh doanh', icon: RiBriefcase4Line },
      { id: 'bonus', label: 'Thưởng', icon: RiGiftLine },
      { id: 'charity', label: 'Từ thiện', icon: RiUserHeartLine },
      { id: 'stock', label: 'Chứng khoán', icon: RiStockLine },
      { id: 'forex', label: 'Ngoại tệ', icon: RiMoneyEuroCircleLine },
      { id: 'safe', label: 'Két sắt', icon: RiSafeLine },
    ],
  },
  {
    id: 'lifestyle',
    label: 'Giải trí',
    icons: [
      { id: 'travel', label: 'Du lịch', icon: RiFlightTakeoffLine },
      { id: 'movie', label: 'Xem phim', icon: RiPantoneLine },
      { id: 'music', label: 'Âm nhạc', icon: RiMusic2Line },
      { id: 'gaming', label: 'Game', icon: RiGamepadLine },
      { id: 'party', label: 'Tiệc tùng', icon: RiSparkling2Line },
      { id: 'friends', label: 'Bạn bè', icon: RiTeamLine },
      { id: 'shopping', label: 'Mua sắm', icon: RiShoppingCartLine },
      { id: 'photography', label: 'Nhiếp ảnh', icon: RiCamera3Line },
      { id: 'art', label: 'Nghệ thuật', icon: RiPaletteLine },
      { id: 'vip', label: 'Thành viên VIP', icon: RiVipCrownLine },
    ],
  },
  {
    id: 'others',
    label: 'Khác',
    icons: [
      { id: 'education', label: 'Học tập', icon: RiBook3Line },
      { id: 'personal', label: 'Cá nhân', icon: RiChatSmile3Line },
      { id: 'service', label: 'Dịch vụ', icon: RiRestaurantLine },
      { id: 'pet', label: 'Thú cưng', icon: RiUserHeartLine },
      { id: 'gift', label: 'Quà tặng', icon: RiGiftLine },
      { id: 'other', label: 'Khác', icon: RiBeerLine },
      { id: 'community', label: 'Cộng đồng', icon: RiCommunityLine },
      { id: 'event', label: 'Sự kiện', icon: RiCalendarEventLine },
      { id: 'idea', label: 'Ý tưởng', icon: RiLightbulbLine },
      { id: 'maintenance', label: 'Sửa chữa', icon: RiToolsLine },
    ],
  },
]

export const CATEGORY_ICON_MAP = CATEGORY_ICON_GROUPS.reduce<Record<string, IconOption>>((acc, group) => {
  group.icons.forEach((icon) => {
    acc[icon.id] = icon
  })
  return acc
}, {})


