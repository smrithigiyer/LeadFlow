import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { Users, UserCheck, PhoneCall, TrendingUp, AlertTriangle } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { leadApi } from '../utils/api'
import StatCard from '../components/StatCard'

const SOURCE_COLORS = {
  website:        '#5C1B1B',
  referral:       '#A855F7',
  social_media:   '#06B6D4',
  cold_call:      '#F97316',
  email_campaign: '#22C55E',
  event:          '#EF4444',
  other:          '#3B82F6',
}
const FALLBACK_COLORS = ['#5C1B1B', '#A855F7', '#06B6D4', '#F97316', '#22C55E', '#EF4444', '#3B82F6']
const sourceColor = (name, index) => SOURCE_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]


const SAMPLE_TREND = [
  { month: 'Jan', leads: 18 }, { month: 'Feb', leads: 26 }, { month: 'Mar', leads: 22 },
  { month: 'Apr', leads: 35 }, { month: 'May', leads: 42 }, { month: 'Jun', leads: 38 },
]

const SAMPLE_FOLLOWUP = [
  { day: 'Mon', followups: 8 }, { day: 'Tue', followups: 14 }, { day: 'Wed', followups: 11 },
  { day: 'Thu', followups: 17 }, { day: 'Fri', followups: 9 }, { day: 'Sat', followups: 5 },
]

function useTooltipStyles() {
  const { isDark } = useTheme()
  return isDark
    ? {
        wrap:      { background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' },
        label:     { color: '#64748b', fontSize: 11, marginBottom: 4 },
        value:     { color: '#5C1B1B', fontWeight: 700, fontSize: 15 },
        unit:      { color: '#475569', fontWeight: 400, fontSize: 11 },
        pieValue:  { color: '#5C1B1B', fontWeight: 700, fontSize: 15 },
      }
    : {
        wrap:      { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.10)' },
        label:     { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
        value:     { color: '#5C1B1B', fontWeight: 700, fontSize: 15 },
        unit:      { color: '#94a3b8', fontWeight: 400, fontSize: 11 },
        pieValue:  { color: '#5C1B1B', fontWeight: 700, fontSize: 15 },
      }
}

function TrendTooltip({ active, payload, label }) {
  const s = useTooltipStyles()
  if (!active || !payload?.length) return null
  return (
    <div style={s.wrap}>
      <p style={s.label}>{label}</p>
      <p style={s.value}>{payload[0].value} <span style={s.unit}>leads</span></p>
    </div>
  )
}

function FollowupTooltip({ active, payload, label }) {
  const s = useTooltipStyles()
  if (!active || !payload?.length) return null
  return (
    <div style={s.wrap}>
      <p style={s.label}>{label}</p>
      <p style={s.value}>{payload[0].value} <span style={s.unit}>follow-ups</span></p>
    </div>
  )
}

function SourceTooltip({ active, payload }) {
  const s = useTooltipStyles()
  if (!active || !payload?.length) return null
  const { name, value, payload: entry } = payload[0]
  const label = (entry?.name ?? name).replace(/_/g, ' ')
  return (
    <div style={s.wrap}>
      <p style={{ ...s.label, textTransform: 'capitalize' }}>{label}</p>
      <p style={s.value}>{value} <span style={s.unit}>leads</span></p>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats]     = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    leadApi.getStats()
      .then((res) => setStats(res.data.data || {}))
      .finally(() => setLoading(false))
  }, [])

  const sourceData = stats.sourceBreakdown?.length ? stats.sourceBreakdown : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Dashboard</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Your business at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        <StatCard
          label="Total Leads"
          value={stats.total || 0}
          sub="All time leads"
          icon={Users}
          color="brand"
        />
        <StatCard
          label="New Leads"
          value={stats.new || 0}
          sub="Fresh enquiries"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          label="Pending Follow Ups"
          value={stats.pendingFollowups || 0}
          sub="Scheduled & upcoming"
          icon={PhoneCall}
          color="purple"
        />
        <StatCard
          label="Missed Follow Ups"
          value={stats.missedFollowups || 0}
          sub="Overdue, needs action"
          icon={AlertTriangle}
          color="orange"
        />
        <StatCard
          label="Converted"
          value={stats.converted || 0}
          sub="Successful conversions"
          icon={UserCheck}
          color="emerald"
        />
      </div>

      {/* MAIN CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* LEADS OVERVIEW */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-slate-200">Leads Overview</h2>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Monthly lead growth (last 6 months)</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.total || 0}</p>
              <p className="text-xs text-emerald-500 font-medium">Total leads</p>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SAMPLE_TREND}>
                <defs>
                  <linearGradient id="leadChart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#5C1B1B" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#5C1B1B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#5C1B1B', strokeWidth: 1, strokeDasharray: '4 3' }} />
                <Area type="monotone" dataKey="leads" stroke="#5C1B1B" strokeWidth={2.5} fill="url(#leadChart)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LEAD SOURCES */}
        <div className="card p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-800 dark:text-slate-200">Lead Sources</h2>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Acquisition channels</p>
          </div>
          {sourceData.length === 0 ? (
            <div className="h-[190px] flex items-center justify-center text-sm text-gray-400 dark:text-slate-500">
              No source data yet
            </div>
          ) : (
            <>
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceData} innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value">
                      {sourceData.map((entry, index) => (
                        <Cell key={index} fill={sourceColor(entry.name, index)} />
                      ))}
                    </Pie>
                    <Tooltip content={<SourceTooltip />} isAnimationActive={false} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {sourceData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sourceColor(item.name, index) }} />
                      <span className="text-sm text-gray-600 dark:text-slate-400 capitalize">{item.name.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{item.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* FOLLOWUP SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* WEEKLY CHART */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-slate-200">Weekly Followups</h2>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Followup engagement tracking</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.pendingFollowups || 0}</p>
              <p className="text-xs text-emerald-500 font-medium">Pending</p>
            </div>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SAMPLE_FOLLOWUP} barSize={22}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip content={<FollowupTooltip />} cursor={{ fill: 'rgba(92,27,27,0.10)' }} />
                <Bar dataKey="followups" fill="#5C1B1B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="space-y-5">

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 dark:text-slate-500">Not Interested</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-2">{stats.not_interested || 0}</h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Leads declined</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                <PhoneCall size={22} className="text-orange-500 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 dark:text-slate-500">No Response</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-2">{stats.no_response || 0}</h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Awaiting reply</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                <TrendingUp size={22} className="text-gray-500 dark:text-slate-400" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 dark:text-slate-500">Conversion Rate</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-2">
                  {stats.total ? `${Math.round((stats.converted / stats.total) * 100)}%` : '0%'}
                </h3>
                <p className="text-xs text-emerald-500 font-medium mt-2">From total leads</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <UserCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
