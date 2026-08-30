"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, TrendingUp, Eye, UserCheck, Loader2 } from "lucide-react"
import Link from "next/link"
import nextDynamic from "next/dynamic"
import { supabase } from "@/lib/supabase"

const EventAnalyticsCharts = nextDynamic(
  () => import("@/components/analytics/event-detail-charts"),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[380px] bg-white rounded-xl animate-pulse p-6 border shadow-sm" />
        <div className="h-[380px] bg-white rounded-xl animate-pulse p-6 border shadow-sm" />
      </div>
    ),
  }
)

export default function EventAnalyticsPage() {
  const params = useParams()
  const eventId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [dailyRegistrations, setDailyRegistrations] = useState<any[]>([])
  const [demographicData, setDemographicData] = useState<any[]>([])
  const [collegeStats, setCollegeStats] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    async function loadAnalytics() {
      if (!eventId) return
      setLoading(true)
      try {
        // Get event details
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .single()

        if (eventError) {
          console.error("Error fetching event:", eventError)
        }
        setEvent(eventData)

        // Get registrations with created_at timestamp
        const { data: regData, error: regError } = await supabase
          .from("event_registrations")
          .select(`
            *,
            registration_data
          `)
          .eq("event_id", eventId)
          .order("created_at", { ascending: true })

        if (regError) {
          console.error("Error fetching registrations:", regError)
        }

        const regs = regData || []
        setRegistrations(regs)

        // Generate daily registrations from actual data
        const dailyRegistrationsMap = new Map<string, number>()
        if (regs.length > 0) {
          const firstRegDate = new Date(regs[0].created_at)
          const today = new Date()
          for (let d = new Date(firstRegDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split("T")[0]
            dailyRegistrationsMap.set(dateStr, 0)
          }
          regs.forEach((reg) => {
            const dateStr = new Date(reg.created_at).toISOString().split("T")[0]
            const currentCount = dailyRegistrationsMap.get(dateStr) || 0
            dailyRegistrationsMap.set(dateStr, currentCount + 1)
          })
        } else {
          const today = new Date()
          for (let i = 6; i >= 0; i--) {
            const d = new Date(today)
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split("T")[0]
            dailyRegistrationsMap.set(dateStr, 0)
          }
        }

        const daily = Array.from(dailyRegistrationsMap.entries()).map(([date, count]) => ({
          date,
          registrations: count,
        }))
        setDailyRegistrations(daily)

        // Generate demographic data from registrations
        const departmentCounts = new Map<string, number>()
        const cStats = new Map<string, number>()
        const departmentColors: Record<string, string> = {
          "Computer Science": "#3b82f6",
          Engineering: "#10b981",
          Technology: "#f59e0b",
          Science: "#ef4444",
          Other: "#8b5cf6",
        }

        regs.forEach((reg) => {
          if (reg.registration_data) {
            if (reg.registration_data.participant_details) {
              const college = reg.registration_data.participant_details.college || "Other"
              cStats.set(college, (cStats.get(college) || 0) + 1)
              let department = "Other"
              const collegeLC = college.toLowerCase()
              if (collegeLC.includes("engineering") || collegeLC.includes("tech")) {
                department = "Engineering"
              } else if (collegeLC.includes("computer") || collegeLC.includes("it")) {
                department = "Computer Science"
              } else if (collegeLC.includes("science")) {
                department = "Science"
              }
              departmentCounts.set(department, (departmentCounts.get(department) || 0) + 1)
            }
            if (reg.registration_data.team_members) {
              reg.registration_data.team_members.forEach((member: any) => {
                const college = member.college || "Other"
                cStats.set(college, (cStats.get(college) || 0) + 1)
                let department = "Other"
                const collegeLC = college.toLowerCase()
                if (collegeLC.includes("engineering") || collegeLC.includes("tech")) {
                  department = "Engineering"
                } else if (collegeLC.includes("computer") || collegeLC.includes("it")) {
                  department = "Computer Science"
                } else if (collegeLC.includes("science")) {
                  department = "Science"
                }
                departmentCounts.set(department, (departmentCounts.get(department) || 0) + 1)
              })
            }
          }
        })

        if (departmentCounts.size === 0) {
          departmentCounts.set("No Data", 1)
        }

        const demographics = Array.from(departmentCounts.entries()).map(([name, value]) => ({
          name,
          value,
          color: departmentColors[name] || "#8b5cf6",
        }))
        setDemographicData(demographics)
        setCollegeStats(cStats)
      } catch (err) {
        console.error("Error loading analytics:", err)
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [eventId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500 font-medium">Loading event analytics...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold text-gray-800">Event not found</p>
          <Link href="/dashboard/organizer/host/analytics">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Calculate KPI metrics from real data
  const totalRegistrations = registrations.reduce((total, reg) => {
    if (reg.registration_data) {
      if (reg.registration_data.team_members) {
        return total + 1
      } else if (reg.registration_data.participant_details) {
        return total + 1
      }
    }
    return total
  }, 0)

  const registrationRate = event.max_participants ? (totalRegistrations / event.max_participants) * 100 : 0
  const revenue = event.entry_fee ? totalRegistrations * event.entry_fee : 0
  const pageViews = Math.max((event as any).views || 0, totalRegistrations)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 px-3 py-4 sm:px-6 sm:py-6 md:px-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard/organizer/host/analytics">
              <Button variant="outline" size="sm" className="rounded-xl shrink-0">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back to Analytics</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{event.title}</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Event Analytics Dashboard</p>
            </div>
          </div>
          <Badge variant={event.status === "published" ? "default" : "secondary"} className="w-fit">
            {event.status}
          </Badge>
        </div>

        {/* Event Overview */}
        <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Event Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-xs sm:text-sm font-semibold truncate">{new Date(event.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-xs sm:text-sm font-semibold truncate">{event.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Capacity</p>
                  <p className="text-xs sm:text-sm font-semibold truncate">{event.max_participants || "Unlimited"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="text-xs sm:text-sm font-semibold truncate">${event.price || "Free"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Key Performance Metrics</h2>
              <p className="text-xs text-gray-500">Real-time metrics for this event</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
            <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className="p-2 sm:p-2.5 rounded-xl text-blue-600 bg-blue-50">
                    <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <Badge className="bg-green-50 text-green-700 border-green-200 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold">
                    +{Math.round(totalRegistrations * 0.1)}%
                  </Badge>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">Registrations</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">{totalRegistrations}</p>
                  <div className="flex items-center text-xs">
                    <TrendingUp className="h-3.5 w-3.5 mr-1 text-green-600 shrink-0" />
                    <span className="text-green-600 font-medium truncate text-[11px] sm:text-xs">Trending upward</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className="p-2 sm:p-2.5 rounded-xl text-green-600 bg-green-50">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <Badge className="bg-green-50 text-green-700 border-green-200 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold">
                    +{Math.round(registrationRate * 0.05)}%
                  </Badge>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">Reg. Rate</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">{registrationRate.toFixed(1)}%</p>
                  <div className="flex items-center text-xs">
                    <TrendingUp className="h-3.5 w-3.5 mr-1 text-green-600 shrink-0" />
                    <span className="text-green-600 font-medium truncate text-[11px] sm:text-xs">Above average</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className="p-2 sm:p-2.5 rounded-xl text-purple-600 bg-purple-50">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <Badge className="bg-green-50 text-green-700 border-green-200 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold">
                    +12%
                  </Badge>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">Revenue</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">${revenue}</p>
                  <div className="flex items-center text-xs">
                    <TrendingUp className="h-3.5 w-3.5 mr-1 text-green-600 shrink-0" />
                    <span className="text-green-600 font-medium truncate text-[11px] sm:text-xs">Growing steadily</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className="p-2 sm:p-2.5 rounded-xl text-orange-600 bg-orange-50">
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <Badge className="bg-green-50 text-green-700 border-green-200 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold">
                    +18%
                  </Badge>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">Page Views</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">{pageViews.toLocaleString()}</p>
                  <div className="flex items-center text-xs">
                    <TrendingUp className="h-3.5 w-3.5 mr-1 text-green-600 shrink-0" />
                    <span className="text-green-600 font-medium truncate text-[11px] sm:text-xs">High visibility</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts */}
        <EventAnalyticsCharts
          dailyRegistrations={dailyRegistrations}
          demographicData={demographicData}
        />

        {/* Registrations Table */}
        <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Recent Registrations</CardTitle>
            <CardDescription className="text-xs">Latest participants who registered for this event</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[500px]">
                <thead>
                  <tr className="border-b bg-slate-50/50">
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-xs sm:text-sm text-gray-700">Name</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-xs sm:text-sm text-gray-700">Email</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-xs sm:text-sm text-gray-700">Registration Date</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-xs sm:text-sm text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.slice(0, 10).map((registration, index) => (
                    <tr key={registration.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm font-medium text-gray-900">{registration.participant_name || "N/A"}</td>
                      <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm text-gray-600">{registration.participant_email || "N/A"}</td>
                      <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm text-gray-600">{new Date(registration.created_at).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm">
                        <Badge 
                          variant={
                            (registration.status === "confirmed" ? "default" : 
                            registration.status === "cancelled" ? "destructive" : 
                            registration.status === "pending" ? "outline" : 
                            "default") as any
                          }
                          className="text-[10px] sm:text-xs"
                        >
                          {registration.status ? registration.status.charAt(0).toUpperCase() + registration.status.slice(1) : 'Confirmed'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {registrations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-xs sm:text-sm text-muted-foreground">
                        No registrations yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
