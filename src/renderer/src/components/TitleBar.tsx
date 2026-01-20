import React, { useState, useEffect } from 'react'
import { Space, Button, Tag } from 'tdesign-react'
import { useTheme } from '../contexts/ThemeContext'

interface TitleBarProps {
  permission: 'admin' | 'points' | 'view'
  hasAnyPassword: boolean
  onAuthClick: () => void
  onLogout: () => void
  className?: string
  style?: React.CSSProperties
}

interface WindowControlsOverlay {
  visible: boolean
  getBoundingClientRect(): DOMRect
}

interface NavigatorWithWCO extends Navigator {
  windowControlsOverlay?: WindowControlsOverlay
}

export function TitleBar({
  permission,
  hasAnyPassword,
  onAuthClick,
  onLogout,
  className,
  style
}: TitleBarProps): React.JSX.Element {
  const { currentTheme } = useTheme()
  const [overlayHeight, setOverlayHeight] = useState(48) // 默认高度
  const [overlayVisible, setOverlayVisible] = useState(false)

  // 监听window-controls-overlay变化
  useEffect(() => {
    const navigatorWithWCO = navigator as NavigatorWithWCO

    const updateOverlayInfo = () => {
      if (navigatorWithWCO.windowControlsOverlay) {
        setOverlayVisible(navigatorWithWCO.windowControlsOverlay.visible)
        if (navigatorWithWCO.windowControlsOverlay.visible &&
            typeof navigatorWithWCO.windowControlsOverlay.getBoundingClientRect === 'function') {
          const rect = navigatorWithWCO.windowControlsOverlay.getBoundingClientRect()
          setOverlayHeight(rect.height)
        }
      }
    }

    // 初始更新
    updateOverlayInfo()

    // 监听geometrychange事件
    window.addEventListener('geometrychange', updateOverlayInfo)

    return () => {
      window.removeEventListener('geometrychange', updateOverlayInfo)
    }
  }, [])

  // 根据主题自动调整窗口控制按钮颜色
  useEffect(() => {
    if (!currentTheme) return
    //是Windows就不设置了
    if (typeof process !== 'undefined' && process.platform === 'win32') return

    const root = document.documentElement

    // 设置color-scheme以匹配主题模式
    root.style.setProperty('color-scheme', currentTheme.mode === 'dark' ? 'dark' : 'light')

    // 获取标题栏背景色
    const headerBgColor = currentTheme.config.custom['--ss-header-bg']

    if (headerBgColor && overlayVisible) {
      // 计算背景色的亮度，决定窗口控制按钮颜色
      const hexColor = headerBgColor.replace('#', '')
      const r = parseInt(hexColor.substr(0, 2), 16)
      const g = parseInt(hexColor.substr(2, 2), 16)
      const b = parseInt(hexColor.substr(4, 2), 16)

      // 计算亮度 (YIQ公式)
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000

      // 如果背景色较暗，使用浅色窗口控制按钮；反之使用深色
      const windowControlsColor = yiq < 128 ? '#ffffff' : '#000000'

      // 设置CSS变量来控制窗口控制按钮颜色
      root.style.setProperty('--window-controls-color', windowControlsColor)

      // 如果浏览器支持，直接设置window-controls-overlay的颜色
      const navigatorWithWCO = navigator as NavigatorWithWCO
      if (navigatorWithWCO.windowControlsOverlay) {
        // 通过CSS变量控制颜色
        root.style.setProperty('--titlebar-area-color', headerBgColor)
      }
    }
  }, [currentTheme, overlayVisible])

  const permissionTag = (
    <Tag
      theme={permission === 'admin' ? 'success' : permission === 'points' ? 'warning' : 'default'}
      variant="light"
    >
      {permission === 'admin' ? '管理权限' : permission === 'points' ? '积分权限' : '只读'}
    </Tag>
  )

  // 根据overlay状态调整样式
  const titleBarStyle: React.CSSProperties & { WebkitAppRegion?: string } = {
    height: overlayVisible ? `${overlayHeight}px` : '48px',
    WebkitAppRegion: 'drag',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: overlayVisible ? 'transparent' : 'var(--ss-header-bg)',
    borderBottom: overlayVisible ? 'none' : '1px solid var(--ss-border-color)',
    flexShrink: 0,
    paddingLeft: overlayVisible ? 'env(titlebar-area-x, 0)' : '0',
    width: overlayVisible ? 'env(titlebar-area-width, 100%)' : '100%',
    ...style
  }

  return (
    <div
      className={className}
      style={titleBarStyle}
    >
      <div
        style={
          {
            display: 'flex',
            alignItems: 'center',
            WebkitAppRegion: 'no-drag',
            height: '100%'
          } as React.CSSProperties & { WebkitAppRegion?: string }
        }
      >
        <Space size="small" style={{ margin: '12px' }}>
          {permissionTag}
          {hasAnyPassword && (
            <>
              <Button size="small" variant="outline" onClick={onAuthClick}>
                输入密码
              </Button>
              <Button size="small" variant="outline" theme="danger" onClick={onLogout}>
                锁定
              </Button>
            </>
          )}
        </Space>
        <div style={{ flex: 1 }} />
      </div>
    </div>
  )
}