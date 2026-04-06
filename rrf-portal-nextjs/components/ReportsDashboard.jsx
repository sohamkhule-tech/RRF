'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DownloadOutlined, SearchOutlined, WarningOutlined, BarChartOutlined, ClockCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons'

export default function ReportsDashboard({ role }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

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

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.submissionId.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q) ||
      r.project.toLowerCase().includes(q) ||
      r.priority.toLowerCase().includes(q) ||
      r.stage.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)
    )
  }, [rows, searchTerm])

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
      ...filteredRows.map((r) => [
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
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 shadow-sm border border-gray-200`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle ? <p className="text-xs text-gray-500 font-medium mt-1">{subtitle}</p> : null}
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/70 border border-gray-100 flex items-center justify-center text-xl text-indigo-600">
          {icon}
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-8 space-y-8">
      {/* Back Button */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 px-4 py-2 mb-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 font-medium"
      >
        <ArrowLeftOutlined />
        <span>Back</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Insights and ageing summary (common for PMO + Approver)</p>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 flex items-center gap-2"
          style={{ borderRadius: '10px' }}
        >
          <DownloadOutlined />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
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

      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
        <div className="px-2 py-4 mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Pending List</h3>
        </div>

        <div className="px-2 mb-4">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SearchOutlined className="text-gray-400" style={{ fontSize: '18px' }} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Submission, Role, Project, Priority, Stage..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 text-gray-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300"
              style={{ borderRadius: '10px' }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Submission</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Stage</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Days</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows
                  .slice()
                  .sort((a, b) => b.daysPending - a.daysPending)
                  .map((r) => (
                    <tr key={r.submissionId} className="border-b border-gray-100 transition-all duration-300 hover:bg-gray-50">
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-indigo-600">{r.submissionId}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{r.role}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{r.project}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{r.department}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700">{r.priority}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700">{r.stage}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-center">
                        <span className="inline-flex items-center justify-center w-10 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                          {r.daysPending}
                        </span>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <SearchOutlined style={{ fontSize: '32px', color: '#9ca3af' }} />
                      <p className="text-sm font-medium">No requests found matching "{searchTerm}"</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
