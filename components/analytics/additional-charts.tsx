"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Users, DollarSign, BarChart3, PieChart as PieChartIcon, Calendar } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from "recharts"

// Custom tooltip with glassmorphism effect
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl p-2.5 sm:p-3.5 shadow-xl max-w-[85vw] text-xs sm:text-sm">
        <p className="font-bold text-gray-900 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5 text-xs sm:text-sm">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 truncate">{entry.name}:</span>
            <span className="font-bold text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Participants by Department Chart
export function ParticipantsByDepartmentChart({ data }: { data: any[] }) {
  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#6366f1", "#f97316", "#14b8a6"]

  return (
    <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-white rounded-2xl overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3 border-b border-blue-100/50">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold">Participants by Department</CardTitle>
            <CardDescription className="text-[11px] sm:text-xs">Distribution across academic departments</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2.5 sm:p-6 pt-3 sm:pt-6">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="horizontal" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" stroke="#9ca3af" style={{ fontSize: "11px", fontWeight: 500 }} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#9ca3af"
              style={{ fontSize: "11px", fontWeight: 500 }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={1500}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Participants by Year Chart
export function ParticipantsByYearChart({ data }: { data: any[] }) {
  const COLORS = ["#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#10b981", "#6366f1", "#f97316", "#14b8a6"]

  if (!data || data.length === 0) {
    return (
      <Card className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-amber-50 to-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Participants by Year of Study</CardTitle>
              <CardDescription>Year-wise student distribution</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-sm text-muted-foreground">No data available. Participants need to fill in their year of study during event registration.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-amber-50 to-white rounded-2xl overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3 border-b border-amber-100/50">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-sm">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold">Participants by Year of Study</CardTitle>
            <CardDescription className="text-[11px] sm:text-xs">Year-wise student distribution</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2.5 sm:p-6 pt-3 sm:pt-6">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(props: any) => `${props.name}: ${(props.payload?.percentage || 0).toFixed(0)}%`}
              outerRadius={90}
              fill="#8884d8"
              dataKey="count"
              animationDuration={1500}
              style={{ fontSize: "11px", fontWeight: 600 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Event Comparison Chart
export function EventComparisonChart({ data }: { data: any[] }) {
  return (
    <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-white rounded-2xl overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3 border-b border-purple-100/50">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-sm">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold">Event Performance Comparison</CardTitle>
            <CardDescription className="text-[11px] sm:text-xs">Compare registrations and attendance across events</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2.5 sm:p-6 pt-3 sm:pt-6">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="title"
              stroke="#9ca3af"
              style={{ fontSize: "10px", fontWeight: 500 }}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis stroke="#9ca3af" style={{ fontSize: "11px", fontWeight: 500 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "11px", fontWeight: 600 }} />
            <Bar dataKey="registrations" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Registrations" />
            <Bar dataKey="attendance" fill="#ec4899" radius={[6, 6, 0, 0]} name="Attendance" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Registration by Category Chart
export function RegistrationByCategoryChart({ data }: { data: any[] }) {
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

  return (
    <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-white rounded-2xl overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3 border-b border-green-100/50">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-sm">
            <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold">Registrations by Category</CardTitle>
            <CardDescription className="text-[11px] sm:text-xs">Event category distribution</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2.5 sm:p-6 pt-3 sm:pt-6">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
              animationDuration={1500}
              label={(props: any) => `${props.name} (${(props.percent * 100).toFixed(0)}%)`}
              labelLine={{ stroke: "#9ca3af", strokeWidth: 1 }}
              style={{ fontSize: "10px", fontWeight: 600 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Income vs Expenses Chart
export function IncomeVsExpensesChart({ data }: { data: any }) {
  const chartData = [
    { name: "Total Income", value: data.totalIncome, fill: "#10b981" },
    { name: "Total Expenses", value: data.totalExpenses, fill: "#ef4444" },
    { name: "Net Profit", value: data.netProfit, fill: data.netProfit >= 0 ? "#3b82f6" : "#f59e0b" },
  ]

  return (
    <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-50 to-white rounded-2xl overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3 border-b border-emerald-100/50">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg shadow-sm">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold">Income vs Expenses</CardTitle>
            <CardDescription className="text-[11px] sm:text-xs">Financial performance overview</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2.5 sm:p-6 pt-3 sm:pt-6">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              style={{ fontSize: "11px", fontWeight: 500 }}
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: "11px", fontWeight: 500 }}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={<CustomTooltip />}
              formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, ""]}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1500}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-green-50 rounded-xl border border-green-200">
            <p className="text-[10px] sm:text-xs text-green-600 font-semibold mb-0.5">Total Income</p>
            <p className="text-base sm:text-lg font-bold text-green-900">₹{data.totalIncome.toLocaleString()}</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-red-50 rounded-xl border border-red-200">
            <p className="text-[10px] sm:text-xs text-red-600 font-semibold mb-0.5">Total Expenses</p>
            <p className="text-base sm:text-lg font-bold text-red-900">₹{data.totalExpenses.toLocaleString()}</p>
          </div>
          <div className={`p-2.5 sm:p-3 rounded-xl border ${data.netProfit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
            <p className={`text-[10px] sm:text-xs font-semibold mb-0.5 ${data.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Net Profit</p>
            <p className={`text-base sm:text-lg font-bold ${data.netProfit >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
              ₹{data.netProfit.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Expense Breakdown Chart
export function ExpenseBreakdownChart({ data }: { data: any[] }) {
  const COLORS = ["#ef4444", "#f59e0b", "#8b5cf6", "#3b82f6", "#10b981"]

  return (
    <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-white rounded-2xl overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3 border-b border-red-100/50">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-sm">
            <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold">Expense Breakdown</CardTitle>
            <CardDescription className="text-[11px] sm:text-xs">Detailed expense allocation</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2.5 sm:p-6 pt-3 sm:pt-6">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(props: any) => `${props.payload?.category || props.name}: ${(props.payload?.percentage || 0).toFixed(0)}%`}
              outerRadius={85}
              fill="#8884d8"
              dataKey="amount"
              animationDuration={1500}
              style={{ fontSize: "10px", fontWeight: 600 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 max-h-[220px] overflow-y-auto">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-white/80 border border-red-50 rounded-xl text-xs sm:text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="font-medium text-gray-700 truncate">{item.category}</span>
              </div>
              <span className="font-bold text-gray-900 shrink-0 ml-2">₹{item.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Participants by Gender Chart
export function ParticipantsByGenderChart({ data }: { data: any[] }) {
  const COLORS = ["#3b82f6", "#ec4899", "#8b5cf6"]

  return (
    <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-pink-50 to-white rounded-2xl overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3 border-b border-pink-100/50">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg shadow-sm">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold">Participants by Gender</CardTitle>
            <CardDescription className="text-[11px] sm:text-xs">Gender distribution analysis</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2.5 sm:p-6 pt-3 sm:pt-6">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={4}
              dataKey="count"
              animationDuration={1500}
              label={(props: any) => `${props.name}: ${(props.payload?.percentage || 0).toFixed(0)}%`}
              style={{ fontSize: "10px", fontWeight: 600 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Engagement Trends Over Time
export function EngagementTrendsOverTimeChart({ data }: { data: any[] }) {
  return (
    <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-indigo-50 to-white rounded-2xl overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3 border-b border-indigo-100/50">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold">Engagement Trends Over Time</CardTitle>
            <CardDescription className="text-[11px] sm:text-xs">Registration and attendance patterns</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2.5 sm:p-6 pt-3 sm:pt-6">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="registrationsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              style={{ fontSize: "11px", fontWeight: 500 }}
            />
            <YAxis stroke="#9ca3af" style={{ fontSize: "11px", fontWeight: 500 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "11px", fontWeight: 600 }} />
            <Area
              type="monotone"
              dataKey="registrations"
              fill="url(#registrationsGradient)"
              stroke="#8b5cf6"
              strokeWidth={2}
              name="Registrations"
              animationDuration={2000}
            />
            <Line
              type="monotone"
              dataKey="attendance"
              stroke="#ec4899"
              strokeWidth={3}
              dot={{ fill: "#ec4899", r: 3 }}
              name="Attendance"
              animationDuration={1500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
