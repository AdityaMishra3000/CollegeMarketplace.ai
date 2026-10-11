import { createContext, useContext, useEffect, useState } from 'react'
import { hapticTap } from '../lib/native'
import { useToast } from '../components/ui/Toast'

const STORAGE_KEY = 'campusmarket_saved_products'
const SavedContext = createContext({
  savedItems: [],
  savedCount: 0,
  isSaved: () => false,
  toggleSave: () => {},
  removeSaved: () => {},
})

function loadSaved() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function SavedProvider({ children }) {
  const [savedItems, setSavedItems] = useState(loadSaved)
  const { toast } = useToast()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedItems))
    } catch {
      // Storage full or private mode
    }
  }, [savedItems])

  const isSaved = (productId) => {
    if (!productId) return false
    return savedItems.some((item) => (item._id || item.id) === productId)
  }

  const toggleSave = (product) => {
    if (!product?._id) return
    hapticTap()

    setSavedItems((prev) => {
      const exists = prev.some((item) => item._id === product._id)
      if (exists) {
        toast('Removed from saved items', { type: 'info', duration: 2000 })
        return prev.filter((item) => item._id !== product._id)
      } else {
        toast('Saved to bookmarks', { type: 'success', duration: 2000 })
        // Store lean product summary
        const summary = {
          _id: product._id,
          title: product.title,
          price: product.price,
          category: product.category,
          condition: product.condition,
          imageUrl: product.imageUrl || product.images?.[0] || '',
          images: product.images || [],
          seller: product.seller ? { name: product.seller.name } : null,
          savedAt: Date.now(),
        }
        return [summary, ...prev]
      }
    })
  }

  const removeSaved = (productId) => {
    hapticTap()
    setSavedItems((prev) => prev.filter((item) => item._id !== productId))
    toast('Removed from saved items', { type: 'info', duration: 2000 })
  }

  return (
    <SavedContext.Provider
      value={{
        savedItems,
        savedCount: savedItems.length,
        isSaved,
        toggleSave,
        removeSaved,
      }}
    >
      {children}
    </SavedContext.Provider>
  )
}

export const useSaved = () => useContext(SavedContext)
