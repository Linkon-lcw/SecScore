import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  PrimaryTableCol,
  Tag,
  Button,
  Select,
  Space,
  Card,
  MessagePlugin,
  DialogPlugin
} from 'tdesign-react'
import { ViewListIcon, DownloadIcon } from 'tdesign-icons-react'

interface StudentRank {
  id: number
  name: string
  score: number
  range_change: number
}

export const Leaderboard: React.FC = () => {
  const [data, setData] = useState<StudentRank[]>([])
  const [loading, setLoading] = useState(false)
  const [timeRange, setTimeRange] = useState('today')
  const [startTime, setStartTime] = useState<string | null>(null)

  const fetchRankings = useCallback(async () => {
    if (!(window as any).api) return
    setLoading(true)
    const res = await (window as any).api.queryLeaderboard({ range: timeRange })
    if (res.success && res.data) {
      setStartTime(res.data.startTime)
      setData(res.data.rows)
    }
    setLoading(false)
  }, [timeRange])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  useEffect(() => {
    const onDataUpdated = (e: any) => {
      const category = e?.detail?.category
      if (category === 'events' || category === 'students' || category === 'all') fetchRankings()
    }
    window.addEventListener('ss:data-updated', onDataUpdated as any)
    return () => window.removeEventListener('ss:data-updated', onDataUpdated as any)
  }, [fetchRankings])

  const handleViewHistory = async (studentName: string) => {
    if (!(window as any).api) return
    const res = await (window as any).api.queryEventsByStudent({
      student_name: studentName,
      limit: 200,
      startTime
    })
    if (!res.success) {
      MessagePlugin.error(res.message || '查询失败')
      return
    }

    const lines = (res.data || []).map((e: any) => {
      const time = new Date(e.event_time).toLocaleString()
      const delta = e.delta > 0 ? `+${e.delta}` : String(e.delta)
      return `${time}  ${delta}  ${e.reason_content}`
    })

    DialogPlugin.confirm({
      header: `${studentName} - 操作记录`,
      body: (
        <div
          style={{
            maxHeight: '420px',
            overflowY: 'auto',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: '10px'
          }}
        >
          {lines.join('\n') || '暂无记录'}
        </div>
      ),
      width: '80%',
      cancelBtn: null,
      confirmBtn: '关闭'
    })
  }

  const handleExport = () => {
    // 简单的 CSV 导出实现
    const headers = ['排名', '姓名', '总积分', '变化']
    const rows = data.map((item, index) => [
      index + 1,
      item.name,
      item.score,
      item.range_change > 0 ? `+${item.range_change}` : item.range_change
    ])

    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `排行榜_${timeRange}_${new Date().toLocaleDateString()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    MessagePlugin.success('导出成功')
  }

  const handleExportExcel = () => {
    const title = timeRange === 'today' ? '今天' : timeRange === 'week' ? '本周' : '本月'
    const rowsHtml = data
      .map((item, index) => {
        const change = item.range_change > 0 ? `+${item.range_change}` : item.range_change
        return `<tr><td>${index + 1}</td><td>${item.name}</td><td>${item.score}</td><td>${change}</td></tr>`
      })
      .join('')

    const html = `\ufeff<html><head><meta charset="UTF-8" /></head><body><table border="1"><tr><th>排名</th><th>姓名</th><th>总积分</th><th>${title}变化</th></tr>${rowsHtml}</table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `排行榜_${timeRange}_${new Date().toLocaleDateString()}.xls`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    MessagePlugin.success('导出成功')
  }

  const columns: PrimaryTableCol<StudentRank>[] = [
    {
      colKey: 'rank',
      title: '排名',
      width: 70,
      align: 'center',
      cell: ({ rowIndex }) => {
        const rank = rowIndex + 1
        let color = 'inherit'
        if (rank === 1) color = '#FFD700'
        if (rank === 2) color = '#C0C0C0'
        if (rank === 3) color = '#CD7F32'
        return (
          <span style={{ fontWeight: 'bold', color, fontSize: rank <= 3 ? '18px' : '14px' }}>
            {rank}
          </span>
        )
      }
    },
    { colKey: 'name', title: '姓名', width: 120 },
    {
      colKey: 'score',
      title: '总积分',
      width: 100,
      cell: ({ row }) => <span style={{ fontWeight: 'bold' }}>{row.score}</span>
    },
    {
      colKey: 'range_change',
      title: timeRange === 'today' ? '今日变化' : timeRange === 'week' ? '本周变化' : '本月变化',
      width: 100,
      cell: ({ row }) => (
        <Tag
          theme={row.range_change > 0 ? 'success' : row.range_change < 0 ? 'danger' : 'default'}
          variant="light"
        >
          {row.range_change > 0 ? `+${row.range_change}` : row.range_change}
        </Tag>
      )
    },
    {
      colKey: 'operation',
      title: '操作记录',
      width: 100,
      cell: ({ row }) => (
        <Button
          variant="text"
          theme="primary"
          icon={<ViewListIcon />}
          onClick={() => handleViewHistory(row.name)}
        >
          查看
        </Button>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h2 style={{ margin: 0, color: 'var(--ss-text-main)' }}>积分排行榜</h2>
        <Space>
          <Select
            value={timeRange}
            onChange={(v) => setTimeRange(v as string)}
            style={{ width: '120px' }}
          >
            <Select.Option value="today" label="今天" />
            <Select.Option value="week" label="本周" />
            <Select.Option value="month" label="本月" />
          </Select>
          <Button variant="outline" icon={<DownloadIcon />} onClick={handleExport}>
            导出 CSV
          </Button>
          <Button variant="outline" icon={<DownloadIcon />} onClick={handleExportExcel}>
            导出 Excel
          </Button>
        </Space>
      </div>

      <Card style={{ backgroundColor: 'var(--ss-card-bg)' }}>
        <Table
          data={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          bordered
          hover
          style={{ color: 'var(--ss-text-main)' }}
        />
      </Card>
    </div>
  )
}
