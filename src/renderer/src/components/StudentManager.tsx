import React, { useEffect, useState } from 'react';
import { Table, Button, Space, MessagePlugin, Dialog, Form, Input, Select } from 'tdesign-react';
import type { PrimaryTableCol } from 'tdesign-react';

interface Student {
  id: number;
  name: string;
  score: number;
}

export const StudentManager: React.FC = () => {
  const [data, setData] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [scoreVisible, setScoreVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reasons, setReasons] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [scoreForm] = Form.useForm();

  const fetchStudents = async () => {
    setLoading(true);
      const res = await (window as any).api.queryStudents({});
      if (res.success && res.data) {
        setData(res.data);
      }
    setLoading(false);
  };

  const fetchReasons = async () => {
    const res = await (window as any).api.queryReasons();
    if (res.success && res.data) {
      setReasons(res.data);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchReasons();
  }, []);

  const handleAdd = async () => {
    const values = form.getFieldsValue?.(true) as { name: string };
    if (!values.name) {
      MessagePlugin.warning('请输入姓名');
      return;
    }
    const res = await (window as any).api.createStudent(values);
    if (res.success) {
      MessagePlugin.success('添加成功');
      setVisible(false);
      form.reset();
      fetchStudents();
    }
  };

  const handleScoreChange = async () => {
    const values = scoreForm.getFieldsValue?.(true) as { delta: number; reason_content: string };
    if (!selectedStudent || !values.delta || !values.reason_content) {
      MessagePlugin.warning('请填写完整信息');
      return;
    }

    const res = await (window as any).api.createEvent({
      student_name: selectedStudent.name,
      reason_content: values.reason_content,
      delta: Number(values.delta)
    });

    if (res.success) {
      MessagePlugin.success('积分操作成功');
      setScoreVisible(false);
      scoreForm.reset();
      fetchStudents();
    } else {
      MessagePlugin.error(res.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    const res = await (window as any).api.deleteStudent(id);
    if (res.success) {
      MessagePlugin.success('删除成功');
      fetchStudents();
    }
  };

  const columns: PrimaryTableCol<Student>[] = [
    { colKey: 'name', title: '姓名', width: 200 },
    { colKey: 'score', title: '当前积分', width: 120, align: 'center', 
      cell: ({ row }) => (
        <span style={{ 
          fontWeight: 'bold', 
          color: row.score > 0 ? 'var(--td-success-color)' : row.score < 0 ? 'var(--td-error-color)' : 'inherit' 
        }}>
          {row.score > 0 ? `+${row.score}` : row.score}
        </span>
      )
    },
    {
      colKey: 'operation',
      title: '操作',
      width: 200,
      cell: ({ row }) => (
        <Space>
          <Button theme="primary" variant="text" onClick={() => {
            setSelectedStudent(row);
            setScoreVisible(true);
          }}>积分操作</Button>
          <Button theme="danger" variant="text" onClick={() => handleDelete(row.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: 'var(--ss-text-main)' }}>学生管理</h2>
        <Button theme="primary" onClick={() => setVisible(true)}>添加学生</Button>
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

      {/* 添加学生弹窗 */}
      <Dialog
        header="添加学生"
        visible={visible}
        onConfirm={handleAdd}
        onClose={() => setVisible(false)}
        destroyOnClose
      >
        <Form form={form} labelWidth={80}>
          <Form.FormItem label="姓名" name="name">
            <Input placeholder="请输入学生姓名" />
          </Form.FormItem>
        </Form>
      </Dialog>

      {/* 积分操作弹窗 */}
      <Dialog
        header={`积分操作 - ${selectedStudent?.name}`}
        visible={scoreVisible}
        onConfirm={handleScoreChange}
        onClose={() => setScoreVisible(false)}
        destroyOnClose
      >
        <Form form={scoreForm} labelWidth={80}>
          <Form.FormItem label="快捷理由" name="reason_id">
            <Select 
              onChange={(_v, { selectedOptions }) => {
                const opt = selectedOptions as any;
                if (opt) {
                  scoreForm.setFieldsValue({
                    reason_content: opt.label,
                    delta: opt.value_delta
                  });
                }
              }}
            >
              {reasons.map(r => (
                <Select.Option 
                  key={r.id} 
                  value={r.id} 
                  label={r.content} 
                  // @ts-ignore
                  value_delta={r.delta} 
                >
                  {r.content} ({r.delta > 0 ? `+${r.delta}` : r.delta})
                </Select.Option>
              ))}
            </Select>
          </Form.FormItem>
          <Form.FormItem label="理由内容" name="reason_content">
            <Input placeholder="手动输入或选择快捷理由" />
          </Form.FormItem>
          <Form.FormItem label="分值变动" name="delta">
            <Input type="number" placeholder="例如: 2 或 -2" />
          </Form.FormItem>
        </Form>
      </Dialog>
    </div>
  );
};
