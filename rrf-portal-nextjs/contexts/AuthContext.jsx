'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial check for user
    const checkUser = () => {
      const token = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')
      const storedPermissions = localStorage.getItem('permissions')

      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          
          // Merge permissions into user object if stored separately
          if (storedPermissions) {
            userData.permissions = JSON.parse(storedPermissions)
          }
          
          // Ensure permissions is always an array
          if (!Array.isArray(userData.permissions)) {
            userData.permissions = []
          }
          
          setUser(userData)
        } catch (error) {
          console.error('Error parsing user data:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('permissions')
        }
      }
      setLoading(false)
    }

    checkUser()

    // Listen for storage events for cross-tab updates only
    const handleStorageChange = (e) => {
      if (e.key === 'user' || e.key === 'token' || e.key === 'permissions') {
        checkUser()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const login = (userData, token) => {
    // Ensure permissions array exists
    const userWithPermissions = {
      ...userData,
      permissions: Array.isArray(userData.permissions) ? userData.permissions : []
    }
    
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userWithPermissions))
    localStorage.setItem('permissions', JSON.stringify(userWithPermissions.permissions))
    setUser(userWithPermissions)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('permissions')
    setUser(null)
    router.push('/login')
  }

  const updatePermissions = (newPermissions) => {
    if (user && Array.isArray(newPermissions)) {
      const updatedUser = { ...user, permissions: newPermissions }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      localStorage.setItem('permissions', JSON.stringify(newPermissions))
      setUser(updatedUser)
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading,
      permissions: user?.permissions || [],
      updatePermissions
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
