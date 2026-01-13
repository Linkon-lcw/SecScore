import { Layout, Menu, Space } from 'tdesign-react'
import { useState, useEffect } from 'react'
import { UserIcon, SettingIcon, HistoryIcon, RootListIcon } from 'tdesign-icons-react'
import { StudentManager } from './components/StudentManager'
import { Settings } from './components/Settings'
import { EventHistory } from './components/EventHistory'
import { ReasonManager } from './components/ReasonManager'
import { Wizard } from './components/Wizard'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

const { Header, Content, Aside } = Layout

function MainContent(): React.JSX.Element {
  const [activeMenu, setActiveMenu] = useState('students')
  const [wizardVisible, setWizardVisible] = useState(false)
  const { currentTheme } = useTheme()

  useEffect(() => {
    const checkWizard = async () => {
      const res = await (window as any).api.getSettings()
      if (res.success && res.data && res.data.is_wizard_completed !== '1') {
        setWizardVisible(true)
      }
    }
    checkWizard()
  }, [])

  const renderContent = () => {
    switch (activeMenu) {
      case 'students':
        return <StudentManager />
      case 'history':
        return <EventHistory />
      case 'reasons':
        return <ReasonManager />
      case 'settings':
        return <Settings />
      default:
        return <StudentManager />
    }
  }

  return (
    <Layout style={{ height: '100vh', backgroundColor: 'var(--ss-bg-color)' }}>
      <Aside style={{ backgroundColor: 'var(--ss-sidebar-bg)', borderRight: '1px solid var(--ss-border-color)' }}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--ss-text-main)', margin: 0 }}>SecScore</h2>
          <div style={{ fontSize: '12px', color: 'var(--ss-text-secondary)' }}>教育积分管理</div>
        </div>
        <Menu
          value={activeMenu}
          onChange={(v) => setActiveMenu(v as string)}
          style={{ width: '100%', border: 'none' }}
        >
          <Menu.MenuItem value="students" icon={<UserIcon />}>学生管理</Menu.MenuItem>
          <Menu.MenuItem value="history" icon={<HistoryIcon />}>积分流水</Menu.MenuItem>
          <Menu.MenuItem value="reasons" icon={<RootListIcon />}>理由管理</Menu.MenuItem>
          <Menu.MenuItem value="settings" icon={<SettingIcon />}>系统设置</Menu.MenuItem>
        </Menu>
      </Aside>
      <Layout>
        <Header style={{ 
          backgroundColor: 'var(--ss-header-bg)', 
          borderBottom: '1px solid var(--ss-border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 24px'
        }}>
          <Space>
            <span style={{ color: 'var(--ss-text-secondary)', fontSize: '14px' }}>
              当前主题: {currentTheme?.name}
            </span>
          </Space>
        </Header>
        <Content style={{ overflowY: 'auto' }}>
          {renderContent()}
        </Content>
      </Layout>
      <Wizard visible={wizardVisible} onComplete={() => setWizardVisible(false)} />
    </Layout>
  )
}

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <MainContent />
    </ThemeProvider>
  )
}

export default App
