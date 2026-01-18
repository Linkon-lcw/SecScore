import React, { useState } from 'react'
import { Dialog, Form, Select, MessagePlugin, Typography } from 'tdesign-react'
import { useTheme } from '../contexts/ThemeContext'

interface wizardProps {
  visible: boolean
  onComplete: () => void
}

export const Wizard: React.FC<wizardProps> = ({ visible, onComplete }) => {
  const { themes, currentTheme, setTheme } = useTheme()
  const [loading, setLoading] = useState(false)

  const handleFinish = async () => {
    setLoading(true)
    try {
      if (!(window as any).api) throw new Error('api not ready')
      const res = await (window as any).api.setSetting('is_wizard_completed', true)
      if (!res?.success) throw new Error(res?.message || 'failed')

      MessagePlugin.success('配置完成！')
      onComplete()
    } catch {
      MessagePlugin.error('配置保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      header="欢迎使用 SecScore 积分管理"
      visible={visible}
      confirmBtn={{ content: '开启积分之旅', loading }}
      cancelBtn={null}
      closeOnEscKeydown={false}
      closeOnOverlayClick={false}
      onConfirm={handleFinish}
      width={500}
    >
      <Typography.Paragraph style={{ marginBottom: '24px', color: 'var(--ss-text-secondary)' }}>
        感谢选择 SecScore。在开始之前，请花一分钟完成基础配置。
      </Typography.Paragraph>

      <Form labelWidth={100}>
        <Form.FormItem label="外观主题">
          <Select value={currentTheme?.id} onChange={(v) => setTheme(v as string)}>
            {themes.map((t) => (
              <Select.Option key={t.id} value={t.id} label={t.name} />
            ))}
          </Select>
        </Form.FormItem>
      </Form>
    </Dialog>
  )
}
