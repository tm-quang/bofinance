/**
 * Date utilities for UTC+7 timezone (Vietnam timezone)
 * All date operations should use these utilities to ensure consistency
 */

const UTC_OFFSET_HOURS = 7 // UTC+7 for Vietnam

/**
 * Get current date/time in UTC+7
 */
export const getNowUTC7 = (): Date => {
  const now = new Date()
  // Get UTC time
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  // Add UTC+7 offset
  return new Date(utc + (UTC_OFFSET_HOURS * 3600000))
}

/**
 * Convert a Date object to UTC+7
 */
export const toUTC7 = (date: Date): Date => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
  return new Date(utc + (UTC_OFFSET_HOURS * 3600000))
}

/**
 * Create a Date object from UTC+7 date components
 */
export const createDateUTC7 = (year: number, month: number, day: number, hour: number = 0, minute: number = 0, second: number = 0, millisecond: number = 0): Date => {
  // Create date string in UTC+7 format
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(millisecond).padStart(3, '0')}+07:00`
  return new Date(dateString)
}

/**
 * Format date as YYYY-MM-DD in UTC+7 timezone
 * This ensures dates are always formatted correctly regardless of system timezone
 */
export const formatDateUTC7 = (date: Date): string => {
  const utc7Date = toUTC7(date)
  const year = utc7Date.getUTCFullYear()
  const month = String(utc7Date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc7Date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format date as YYYY-MM-DD using local date components (simpler, works if system is already UTC+7)
 * Use this when you're sure the Date object represents the correct local date
 */
export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get date components in UTC+7
 */
export const getDateComponentsUTC7 = (date: Date): { year: number; month: number; day: number; hour: number; minute: number; second: number } => {
  const utc7Date = toUTC7(date)
  return {
    year: utc7Date.getUTCFullYear(),
    month: utc7Date.getUTCMonth() + 1,
    day: utc7Date.getUTCDate(),
    hour: utc7Date.getUTCHours(),
    minute: utc7Date.getUTCMinutes(),
    second: utc7Date.getUTCSeconds(),
  }
}

/**
 * Create a Date object for the start of a day in UTC+7
 */
export const getStartOfDayUTC7 = (year: number, month: number, day: number): Date => {
  return createDateUTC7(year, month, day, 0, 0, 0, 0)
}

/**
 * Create a Date object for the end of a day in UTC+7
 */
export const getEndOfDayUTC7 = (year: number, month: number, day: number): Date => {
  return createDateUTC7(year, month, day, 23, 59, 59, 999)
}

/**
 * Get first day of month in UTC+7
 */
export const getFirstDayOfMonthUTC7 = (year: number, month: number): Date => {
  return getStartOfDayUTC7(year, month, 1)
}

/**
 * Get last day of month in UTC+7
 */
export const getLastDayOfMonthUTC7 = (year: number, month: number): Date => {
  // Get first day of next month, then subtract 1 day
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  const firstDayNextMonth = getStartOfDayUTC7(nextMonth.year, nextMonth.month, 1)
  const lastDay = new Date(firstDayNextMonth)
  lastDay.setUTCDate(lastDay.getUTCDate() - 1)
  lastDay.setUTCHours(23, 59, 59, 999)
  return lastDay
}

