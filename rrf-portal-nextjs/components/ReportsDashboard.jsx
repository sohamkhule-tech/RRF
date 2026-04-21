'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DownloadOutlined, SearchOutlined, WarningOutlined, BarChartOutlined, ClockCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons'

export default function ReportsDashboard({ role }) {
  const router = useRouter()

  const insights = {
    estimatedRevenueLoss: 2450,
    currency: '$',
    overduePositions: 3,
    avgDelayDays: 6,
  }

  const rows = useMemo(() => {
    return [
      { submissionId: 'SUB-001', role: 'React Developer', project: 'Banking Project', priority: 'High', stage: 'Pending Approval', daysPending: 9, department: 'Engineering' },
      { submissionId: 'SUB-004', role: 'UI/UX Designer', project: 'E-commerce Platform', priority: 'High', stage: 'On-hold', daysPending: 14, department: 'Design' },
      { submissionId: 'SUB-007', role: 'Flutter Developer', project: 'Mobile App', priority: 'Critical', stage: 'Pending Approval', daysPending: 6, department: 'Engineering' },
      { submissionId: 'SUB-012', role: 'Data Engineer', project: 'Analytics Project', priority: 'Medium', stage: 'Open for Hiring', daysPending: 4, department: 'Engineering' },
      { submissionId: 'SUB-015', role: 'Project Coordinator', project: 'PMO Operations', priority: 'Medium', stage: 'Open for Hiring', daysPending: 11, department: 'PMO' },
    ]
  }, [])



  const ageingBuckets = useMemo(() => {
    const buckets = { '0-3': 0, '4-7': 0, '8-14': 0, '15+': 0 }
    for (const r of rows) {
      if (r.daysPending <= 3) buckets['0-3']++
      else if (r.daysPending <= 7) buckets['4-7']++
      else if (r.daysPending <= 14) buckets['8-14']++
      else buckets['15+']++
    }
    return buckets
  }, [rows])

  const topDelayed = useMemo(() => {
    const byProject = new Map()
    for (const r of rows) {
      byProject.set(r.project, (byProject.get(r.project) || 0) + r.daysPending)
    }
    return [...byProject.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([project, score]) => ({ project, score }))
  }, [rows])

  const exportCSV = () => {
    const headers = ['Submission ID', 'Role', 'Project', 'Department', 'Priority', 'Stage', 'Days Pending']
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => [
        r.submissionId,
        `"${r.role}"`,
        `"${r.project}"`,
        `"${r.department}"`,
        r.priority,
        `"${r.stage}"`,
        r.daysPending,
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `Reports_${role || 'common'}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const Stat = ({ icon, title, value, subtitle, gradient }) => (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
          <p className="text-xl md:text-3xl font-bold text-gray-900 mt-1 md:mt-2">{value}</p>
          {subtitle ? <p className="text-[10px] md:text-xs text-gray-500 font-medium mt-1 truncate">{subtitle}</p> : null}
        </div>
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/70 border border-gray-100 flex items-center justify-center text-lg md:text-xl text-indigo-600 flex-shrink-0 ml-2">
          {icon}
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
      {/* Back Button */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 px-3 md:px-4 py-2 mb-2 md:mb-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 font-medium text-sm"
      >
        <ArrowLeftOutlined />
        <span>Back</span>
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Insights and ageing summary</p>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 flex items-center gap-2 w-full sm:w-auto justify-center"
          style={{ borderRadius: '10px' }}
        >
          <DownloadOutlined />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5">
        <Stat
          icon={<WarningOutlined />}
          title="Revenue Loss Risk"
          value={`${insights.currency}${insights.estimatedRevenueLoss.toLocaleString()}`}
          subtitle={`${insights.overduePositions} overdue positions`}
          gradient="from-red-50 to-white"
        />
        <Stat
          icon={<ClockCircleOutlined />}
          title="Avg Delay"
          value={`${insights.avgDelayDays} days`}
          subtitle="Based on pending ageing"
          gradient="from-amber-50 to-white"
        />
        <Stat
          icon={<BarChartOutlined />}
          title="Ageing (15+)"
          value={ageingBuckets['15+']}
          subtitle="Requests pending 15+ days"
          gradient="from-purple-50 to-white"
        />
        <Stat
          icon={<SearchOutlined />}
          title="Total Tracked"
          value={rows.length}
          subtitle="Requests in report"
          gradient="from-indigo-50 to-white"
        />
      </div>

      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
        <div className="px-2 py-4 mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Insights</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-2 pb-2">
          <div className="border border-gray-200 rounded-2xl p-5">
            <p className="text-sm font-bold text-gray-900 mb-3">Ageing Buckets</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(ageingBuckets).map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{k} days</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-gray-200 rounded-2xl p-5">
            <p className="text-sm font-bold text-gray-900 mb-3">Top Delayed Projects</p>
            <div className="space-y-3">
              {topDelayed.map((p) => (
                <div key={p.project} className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{p.project}</p>
                  <span className="text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-full px-3 py-1">
                    {p.score} score
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}
