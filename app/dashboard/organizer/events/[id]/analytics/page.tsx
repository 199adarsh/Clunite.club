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

        // Get registrations with user details
        const { data: regData, error: regError } = await supabase
          .from("event_registrations")
          .select(`
            *,
            user:users(*),
            registration_data
          `)
          .eq("event_id", eventId)
          .order("registered_at", { ascending: true })

        if (regError) {
          console.error("Error fetching registrations:", regError)
        }

        const regs = regData || []
        setRegistrations(regs)

        // Generate daily registrations from actual data
        const dailyRegistrationsMap = new Map<string, number>()
        if (regs.length > 0) {
          const firstReg = (regs[0] as any).registered_at || (regs[0] as any).created_at || new Date().toISOString()
          const firstRegDate = new Date(firstReg)
          const today = new Date()
          for (let d = new Date(firstRegDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split("T")[0]
            dailyRegistrationsMap.set(dateStr, 0)
          }
          regs.forEach((reg: any) => {
            const regDateStr = reg.registered_at || reg.created_at || new Date().toISOString()
            const dateStr = new Date(regDateStr).toISOString().split("T")[0]
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

        // Generate demographic data from registrations & user profiles
        const departmentCounts = new Map<string, number>()
        const cStats = new Map<string, number>()
        const departmentColors: Record<string, string> = {
          "Computer Science": "#3b82f6",
          Engineering: "#10b981",
          Technology: "#f59e0b",
          Science: "#ef4444",
          Management: "#8b5cf6",
          General: "#6366f1",
          Other: "#a855f7",
        }

        regs.forEach((reg) => {
          const userCollege = reg.user?.college || reg.registration_data?.participant_details?.college || "General Campus"
          const userBranch = reg.user?.branch || reg.registration_data?.participant_details?.branch || "Engineering"
          
          cStats.set(userCollege, (cStats.get(userCollege) || 0) + 1)
          
          let department = "Other"
          const branchLC = (userBranch + " " + userCollege).toLowerCase()
          if (branchLC.includes("computer") || branchLC.includes("cs") || branchLC.includes("it") || branchLC.includes("aids") || branchLC.includes("aiml")) {
            department = "Computer Science"
          } else if (branchLC.includes("mech") || branchLC.includes("civil") || branchLC.includes("electrical") || branchLC.includes("electronics") || branchLC.includes("tech") || branchLC.includes("engineering")) {
            department = "Engineering"
          } else if (branchLC.includes("science") || branchLC.includes("math") || branchLC.includes("physics")) {
            department = "Science"
          } else if (branchLC.includes("management") || branchLC.includes("business") || branchLC.includes("commerce")) {
            department = "Management"
          }
          departmentCounts.set(department, (departmentCounts.get(department) || 0) + 1)

          if (reg.registration_data?.team_members && Array.isArray(reg.registration_data.team_members)) {
            reg.registration_data.team_members.slice(1).forEach((member: any) => {
              const memberCollege = member.college || userCollege
              const memberBranch = member.branch || userBranch
              cStats.set(memberCollege, (cStats.get(memberCollege) || 0) + 1)
              
              let memberDept = "Other"
              const memberLC = (memberBranch + " " + memberCollege).toLowerCase()
              if (memberLC.includes("computer") || memberLC.includes("cs") || memberLC.includes("it")) {
                memberDept = "Computer Science"
              } else if (memberLC.includes("tech") || memberLC.includes("engineering")) {
                memberDept = "Engineering"
              } else if (memberLC.includes("science")) {
                memberDept = "Science"
              }
              departmentCounts.set(memberDept, (departmentCounts.get(memberDept) || 0) + 1)
            })
          }
        })

        if (departmentCounts.size === 0) {
          departmentCounts.set("General", 1)
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
  let totalParticipantsCount = 0
  let attendedParticipantsCount = 0

  registrations.forEach((reg) => {
    if (reg.status === 'cancelled') return
    let count = 1
    if (reg.registration_data?.team_members && Array.isArray(reg.registration_data.team_members)) {
      count = reg.registration_data.team_members.length
    }
    totalParticipantsCount += count
    if (reg.status === 'attended') {
      attendedParticipantsCount += count
    }
  })

  const totalRegistrations = totalParticipantsCount
  const totalAttended = attendedParticipantsCount
  const attendanceRate = totalRegistrations > 0 ? (totalAttended / totalRegistrations) * 100 : 0
  const registrationRate = event.max_participants ? (totalRegistrations / event.max_participants) * 100 : 0
  const revenue = event.entry_fee ? totalRegistrations * Number(event.entry_fee) : 0
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
                  <p className="text-xs sm:text-sm font-semibold truncate">
                    {new Date(event.start_date || event.date || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Venue</p>
                  <p className="text-xs sm:text-sm font-semibold truncate">{event.venue || event.location || 'Campus Venue'}</p>
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
                  <p className="text-xs text-gray-500">Entry Fee</p>
                  <p className="text-xs sm:text-sm font-semibold truncate">{event.entry_fee ? `₹${event.entry_fee}` : (event.price || "Free")}</p>
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
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold">
                    Sign-ups
                  </Badge>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">Registrations</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">{totalRegistrations}</p>
                  <div className="flex items-center text-xs">
                    <TrendingUp className="h-3.5 w-3.5 mr-1 text-blue-600 shrink-0" />
                    <span className="text-blue-600 font-medium truncate text-[11px] sm:text-xs">Total sign-ups</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className="p-2 sm:p-2.5 rounded-xl text-emerald-600 bg-emerald-50">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold">
                    {Math.round(attendanceRate)}% Turnout
                  </Badge>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">Attended (Check-in)</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">{totalAttended}</p>
                  <div className="flex items-center text-xs">
                    <TrendingUp className="h-3.5 w-3.5 mr-1 text-emerald-600 shrink-0" />
                    <span className="text-emerald-600 font-medium truncate text-[11px] sm:text-xs">{totalAttended} of {totalRegistrations} present</span>
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
                  <Badge className="bg-purple-50 text-purple-700 border-purple-200 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold">
                    Gross
                  </Badge>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">Revenue</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">₹{revenue.toLocaleString()}</p>
                  <div className="flex items-center text-xs">
                    <TrendingUp className="h-3.5 w-3.5 mr-1 text-purple-600 shrink-0" />
                    <span className="text-purple-600 font-medium truncate text-[11px] sm:text-xs">Ticket collections</span>
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
                  <Badge className="bg-orange-50 text-orange-700 border-orange-200 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold">
                    {registrationRate > 0 ? `${registrationRate.toFixed(0)}%` : 'Active'}
                  </Badge>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">Page Views</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">{pageViews.toLocaleString()}</p>
                  <div className="flex items-center text-xs">
                    <TrendingUp className="h-3.5 w-3.5 mr-1 text-orange-600 shrink-0" />
                    <span className="text-orange-600 font-medium truncate text-[11px] sm:text-xs">Interest traffic</span>
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
                  {registrations.slice(0, 10).map((registration, index) => {
                    const participantName = registration.user?.full_name || registration.participant_name || registration.registration_data?.team_members?.[0]?.name || "Participant";
                    const participantEmail = registration.user?.email || registration.participant_email || registration.registration_data?.team_members?.[0]?.email || "N/A";
                    const regDate = new Date(registration.registered_at || registration.created_at || Date.now()).toLocaleDateString();

                    return (
                      <tr key={registration.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm font-medium text-gray-900">{participantName}</td>
                        <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm text-gray-600">{participantEmail}</td>
                        <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm text-gray-600">{regDate}</td>
                        <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm">
                          <Badge 
                            variant={
                              (registration.status === "attended" ? "default" : 
                              registration.status === "registered" ? "secondary" : 
                              registration.status === "cancelled" ? "destructive" : 
                              registration.status === "waitlisted" ? "outline" : 
                              "default") as any
                            }
                            className="text-[10px] sm:text-xs capitalize"
                          >
                            {registration.status || 'Registered'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
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
