import React, { useState, useEffect } from 'react';
import { Form, Select, Input, Switch, Button, MessagePlugin, Space, Card, Divider, Tag } from 'tdesign-react';
import { useTheme } from '../contexts/ThemeContext';

export const Settings: React.FC = () => {
  const { themes, currentTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<{ connected: boolean, lastSync?: string }>({ connected: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const res = await (window as any).api.getSettings();
      if (res.success && res.data) {
        setSettings(res.data);
      }
      
      const statusRes = await (window as any).api.getSyncStatus();
      if (statusRes.success && statusRes.data) {
        setSyncStatus(statusRes.data);
      }
    };
    loadSettings();
    
    // 定时刷新同步状态
    const timer = setInterval(async () => {
      const statusRes = await (window as any).api.getSyncStatus();
      if (statusRes.success && statusRes.data) {
        setSyncStatus(statusRes.data);
      }
    }, 5000);
    
    return () => clearInterval(timer);
  }, []);

  const handleUpdateSetting = async (key: string, value: string) => {
    const res = await (window as any).api.updateSetting(key, value);
    if (res.success) {
      setSettings(prev => ({ ...prev, [key]: value }));
      MessagePlugin.success('设置已更新');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '24px', color: 'var(--ss-text-main)' }}>系统设置</h2>

      <Card title="界面显示" style={{ marginBottom: '24px', backgroundColor: 'var(--ss-card-bg)', color: 'var(--ss-text-main)' }}>
        <Form labelWidth={120}>
          <Form.FormItem label="当前主题">
            <Select 
              value={currentTheme?.id} 
              onChange={(v) => setTheme(v as string)}
              style={{ width: '300px' }}
            >
              {themes.map(t => (
                <Select.Option key={t.id} value={t.id} label={t.name} />
              ))}
            </Select>
          </Form.FormItem>
        </Form>
      </Card>

      <Card title="同步设置 (远程模式)" style={{ backgroundColor: 'var(--ss-card-bg)', color: 'var(--ss-text-main)' }}>
        <Form labelWidth={120}>
          <Form.FormItem label="同步模式">
            <Space align="center">
              <Switch 
                value={settings.sync_mode === 'remote'} 
                onChange={(v) => handleUpdateSetting('sync_mode', v ? 'remote' : 'local')}
              />
              <span style={{ fontSize: '14px', color: 'var(--ss-text-secondary)' }}>
                {settings.sync_mode === 'remote' ? '远程同步模式' : '纯本地模式'}
              </span>
            </Space>
          </Form.FormItem>
          
          <Form.FormItem label="服务器地址">
            <Input 
              value={settings.ws_server} 
              onChange={(v) => setSettings(prev => ({ ...prev, ws_server: v }))}
              onBlur={() => handleUpdateSetting('ws_server', settings.ws_server)}
              placeholder="ws://localhost:8080"
              style={{ width: '300px' }}
              disabled={settings.sync_mode !== 'remote'}
            />
          </Form.FormItem>

          <Divider />

          <Form.FormItem label="同步状态">
            <Space align="center">
              <Tag theme={syncStatus.connected ? 'success' : 'default'} variant="light">
                {syncStatus.connected ? '已连接' : '未连接'}
              </Tag>
              {syncStatus.lastSync && (
                <span style={{ fontSize: '12px', color: 'var(--ss-text-secondary)' }}>
                  上次同步: {new Date(syncStatus.lastSync).toLocaleString()}
                </span>
              )}
              <Button 
                size="small" 
                variant="outline" 
                loading={loading}
                disabled={settings.sync_mode !== 'remote' || !syncStatus.connected}
              onClick={async () => {
                setLoading(true);
                const res = await (window as any).api.triggerSync();
                setLoading(false);
                if (res.success) {
                    MessagePlugin.success('同步完成');
                  } else {
                    MessagePlugin.error('同步失败: ' + res.message);
                  }
                }}
              >
                立即对齐数据
              </Button>
            </Space>
          </Form.FormItem>
        </Form>
      </Card>
      
      <div style={{ marginTop: '48px', textAlign: 'center', color: 'var(--ss-text-secondary)', fontSize: '12px' }}>
        SecScore v1.0.0 - Education Scene Personal Point Management
      </div>
    </div>
  );
};
