import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { themeConfig } from '../../../preload/types'
import { generateColorMap } from '../utils/color'

interface themeContextType {
  currentTheme: themeConfig | null
  setTheme: (id: string) => Promise<void>
  themes: themeConfig[]
}

const ThemeContext = createContext<themeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<themeConfig | null>(null)
  const [themes, setThemes] = useState<themeConfig[]>([])
  const appliedStyleKeysRef = useRef<string[]>([])
  const currentThemeRef = useRef<themeConfig | null>(null)

  const applyThemeConfig = useCallback((theme: themeConfig) => {
    const { tdesign, custom } = theme.config
    const root = document.documentElement
    const prevKeys = appliedStyleKeysRef.current
    for (const k of prevKeys) root.style.removeProperty(k)
    const nextKeys: string[] = []

    // 1. 设置 TDesign 亮/暗模式
    root.setAttribute('theme-mode', theme.mode)

    // 2. 设置 TDesign 品牌色
    if (tdesign.brandColor) {
      const colorMap = generateColorMap(tdesign.brandColor, theme.mode)
      Object.entries(colorMap).forEach(([key, value]) => {
        root.style.setProperty(key, value)
        nextKeys.push(key)
      })
    }
    if (tdesign.warningColor) {
      root.style.setProperty('--td-warning-color', tdesign.warningColor)
      nextKeys.push('--td-warning-color')
    }
    if (tdesign.errorColor) {
      root.style.setProperty('--td-error-color', tdesign.errorColor)
      nextKeys.push('--td-error-color')
    }
    if (tdesign.successColor) {
      root.style.setProperty('--td-success-color', tdesign.successColor)
      nextKeys.push('--td-success-color')
    }

    // 3. 应用自定义 CSS 变量 (用于业务 UI)
    Object.entries(custom).forEach(([key, value]) => {
      root.style.setProperty(key, value)
      nextKeys.push(key)
    })

    appliedStyleKeysRef.current = nextKeys
  }, [])

  const loadThemes = useCallback(async () => {
    if (!(window as any).api) return
    const res = await (window as any).api.getThemes()
    if (res.success && res.data) {
      setThemes(res.data)
    }
  }, [])

  const loadCurrentTheme = useCallback(async () => {
    if (!(window as any).api) return
    const res = await (window as any).api.getCurrentTheme()
    if (res.success && res.data) {
      setCurrentTheme(res.data)
      currentThemeRef.current = res.data
      applyThemeConfig(res.data)
    }
  }, [applyThemeConfig])

  useEffect(() => {
    if (!(window as any).api) return
    ;(async () => {
      await loadThemes()
      await loadCurrentTheme()
    })()

    const unsubscribe = (window as any).api.onThemeChanged((theme) => {
      setCurrentTheme(theme)
      currentThemeRef.current = theme
      applyThemeConfig(theme)
      loadThemes() // Refresh list in case of new files
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [applyThemeConfig, loadCurrentTheme, loadThemes])

  const setTheme = async (id: string) => {
    const res = await (window as any).api.setTheme(id)
    if (res.success) {
      await loadCurrentTheme()
    }
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
