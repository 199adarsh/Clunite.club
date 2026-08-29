/**
 * Avatar Utility Functions
 * Handles avatar URL generation based on user gender
 */

/**
 * Get avatar URL based on user gender
 * Returns boy.png for male, girl.png for female, or null if gender is not set
 */
export function getAvatarUrlByGender(gender: string | null | undefined): string | null {
  if (!gender) {
    return null
  }

  const normalizedGender = gender.toLowerCase().trim()
  
  if (normalizedGender === 'male') {
    return '/boy.png'
  } else if (normalizedGender === 'female') {
    return '/girl.png'
  }

  return null
}

/**
 * Get avatar URL from user data
 * Checks avatar_url first, then falls back to gender-based avatar
 */
export function getUserAvatarUrl(userData: { avatar_url?: string | null; gender?: string | null } | null): string | null {
  if (!userData) {
    return null
  }

  // If user has a custom avatar, use it
  if (userData.avatar_url) {
    return userData.avatar_url
  }

  // Otherwise, use gender-based avatar
  return getAvatarUrlByGender(userData.gender)
}

