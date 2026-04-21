/**
 * Date Formatting Utilities
 * Centralized date formatting for consistent display across the application
 * 
 * Standard Format: DD-MM-YYYY (e.g., 16-04-2026)
 * Backend Format: YYYY-MM-DD (ISO 8601)
 */

/**
 * Format a date to DD-MM-YYYY format
 * @param {string|Date} date - Date string or Date object
 * @param {string} fallback - Fallback value if date is invalid
 * @returns {string} Formatted date as DD-MM-YYYY or fallback
 */
export const formatDate = (date, fallback = 'N/A') => {
  if (!date) return fallback

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return fallback
    }

    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()

    return `${day}-${month}-${year}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return fallback
  }
}

/**
 * Format a date with time to DD-MM-YYYY, HH:MM format
 * @param {string|Date} date - Date string or Date object
 * @param {string} fallback - Fallback value if date is invalid
 * @returns {string} Formatted date as DD-MM-YYYY, HH:MM or fallback
 */
export const formatDateTime = (date, fallback = 'N/A') => {
  if (!date) return fallback

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return fallback
    }

    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()
    const hours = String(dateObj.getHours()).padStart(2, '0')
    const minutes = String(dateObj.getMinutes()).padStart(2, '0')

    return `${day}-${month}-${year}, ${hours}:${minutes}`
  } catch (error) {
    console.error('Error formatting datetime:', error)
    return fallback
  }
}

/**
 * Convert DD-MM-YYYY format to YYYY-MM-DD (for backend/input fields)
 * @param {string} dateString - Date in DD-MM-YYYY format
 * @returns {string} Date in YYYY-MM-DD format or empty string
 */
export const convertToInputFormat = (dateString) => {
  if (!dateString || dateString === 'N/A') return ''

  try {
    // Handle DD-MM-YYYY
    if (dateString.includes('-')) {
      const [day, month, year] = dateString.split('-')
      if (day && month && year && year.length === 4) {
        return `${year}-${month}-${day}`
      }
    }

    // Handle DD/MM/YYYY
    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/')
      if (day && month && year && year.length === 4) {
        return `${year}-${month}-${day}`
      }
    }

    // Try parsing as Date object
    const dateObj = new Date(dateString)
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    return ''
  } catch (error) {
    console.error('Error converting date format:', error)
    return ''
  }
}

/**
 * Get today's date in DD-MM-YYYY format
 * @returns {string} Today's date as DD-MM-YYYY
 */
export const getTodayFormatted = () => {
  return formatDate(new Date())
}

/**
 * Get today's date in YYYY-MM-DD format (for input min/max)
 * @returns {string} Today's date as YYYY-MM-DD
 */
export const getTodayInputFormat = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Validate if a date string is in valid DD-MM-YYYY format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid DD-MM-YYYY format
 */
export const isValidDateFormat = (dateString) => {
  if (!dateString) return false

  const pattern = /^(\d{2})-(\d{2})-(\d{4})$/
  const match = dateString.match(pattern)

  if (!match) return false

  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const year = parseInt(match[3], 10)

  // Check if date is valid
  const dateObj = new Date(year, month - 1, day)
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  )
}

/**
 * Format date for display in tables (shortened format)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted as "16 Apr 2026"
 */
export const formatDateShort = (date, fallback = 'N/A') => {
  if (!date) return fallback

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return fallback
    }

    const day = dateObj.getDate()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = monthNames[dateObj.getMonth()]
    const year = dateObj.getFullYear()

    return `${day} ${month} ${year}`
  } catch (error) {
    console.error('Error formatting short date:', error)
    return fallback
  }
}

/**
 * Calculate number of days between two dates
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {number} Number of days difference
 */
export const daysBetween = (startDate, endDate) => {
  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate
    
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  } catch (error) {
    console.error('Error calculating days between:', error)
    return 0
  }
}

/**
 * Check if a date is in the past
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export const isPastDate = (date) => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return dateObj < today
  } catch (error) {
    return false
  }
}

/**
 * Check if a date is in the future
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is in the future
 */
export const isFutureDate = (date) => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return dateObj > today
  } catch (error) {
    return false
  }
}
