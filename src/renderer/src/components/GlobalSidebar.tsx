import React, { useState, useEffect } from 'react'
import { Button, Tooltip } from 'tdesign-react'
import { 
  HomeIcon, 
  ViewListIcon, 
  UserAddIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon,
  SettingIcon
} from 'tdesign-icons-react'

export const GlobalSidebar: React.FC = () => {
  const [expanded, setExpanded] = useState(false)
  
  useEffect(() => {
    if (!(window as any).api) return
    if (expanded) {
      (window as any).api.windowResize(84, 300)
    } else {
      (window as any).api.windowResize(24, 300)
    }
  }, [expanded])

  const openMain = () => {
    if (!(window as any).api) return
    (window as any).api.openWindow({ key: 'main', route: '/' })
  }

  const openQuickPoint = () => {
    // 统一使用 / 路径，因为主页即是积分操作页
    openMain()
  }

  const openLeaderboard = () => {
    if (!(window as any).api) return
    (window as any).api.openWindow({ key: 'main', route: '/leaderboard' })
  }

  return (
    <div 
      className={`global-sidebar-container ${expanded ? 'expanded' : 'collapsed'}`}
      style={{
        height: '100vh',
        width: '84px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        background: 'transparent',
        userSelect: 'none',
        position: 'fixed',
        right: 0,
        top: 0
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: expanded ? 'translateX(0)' : 'translateX(60px)',
        }}
      >
        {/* 侧边栏内容区 */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--ss-card-bg)',
            borderRadius: '12px 0 0 12px',
            boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
            border: '1px solid var(--ss-border-color)',
            borderRight: 'none',
            padding: '12px 8px',
            gap: '12px',
            width: '60px',
            pointerEvents: expanded ? 'auto' : 'none',
            flexShrink: 0
          }}
        >
          <Tooltip content="主界面" placement="left">
            <Button shape="circle" variant="text" onClick={openMain}>
              <HomeIcon size="24px" />
            </Button>
          </Tooltip>

          <Tooltip content="积分操作" placement="left">
            <Button shape="circle" variant="text" onClick={openQuickPoint}>
              <UserAddIcon size="24px" />
            </Button>
          </Tooltip>

          <Tooltip content="排行榜" placement="left">
            <Button shape="circle" variant="text" onClick={openLeaderboard}>
              <ViewListIcon size="24px" />
            </Button>
          </Tooltip>

          <Tooltip content="设置" placement="left">
            <Button shape="circle" variant="text" onClick={() => (window as any).api.openWindow({ key: 'main', route: '/settings' })}>
              <SettingIcon size="24px" />
            </Button>
          </Tooltip>
        </div>

        {/* 展开/收起手柄 */}
        <div 
          onClick={() => setExpanded(!expanded)}
          className="global-sidebar-toggle"
        >
          {expanded ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </div>
      </div>
    </div>
  )
}
