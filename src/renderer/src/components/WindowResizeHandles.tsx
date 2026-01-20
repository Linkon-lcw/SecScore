import { useEffect, useState } from 'react'

export function WindowResizeHandles(): React.ReactNode {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!(window as any).api) return
    ;(window as any).api.windowIsMaximized().then((v: boolean) => setIsMaximized(v))

    const cleanup = (window as any).api.onWindowMaximizedChanged((maximized: boolean) => {
      setIsMaximized(maximized)
    })
    return cleanup
  }, [])

  if (isMaximized) {
    return null
  }

  const edgeStyle = {
    position: 'absolute' as const,
    zIndex: 9999,
    WebkitAppRegion: 'no-drag' as const
  }

  const cornerStyle = {
    position: 'absolute' as const,
    width: '12px',
    height: '12px',
    zIndex: 9999,
    WebkitAppRegion: 'no-drag' as const
  }

  return (
    <>
      <div
        style={{
          ...edgeStyle,
          top: 0,
          left: '12px',
          right: '12px',
          height: '4px',
          cursor: 'n-resize'
        }}
      />
      <div
        style={{
          ...edgeStyle,
          bottom: 0,
          left: '12px',
          right: '12px',
          height: '4px',
          cursor: 's-resize'
        }}
      />
      <div
        style={{
          ...edgeStyle,
          left: 0,
          top: '12px',
          bottom: '12px',
          width: '4px',
          cursor: 'w-resize'
        }}
      />
      <div
        style={{
          ...edgeStyle,
          right: 0,
          top: '12px',
          bottom: '12px',
          width: '4px',
          cursor: 'e-resize'
        }}
      />
      <div
        style={{
          ...cornerStyle,
          top: 0,
          left: 0,
          cursor: 'nw-resize'
        }}
      />
      <div
        style={{
          ...cornerStyle,
          top: 0,
          right: 0,
          cursor: 'ne-resize'
        }}
      />
      <div
        style={{
          ...cornerStyle,
          bottom: 0,
          left: 0,
          cursor: 'sw-resize'
        }}
      />
      <div
        style={{
          ...cornerStyle,
          bottom: 0,
          right: 0,
          cursor: 'se-resize'
        }}
      />
    </>
  )
}
