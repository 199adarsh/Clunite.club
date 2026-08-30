"use client"

import { useState, useEffect } from "react"
import { supabase, type EventRegistration, type User } from "@/lib/supabase"

interface EventParticipant extends EventRegistration {
  user: User
}

export function useEventParticipants(eventId: string) {
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [eventDetails, setEventDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchParticipants = async () => {
    if (!eventId) {
      setParticipants([])
      setEventDetails(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single()

      if (eventError) throw eventError
      setEventDetails(eventData)

      // Fetch participants
      const { data, error: fetchError } = await supabase
        .from("event_registrations")
        .select(`
          *,
          user:users(*),
          registration_data
        `)
        .eq("event_id", eventId)
        .order("registered_at", { ascending: false })

      if (fetchError) throw fetchError

      // For team events, expand team members into separate participant entries
      const expandedParticipants: any[] = []
      
      data?.forEach(registration => {
        if (registration.registration_data?.team_members && Array.isArray(registration.registration_data.team_members)) {
          // Create a separate entry for each team member
          registration.registration_data.team_members.forEach((member: any, index: number) => {
            expandedParticipants.push({
              ...registration,
              id: `${registration.id}_member_${index}`,
              team_name: registration.team_name,
              user_id: `virtual_${registration.id}_${index}`,
              user: {
                id: `virtual_${registration.id}_${index}`,
                full_name: member.name || member.full_name || 'Team Member',
                email: member.email || 'No email provided',
                college: member.college || registration.user?.college || 'Unknown',
                phone: member.phone || member.mobile || 'No phone provided',
                created_at: registration.registered_at,
                updated_at: registration.registered_at
              },
              is_team_member: true,
              is_team_leader: index === 0,
              team_member_index: index
            })
          })
        } else {
          // Individual registration
          expandedParticipants.push(registration)
        }
      })

      setParticipants(expandedParticipants)
    } catch (err) {
      console.error("Error fetching participants:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const getParticipantsByStatus = (status: string) => {
    if (status === "all") return participants
    return participants.filter(p => p.status === status)
  }

  const getParticipantStats = () => {
    const total = participants.length
    const registered = participants.filter(p => p.status === "registered").length
    const attended = participants.filter(p => p.status === "attended").length
    const waitlisted = participants.filter(p => p.status === "waitlisted").length
    const cancelled = participants.filter(p => p.status === "cancelled").length

    return {
      total,
      registered,
      attended,
      waitlisted,
      cancelled,
    }
  }

  const updateParticipantStatus = async (participantId: string, newStatus: "registered" | "waitlisted" | "cancelled" | "attended") => {
    try {
      // Check if this is an expanded team member (virtual ID)
      const isVirtualMember = participantId.includes('_member_')
      const actualRegistrationId = isVirtualMember ? participantId.split('_member_')[0] : participantId

      console.log('Updating status for participant:', {
        participantId,
        isVirtualMember,
        actualRegistrationId,
        newStatus
      })

      // Update the actual registration in the database
      const { error } = await supabase
        .from("event_registrations")
        .update({ status: newStatus })
        .eq("id", actualRegistrationId)

      if (error) throw error

      // Update local state - for team events, update all members of the team
      setParticipants(prev => prev.map(p => {
        // If it's a team member, check if it belongs to the same registration
        if (p.id.startsWith(actualRegistrationId)) {
          return { ...p, status: newStatus }
        }
        // If it's a regular registration
        if (p.id === participantId) {
          return { ...p, status: newStatus }
        }
        return p
      }))

      return { success: true }
    } catch (err) {
      console.error("Error updating participant status:", err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Failed to update status" 
      }
    }
  }

  useEffect(() => {
    if (!eventId) {
      setParticipants([])
      setEventDetails(null)
      setLoading(false)
      return
    }
    fetchParticipants()
  }, [eventId])

  return {
    participants,
    eventDetails,
    loading,
    error,
    refetch: fetchParticipants,
    getParticipantsByStatus,
    getParticipantStats,
    updateParticipantStatus,
  }
}

export function useOrganizerEvents(userId?: string) {
  const [events, setEvents] = useState<any[]>([])
  const [userClubs, setUserClubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrganizerEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user if not provided
      let currentUserId = userId
      if (!currentUserId) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          setEvents([])
          setUserClubs([])
          setLoading(false)
          return
        }
        currentUserId = session.user.id
      }

      console.log('=== FETCHING EVENTS FOR USER ===', currentUserId)

      // First, get all clubs where user is an admin OR creator
      const { data: memberships, error: membershipsError } = await supabase
        .from('club_memberships')
        .select(`
          *,
          club:clubs(*)
        `)
        .eq('user_id', currentUserId)
        .eq('role', 'admin')

      if (membershipsError) {
        console.error('Memberships error:', membershipsError)
        throw membershipsError
      }

      // Also get clubs created by the user
      const { data: createdClubs, error: createdClubsError } = await supabase
        .from('clubs')
        .select('*')
        .eq('created_by', currentUserId)

      if (createdClubsError) {
        console.error('Created clubs error:', createdClubsError)
        throw createdClubsError
      }

      // Combine clubs from memberships and created clubs (deduplicated)
      const clubsFromMemberships = (memberships || [])
        .map((m: any) => m.club)
        .filter((club: any) => club && club.id)
      
      const clubsFromCreated = createdClubs || []

      // Deduplicate clubs by ID
      const allUserClubs = [...clubsFromMemberships, ...clubsFromCreated]
      const uniqueClubs = Array.from(
        new Map(allUserClubs.map(club => [club.id, club])).values()
      )

      setUserClubs(uniqueClubs)

      // Get all club IDs
      const clubIds = uniqueClubs.map((club: any) => club.id)

      let eventsData: any[] = []

      if (clubIds.length > 0) {
        const { data: clubEvents, error: clubEventsError } = await supabase
          .from('events')
          .select(`
            *,
            club:clubs(*)
          `)
          .in('club_id', clubIds)
          .order('created_at', { ascending: false })

        if (clubEventsError) {
          console.error('Club events error:', clubEventsError)
          throw clubEventsError
        }

        eventsData = clubEvents || []
      }

      // Also fetch events created directly by this user
      const { data: directEvents, error: directEventsError } = await supabase
        .from('events')
        .select(`
          *,
          club:clubs(*)
        `)
        .eq('created_by', currentUserId)
        .order('created_at', { ascending: false })

      if (!directEventsError && directEvents) {
        const existingIds = new Set(eventsData.map(e => e.id))
        directEvents.forEach(e => {
          if (!existingIds.has(e.id)) {
            eventsData.push(e)
          }
        })
      }

      // Fetch participant counts for each event
      const eventsWithStats = await Promise.all(eventsData.map(async (event) => {
        const { data: registrations, error: regError } = await supabase
          .from('event_registrations')
          .select(`
            id,
            status,
            registration_data
          `)
          .eq('event_id', event.id)

        if (regError) {
          console.error(`Error fetching registrations for event ${event.id}:`, regError)
          return {
            ...event,
            participantStats: {
              total: 0,
              registered: 0,
              waitlisted: 0,
              cancelled: 0,
              attended: 0,
            },
            hasParticipants: false
          }
        }

        let totalParticipants = 0
        let registeredCount = 0
        let waitlistedCount = 0
        let cancelledCount = 0
        let attendedCount = 0

        registrations?.forEach((reg: any) => {
          if (reg.registration_data?.team_members && Array.isArray(reg.registration_data.team_members)) {
            const teamSize = reg.registration_data.team_members.length
            if (reg.status !== 'cancelled') {
              totalParticipants += teamSize
            }
            if (reg.status === 'registered') registeredCount += teamSize
            else if (reg.status === 'waitlisted') waitlistedCount += teamSize
            else if (reg.status === 'cancelled') cancelledCount += teamSize
            else if (reg.status === 'attended') attendedCount += teamSize
          } else {
            if (reg.status !== 'cancelled') {
              totalParticipants += 1
            }
            if (reg.status === 'registered') registeredCount += 1
            else if (reg.status === 'waitlisted') waitlistedCount += 1
            else if (reg.status === 'cancelled') cancelledCount += 1
            else if (reg.status === 'attended') attendedCount += 1
          }
        })

        const stats = {
          total: totalParticipants,
          registered: registeredCount,
          waitlisted: waitlistedCount,
          cancelled: cancelledCount,
          attended: attendedCount,
        }

        return {
          ...event,
          participantStats: stats,
          hasParticipants: stats.total > 0
        }
      }))

      setEvents(eventsWithStats)
    } catch (err) {
      console.error("Error fetching organizer events:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizerEvents()
  }, [userId])

  return {
    events,
    userClubs,
    loading,
    error,
    refetch: fetchOrganizerEvents,
  }
}

export function useParticipantsSummary(eventIds: string[]) {
  const [summary, setSummary] = useState({
    totalParticipants: 0,
    registeredCount: 0,
    attendedCount: 0,
    waitlistedCount: 0,
    cancelledCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!eventIds || eventIds.length === 0) {
        setSummary({
          totalParticipants: 0,
          registeredCount: 0,
          attendedCount: 0,
          waitlistedCount: 0,
          cancelledCount: 0,
        })
        return
      }

      const { data, error: fetchError } = await supabase
        .from("event_registrations")
        .select("status")
        .in("event_id", eventIds)

      if (fetchError) throw fetchError

      const statusCounts = (data || []).reduce((acc, registration) => {
        acc[registration.status] = (acc[registration.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      setSummary({
        totalParticipants: data?.length || 0,
        registeredCount: statusCounts.registered || 0,
        attendedCount: statusCounts.attended || 0,
        waitlistedCount: statusCounts.waitlisted || 0,
        cancelledCount: statusCounts.cancelled || 0,
      })
    } catch (err) {
      console.error("Error fetching participants summary:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [JSON.stringify(eventIds)])

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  }
}
