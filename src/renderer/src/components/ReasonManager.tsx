import React, { useState, useEffect } from 'react';
import { Table, PrimaryTableCol, Button, Space, Dialog, Form, Input, MessagePlugin, Tag } from 'tdesign-react';

interface Reason {
  id: number;
  content: string;
  category: string;
  delta: number;
  is_system: number;
}

export const ReasonManager: React.FC = () => {
  const [data, setData] = useState<Reason[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchReasons = async () => {
    setLoading(true);
    const res = await (window as any).api.queryReasons();
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReasons();
  }, []);

  const handleAdd = async () => {
    const values = form.getFieldsValue?.(true) as any;
    const res = await (window as any).api.createReason({
      ...values,
      delta: Number(values.delta)
    });
    if (res.success) {
      MessagePlugin.success('添加成功');
      setVisible(false);
      form.reset();
      fetchReasons();
    }
  };

  const handleDelete = async (id: number) => {
    const res = await (window as any).api.deleteReason(id);
    if (res.success) {
      MessagePlugin.success('删除成功');
      fetchReasons();
    }
  };

  const columns: PrimaryTableCol<Reason>[] = [
    { colKey: 'category', title: '分类', width: 120, cell: ({ row }) => <Tag variant="outline">{row.category}</Tag> },
    { colKey: 'content', title: '理由内容', width: 250 },
    { 
      colKey: 'delta', 
      title: '预设分值', 
      width: 100,
      cell: ({ row }) => (
        <span style={{ color: row.delta > 0 ? 'var(--td-success-color)' : 'var(--td-error-color)' }}>
          {row.delta > 0 ? `+${row.delta}` : row.delta}
        </span>
      )
    },
    {
      colKey: 'operation',
      title: '操作',
      width: 150,
      cell: ({ row }) => (
        <Space>
          <Button 
            theme="danger" 
            variant="text" 
            disabled={row.is_system === 1} 
            onClick={() => handleDelete(row.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: 'var(--ss-text-main)' }}>理由管理</h2>
        <Button theme="primary" onClick={() => setVisible(true)}>添加预设理由</Button>
      </div>

      <Table
        data={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        bordered
        hover
        style={{ backgroundColor: 'var(--ss-card-bg)', color: 'var(--ss-text-main)' }}
      />

      <Dialog
        header="添加理由"
        visible={visible}
        onConfirm={handleAdd}
        onClose={() => setVisible(false)}
        destroyOnClose
      >
        <Form form={form} labelWidth={80}>
          <Form.FormItem label="分类" name="category" initialData="其他">
            <Input placeholder="例如: 学习, 纪律" />
          </Form.FormItem>
          <Form.FormItem label="理由内容" name="content">
            <Input placeholder="请输入理由" />
          </Form.FormItem>
          <Form.FormItem label="预设分值" name="delta">
            <Input type="number" placeholder="例如: 2 或 -2" />
          </Form.FormItem>
        </Form>
      </Dialog>
    </div>
  );
};
