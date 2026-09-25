"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getUserFromDatabase } from "@/lib/sync-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  Users,
  Search,
  Plus,
  MapPin,
  Clock,
  UserCheck,
  UserX,
  Eye,
  Loader2,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useOrganizerEvents } from "@/hooks/useEventParticipants"

export default function OrganizerDashboardPage() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [userData, setUserData] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null)
  const { events, userClubs, loading, error } = useOrganizerEvents(authUser?.id)

  useEffect(() => {
    async function loadUserData() {
      if (authUser) {
        const dbUser = await getUserFromDatabase(authUser.id)
        setUserData(dbUser)
      }
    }
    
    if (!authLoading) {
      loadUserData()
    }
  }, [authUser, authLoading])

  // Auto-select first club when clubs load - but don't auto-select if no clubs
  useEffect(() => {
    if (userClubs && userClubs.length > 0 && !selectedClubId) {
      // Don't auto-select, let user see all events by default
      // setSelectedClubId(userClubs[0].id)
    }
  }, [userClubs])

  // Filter by selected club and search term
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // If no club is selected, show all events
    // If a club is selected, only show events from that club
    const matchesClub = !selectedClubId || event.club_id === selectedClubId
    
    return matchesSearch && matchesClub
  })
  
  console.log('Filtered events:', filteredEvents.length, 'out of', events.length)
  console.log('Selected club ID:', selectedClubId)
  console.log('User clubs:', userClubs)

  // Calculate stats ONLY for filtered events (selected club)
  const totalParticipants = filteredEvents.reduce((sum, event) => sum + event.participantStats.total, 0)
  const totalRegistered = filteredEvents.reduce((sum, event) => sum + event.participantStats.registered, 0)
  const totalAttended = filteredEvents.reduce((sum, event) => sum + event.participantStats.attended, 0)
  const attendanceRate = totalParticipants > 0 ? Math.round((totalAttended / totalParticipants) * 100) : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "ongoing":
        return "bg-green-100 text-green-800 border-green-200"
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-slate-600 font-semibold">Loading events...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading events: {error}</p>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-3 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 space-y-4 sm:space-y-6 md:space-y-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-black/5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Event Participants Dashboard</h1>
            <p className="text-gray-600 font-medium text-sm sm:text-base">View and manage participants for all events</p>
          </div>
          <Link href="/dashboard/organizer/host">
            <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto">
              <Plus className="h-5 w-5 mr-2" />
              Event Management Hub
            </Button>
          </Link>
        </div>

        {/* No Clubs Message */}
        {userClubs && userClubs.length === 0 && (
          <Card className="border border-indigo-100 bg-indigo-50/50 rounded-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-indigo-900 font-bold text-lg">You are not an admin of any clubs yet</p>
              <p className="text-indigo-700 text-sm">Create a club or verify with a PIN to get started</p>
              <Link href="/dashboard/organizer/create-club">
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Club
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
          <Card className="border border-black/5 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all duration-300 bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                  <Calendar className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 hidden sm:flex">Total</Badge>
              </div>
              <div className="space-y-0.5 sm:space-y-2">
                <p className="text-[10px] sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">Events</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">{filteredEvents.length}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 hidden sm:block">{selectedClubId ? 'For selected club' : 'All your clubs'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-black/5 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all duration-300 bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <Users className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <Badge className="bg-purple-50 text-purple-700 border-purple-200 hidden sm:flex">Sign-ups</Badge>
              </div>
              <div className="space-y-0.5 sm:space-y-2">
                <p className="text-[10px] sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">Sign-ups</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">{totalParticipants}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 hidden sm:block">{selectedClubId ? 'For selected club' : 'All your clubs'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-black/5 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all duration-300 bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                  <UserCheck className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hidden sm:flex">Attended</Badge>
              </div>
              <div className="space-y-0.5 sm:space-y-2">
                <p className="text-[10px] sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">Attended</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">{totalAttended}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 hidden sm:block">Verified check-ins</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-black/5 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all duration-300 bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 hidden sm:flex">Rate</Badge>
              </div>
              <div className="space-y-0.5 sm:space-y-2">
                <p className="text-[10px] sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">Turnout</p>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">{attendanceRate}%</p>
                <p className="text-[10px] sm:text-xs text-gray-600 hidden sm:block">Attendance ratio</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Events List */}
        <Card className="border border-black/5 shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">All Events</CardTitle>
                <CardDescription className="text-xs">View participants for each event</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No events found</p>
                <p className="text-gray-400 text-sm">Try adjusting your search or create a new event</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col p-4 sm:p-6 border border-slate-100 rounded-xl hover:shadow-md hover:border-indigo-500 transition-all duration-300 gap-3"
                  >
                    {/* Top row: avatar + title + meta */}
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
                        {event.title.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-base sm:text-lg truncate">{event.title}</div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:text-sm text-gray-600 mt-0.5">
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-none">{event.venue || event.location || 'Campus Venue'}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" />
                            <span>{formatDate(event.start_date)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Bottom row: stats + action */}
                    <div className="flex items-center justify-between pl-[52px] sm:pl-[64px]">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div>
                          <div className="text-base sm:text-lg font-bold text-gray-900">{event.participantStats.total}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">Total</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs">
                            <UserCheck className="h-3 w-3 text-green-600" />
                            <span className="text-green-600 font-medium">{event.participantStats.registered}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <UserX className="h-3 w-3 text-red-600" />
                            <span className="text-red-600 font-medium">{event.participantStats.cancelled}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Users className="h-3 w-3 text-blue-600" />
                            <span className="text-blue-600 font-medium">{event.participantStats.attended}</span>
                          </div>
                        </div>
                      </div>
                      <Link href={`/dashboard/organizer/events/${event.id}/participants`}>
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm px-3 sm:px-4">
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                          <span className="hidden sm:inline">View Participants</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
