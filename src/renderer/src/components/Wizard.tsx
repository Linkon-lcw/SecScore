import React, { useState } from 'react';
import { Dialog, Form, Select, Input, Switch, MessagePlugin, Space, Typography } from 'tdesign-react';
import { useTheme } from '../contexts/ThemeContext';

interface WizardProps {
  visible: boolean;
  onComplete: () => void;
}

export const Wizard: React.FC<WizardProps> = ({ visible, onComplete }) => {
  const { themes, currentTheme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sync_mode: 'local',
    ws_server: 'ws://localhost:8080'
  });

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. 保存模式
      await (window as any).api.updateSetting('sync_mode', formData.sync_mode);
      // 2. 保存服务器地址
      await (window as any).api.updateSetting('ws_server', formData.ws_server);
      // 3. 标记向导已完成
      await (window as any).api.updateSetting('is_wizard_completed', '1');
      
      MessagePlugin.success('配置完成！');
      onComplete();
    } catch (e) {
      MessagePlugin.error('配置保存失败');
    } finally {
      setLoading(false);
    }
  };

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
          <Select 
            value={currentTheme?.id} 
            onChange={(v) => setTheme(v as string)}
          >
            {themes.map(t => (
              <Select.Option key={t.id} value={t.id} label={t.name} />
            ))}
          </Select>
        </Form.FormItem>

        <Form.FormItem label="同步模式">
          <Space align="center">
            <Switch 
              value={formData.sync_mode === 'remote'} 
              onChange={(v) => setFormData(prev => ({ ...prev, sync_mode: v ? 'remote' : 'local' }))}
            />
            <span style={{ fontSize: '14px' }}>
              {formData.sync_mode === 'remote' ? '远程同步模式' : '纯本地模式'}
            </span>
          </Space>
        </Form.FormItem>

        {formData.sync_mode === 'remote' && (
          <Form.FormItem label="服务器地址">
            <Input 
              value={formData.ws_server} 
              onChange={(v) => setFormData(prev => ({ ...prev, ws_server: v }))}
              placeholder="ws://localhost:8080"
            />
          </Form.FormItem>
        )}
      </Form>
    </Dialog>
  );
};
