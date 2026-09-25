'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getUserFromDatabase } from '@/lib/sync-user';
import { getUserAvatarUrl } from '@/lib/avatar-utils';
import { supabase } from '@/lib/supabase';
import { normalizeCollegeName, formatBranchName, getTier } from '@/lib/tier-utils';
import { fetchUserCertificates } from '@/lib/certificate-utils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Calendar,
  Award,
  Users,
  QrCode,
  Clock,
  MapPin,
  Sparkles,
  Loader2,
  Building2,
  Trophy,
  ArrowRight,
  CheckCircle2,
  Ticket,
  ChevronRight,
  ExternalLink,
  Zap,
  GraduationCap,
  Flame,
  Check,
  ArrowUpRight,
  FileText,
  Star
} from 'lucide-react';

const avatarColors = [
  'bg-indigo-600',
  'bg-purple-600',
  'bg-emerald-600',
  'bg-blue-600',
  'bg-amber-600',
  'bg-rose-600',
];

/* ---------------- RECOMMENDATION ENGINE HELPER ---------------- */
interface RecommendedEventItem {
  event: any;
  matchScore: number;
  matchReason: string;
  isLive: boolean;
}

function computeEventRecommendations(
  events: any[],
  userCollege: string,
  userBranch: string,
  joinedClubIds: Set<string>,
  registeredEventIds: Set<string>
): RecommendedEventItem[] {
  const now = new Date();
  const collegeLower = (userCollege || '').toLowerCase().trim();
  const branchLower = (userBranch || '').toLowerCase().trim();

  return (events || [])
    .filter((e) => {
      // 1. Must be published & not already registered
      if (e.status !== 'published') return false;
      if (registeredEventIds.has(e.id)) return false;

      // 2. Must be CURRENTLY LIVE / NOT EXPIRED
      if (e.registration_deadline) {
        const deadline = new Date(e.registration_deadline);
        if (deadline < now) return false;
      } else if (e.end_date) {
        const endDate = new Date(e.end_date);
        if (endDate < now) return false;
      } else if (e.start_date) {
        const startDate = new Date(e.start_date);
        if (startDate < now) return false;
      }

      return true;
    })
    .map((e) => {
      let score = 50; // Base score
      let matchReason = 'Trending Campus Event';

      const eventCol = (e.college || e.club?.college || '').toLowerCase();
      const eventTitle = (e.title || '').toLowerCase();
      const eventDesc = (e.description || '').toLowerCase();
      const eventText = `${eventTitle} ${eventDesc}`;

      const isSameCampus = collegeLower && (eventCol.includes(collegeLower) || collegeLower.includes(eventCol));
      const isJoinedClub = e.club_id && joinedClubIds.has(e.club_id);

      // Branch match
      let isBranchMatch = false;
      if (branchLower) {
        const keywords = branchLower.split(' ').filter((w) => w.length > 2);
        isBranchMatch = keywords.some((kw) => eventText.includes(kw));
        if (branchLower.includes('ai') || branchLower.includes('data') || branchLower.includes('cs') || branchLower.includes('tech')) {
          if (eventText.includes('hackathon') || eventText.includes('code') || eventText.includes('ai') || eventText.includes('data') || eventText.includes('web') || eventText.includes('tech')) {
            isBranchMatch = true;
          }
        }
      }

      if (isSameCampus && isBranchMatch) {
        score = 98;
        matchReason = `Direct Match for ${formatBranchName(userBranch)} at ${normalizeCollegeName(userCollege) || 'Campus'}`;
      } else if (isJoinedClub) {
        score = 95;
        matchReason = `Hosted by your joined club (${e.club?.name || 'Club'})`;
      } else if (isBranchMatch) {
        score = 91;
        matchReason = `Recommended for ${formatBranchName(userBranch)} students`;
      } else if (isSameCampus) {
        score = 86;
        matchReason = `Campus Spotlight at ${normalizeCollegeName(userCollege) || 'Campus'}`;
      } else if (e.prize_pool && Number(e.prize_pool) > 0) {
        score = 80;
        matchReason = `High Prize Pool (₹${Number(e.prize_pool).toLocaleString()})`;
      }

      return {
        event: e,
        matchScore: score,
        matchReason,
        isLive: true,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

function getEventStatusInfo(event: Event) {
  const now = new Date();
  const deadlineStr = event.registration_deadline || event.start_date;

  if (!deadlineStr) {
    return {
      isLive: true,
      statusLabel: 'Live • Open',
      daysLeftText: 'Open for registration',
      urgency: 'normal' as const,
    };
  }

  const deadline = new Date(deadlineStr);
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0 || event.status === 'completed' || event.status === 'cancelled') {
    return {
      isLive: false,
      statusLabel: 'Registration Closed',
      daysLeftText: 'Closed',
      urgency: 'closed' as const,
    };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return {
      isLive: true,
      statusLabel: 'Live Now',
      daysLeftText: diffHours <= 1 ? 'Ends in < 1 hr' : `Ends in ${diffHours}h`,
      urgency: 'critical' as const,
    };
  } else if (diffDays <= 3) {
    return {
      isLive: true,
      statusLabel: 'Live Now',
      daysLeftText: `${diffDays} ${diffDays === 1 ? 'day' : 'days'} left`,
      urgency: 'urgent' as const,
    };
  } else {
    return {
      isLive: true,
      statusLabel: 'Live Now',
      daysLeftText: `${diffDays} days left`,
      urgency: 'normal' as const,
    };
  }
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    registeredEvents: 0,
    attendedEvents: 0,
    certificates: 0,
    joinedClubs: 0,
    totalXp: 0,
  });

  // Data lists
  const [userRegistrations, setUserRegistrations] = useState<any[]>([]);
  const [recommendedList, setRecommendedList] = useState<RecommendedEventItem[]>([]);
  const [userClubsList, setUserClubsList] = useState<any[]>([]);
  const [recentCerts, setRecentCerts] = useState<any[]>([]);
  const [eventAttendees, setEventAttendees] = useState<Record<string, { users: Array<{ id: string; name: string; initials: string }>; totalCount: number }>>({});

  // Active Feed View: 'registrations' | 'recommended'
  const [feedTab, setFeedTab] = useState<'recommended' | 'registrations'>('recommended');

  useEffect(() => {
    if (authLoading) return;

    if (!authUser) {
      router.push('/login');
      return;
    }

    async function fetchDashboardData() {
      try {
        setLoading(true);
        const dbUser = await getUserFromDatabase(authUser!.id);
        setUserData(dbUser);

        // Fetch parallel data from Supabase
        const [
          { data: regs, error: regsError },
          { data: memberships },
          { data: explicitCerts },
          { data: publishedEvents },
          { data: recentAttendeesData }
        ] = await Promise.all([
          supabase
            .from('event_registrations')
            .select(`
              id,
              status,
              registered_at,
              event:events(
                id,
                title,
                description,
                start_date,
                end_date,
                registration_deadline,
                venue,
                mode,
                entry_fee,
                prize_pool,
                image_url,
                status,
                college,
                contact_info,
                club:clubs(id, name, logo_url)
              )
            `)
            .eq('user_id', authUser!.id)
            .order('registered_at', { ascending: false }),

          supabase
            .from('club_memberships')
            .select(`
              id,
              role,
              club:clubs(id, name, logo_url, category, college)
            `)
            .eq('user_id', authUser!.id),

          (supabase as any)
            .from('issued_certificates')
            .select('id, certificate_code, issued_at, event_id')
            .or(`user_id.eq.${authUser!.id},recipient_email.eq.${authUser!.email}`)
            .order('issued_at', { ascending: false }),

          supabase
            .from('events')
            .select(`
              *,
              club:clubs(*)
            `)
            .eq('status', 'published')
            .order('start_date', { ascending: true }),

          supabase
            .from('event_registrations')
            .select(`
              id,
              event_id,
              user_id,
              status,
              user:users(id, full_name, college, branch)
            `)
            .in('status', ['registered', 'attended'])
            .limit(300)
        ]);

        if (regsError) {
          console.error('Error fetching student registrations:', regsError);
        }

        // Process Registrations (handle both aliased event and fallback events)
        const validRegs = (regs || [])
          .map((r: any) => ({
            ...r,
            event: r.event || r.events,
          }))
          .filter((r) => r.event);
        setUserRegistrations(validRegs);

        const registeredEventsCount = validRegs.filter((r) => r.status !== 'cancelled').length;
        const attendedEventsCount = validRegs.filter((r) => r.status === 'attended').length;

        // Process Memberships
        const validClubs = (memberships || []).map((m: any) => m.club).filter(Boolean);
        setUserClubsList(validClubs);
        const joinedClubsCount = validClubs.length;
        const joinedClubIds = new Set(validClubs.map((c: any) => c.id));

        // Process Attendee Avatars
        const attendeesMap: Record<string, { users: Array<{ id: string; name: string; initials: string }>; totalCount: number }> = {};
        (recentAttendeesData || []).forEach((reg: any) => {
          const eId = reg.event_id;
          if (!eId) return;
          if (!attendeesMap[eId]) {
            attendeesMap[eId] = { users: [], totalCount: 0 };
          }
          attendeesMap[eId].totalCount += 1;
          const fullName = reg.user?.full_name;
          if (fullName && attendeesMap[eId].users.length < 4) {
            if (!attendeesMap[eId].users.some((u) => u.id === reg.user_id)) {
              const initials = fullName
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'ST';
              attendeesMap[eId].users.push({
                id: reg.user_id,
                name: fullName,
                initials,
              });
            }
          }
        });
        setEventAttendees(attendeesMap);

        // Process Certificates via unified fetchUserCertificates
        const userCerts = authUser ? await fetchUserCertificates(authUser) : [];
        const certificatesCount = userCerts.length;
        setRecentCerts(userCerts.slice(0, 3));

        // Compute Live XP
        const totalXp =
          registeredEventsCount * 10 +
          attendedEventsCount * 30 +
          certificatesCount * 50 +
          joinedClubsCount * 15;

        setStats({
          registeredEvents: registeredEventsCount,
          attendedEvents: attendedEventsCount,
          certificates: certificatesCount,
          joinedClubs: joinedClubsCount,
          totalXp,
        });

        // Run Recommendation Engine (Live Events Only)
        const registeredEventIds = new Set(validRegs.map((r) => (r.event as any)?.id));
        const computedRecommendations = computeEventRecommendations(
          publishedEvents || [],
          dbUser?.college || '',
          dbUser?.branch || '',
          joinedClubIds,
          registeredEventIds
        );

        setRecommendedList(computedRecommendations);
      } catch (err) {
        console.error('Error fetching student dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [authUser, authLoading, router]);

  // Find nearest upcoming registered event for the active pass
  const nextUpcomingEvent = useMemo(() => {
    const now = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const upcoming = userRegistrations
      .filter((r) => r.status !== 'cancelled' && new Date(r.event.start_date) >= now)
      .sort((a, b) => new Date(a.event.start_date).getTime() - new Date(b.event.start_date).getTime());
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [userRegistrations]);

  const userTier = getTier(stats.totalXp);
  const normalizedCollege = normalizeCollegeName(userData?.college) || userData?.college || 'Campus';
  const displayBranch = formatBranchName(userData?.branch);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ================= HERO & IDENTITY ================= */}
      <div className="bg-white rounded-xl border border-zinc-200/80 p-8 flex flex-col sm:flex-row sm:items-center gap-8 shadow-sm">
         {/* Avatar */}
         <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden shrink-0 shadow-sm">
           <img src={userData?.gender?.toLowerCase() === 'female' ? '/girl.png' : '/boy.png'} alt="Student Avatar" className="w-full h-full object-cover" />
         </div>

         {/* Profile Info Area */}
         <div className="space-y-2 flex-1">
           {/* Tags & Name */}
           <div className="flex flex-wrap items-center gap-2">
             <span className="bg-zinc-100 text-zinc-600 font-medium text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest border border-zinc-200">
               Student Portal
             </span>
             <span className="text-zinc-300">•</span>
             <span className="text-zinc-500 font-medium text-xs sm:text-sm truncate max-w-[200px] sm:max-w-md">
               {normalizedCollege}
             </span>
           </div>

           <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 pt-1">
             Welcome back, {userData?.full_name?.split(' ')[0] || 'Student'}
           </h1>
           <p className="text-[15px] text-zinc-500 font-medium">
             {displayBranch} • Real-time event schedule, recommendations, and verified credentials.
           </p>

           {/* Badges */}
           <div className="pt-4 flex flex-wrap items-center gap-3">
            <Link href="/dashboard/student/rank">
              <Badge className="bg-white text-zinc-700 border border-zinc-200 font-medium text-[11px] sm:text-xs hover:bg-zinc-50 px-4 py-1.5 transition-colors flex items-center gap-1.5 rounded-lg shadow-sm">
                <Zap className="h-3.5 w-3.5 text-zinc-400 fill-zinc-400" />
                <span>{stats.totalXp} XP • {userTier.name}</span>
              </Badge>
            </Link>

            <Badge className="bg-white text-zinc-700 border border-zinc-200 font-medium text-[11px] sm:text-xs px-4 py-1.5 rounded-lg shadow-sm">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
              {stats.registeredEvents} Registered
            </Badge>

            <Badge className="bg-white text-zinc-700 border border-zinc-200 font-medium text-[11px] sm:text-xs px-4 py-1.5 rounded-lg shadow-sm">
              <Award className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
              {stats.certificates} Credentials
            </Badge>
           </div>
         </div>
      </div>

      {/* ================= ACTIVE EVENT PASS (IF REGISTERED) ================= */}
      {nextUpcomingEvent && (
        <Card className="border border-zinc-200/80 bg-zinc-50 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-sm shrink-0">
                <Ticket className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className="bg-zinc-200 text-zinc-700 text-[10px] font-medium px-3 py-1 rounded-lg uppercase tracking-widest border-none">
                    Upcoming Entry Pass
                  </Badge>
                  <span className="text-xs text-zinc-500 font-medium">
                    {new Date(nextUpcomingEvent.event.start_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h3 className="font-semibold text-zinc-900 text-base sm:text-xl tracking-tight truncate">
                  {nextUpcomingEvent.event.title}
                </h3>
                <p className="text-[13px] text-zinc-500 font-medium flex items-center gap-1.5 truncate">
                  <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span>{nextUpcomingEvent.event.venue || nextUpcomingEvent.event.location || 'Campus Venue'}</span>
                  <span className="text-zinc-300">•</span>
                  <span>{nextUpcomingEvent.event.club?.name || 'Club'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 pt-3 sm:pt-0">
              <Link href="/dashboard/student/qr">
                <Button className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg text-xs h-10 px-5 shadow-sm flex items-center gap-2 transition-all">
                  <QrCode className="h-4 w-4" />
                  <span>Open Check-in Pass</span>
                </Button>
              </Link>
              <Link href={`/dashboard/student/events/${nextUpcomingEvent.event.id}`}>
                <Button variant="outline" className="rounded-lg border-zinc-200 text-xs font-medium h-10 px-5 hover:bg-white transition-all">
                  Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= PRACTICAL STATS GRID ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="#schedule" onClick={() => setFeedTab('registrations')}>
          <div className="group flex items-center gap-4 w-full h-full p-6 bg-white rounded-xl border border-zinc-200/80 shadow-sm transition-all hover:border-zinc-300 cursor-pointer">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest block mb-2">Registered</span>
              <p className="text-3xl font-medium text-zinc-900 tracking-tight">{stats.registeredEvents}</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/student/certificates">
          <div className="group flex items-center gap-4 w-full h-full p-6 bg-white rounded-xl border border-zinc-200/80 shadow-sm transition-all hover:border-zinc-300 cursor-pointer">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest block mb-2">Attended</span>
              <p className="text-3xl font-medium text-zinc-900 tracking-tight">{stats.attendedEvents}</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/student/certificates">
          <div className="group flex items-center gap-4 w-full h-full p-6 bg-white rounded-xl border border-zinc-200/80 shadow-sm transition-all hover:border-zinc-300 cursor-pointer">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest block mb-2">Credentials</span>
              <p className="text-3xl font-medium text-zinc-900 tracking-tight">{stats.certificates}</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/student/my-clubs">
          <div className="group flex items-center gap-4 w-full h-full p-6 bg-white rounded-xl border border-zinc-200/80 shadow-sm transition-all hover:border-zinc-300 cursor-pointer">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest block mb-2">Memberships</span>
              <p className="text-3xl font-medium text-zinc-900 tracking-tight">{stats.joinedClubs}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* ================= MAIN 2-COLUMN LAYOUT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* LEFT COLUMN (2/3 width) - LIVE EVENT SCHEDULE & RECOMMENDATION ENGINE */}
        <div className="lg:col-span-2">
          <Tabs 
            defaultValue="recommended" 
            value={feedTab} 
            onValueChange={(val) => setFeedTab(val as 'recommended' | 'registrations')}
            className="w-full space-y-4"
          >
            {/* Feed Switcher Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 pb-2">
              <TabsList className="bg-zinc-100/80 p-1 rounded-lg border border-zinc-200/50 h-auto">
                <TabsTrigger 
                  value="recommended" 
                  className="px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500"
                >
                  <span>Recommended</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${feedTab === 'recommended' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-200/50 text-zinc-600'}`}>
                    {recommendedList.length}
                  </span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="registrations" 
                  className="px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500"
                >
                  <span>My Schedule</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${feedTab === 'registrations' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-200/50 text-zinc-600'}`}>
                    {userRegistrations.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              <Link href="/dashboard/student/browse">
                <Button variant="ghost" size="sm" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg px-4">
                  <span>Browse All</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            {/* TAB 1: RECOMMENDATIONS */}
            <TabsContent value="recommended" className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-0 outline-none">
              {recommendedList.length === 0 ? (
                <Card className="col-span-full rounded-xl border border-slate-200/80 bg-white p-10 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">No Live Events Currently Open</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-0">
                    All current events for your campus have closed registration or passed. Check back soon for newly published hackathons and workshops.
                  </p>
                  <Link href="/dashboard/student/browse" className="inline-block mt-4">
                    <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">
                      Browse Full Event Directory
                    </Button>
                  </Link>
                </Card>
              ) : (
                recommendedList.map(({ event, matchScore, matchReason }) => {
                  const statusInfo = getEventStatusInfo(event);
                  const attendees = eventAttendees[event.id] || { users: [], totalCount: 0 };
                  const collegeName = event.college || event.club?.college || 'Campus';

                  return (
                    <Link key={event.id} href={`/dashboard/student/events/${event.id}`} className="block group h-full">
                      <Card className={cn(
                        "h-full rounded-xl border bg-white shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group cursor-pointer overflow-hidden",
                        statusInfo.isLive ? "border-slate-200" : "border-slate-200 opacity-90"
                      )}>
                        {/* IMAGE SECTION */}
                        <div className="relative h-[200px] w-full bg-slate-100 shrink-0 overflow-hidden">
                          <img
                            src={event.image_url || '/placeholder.svg'}
                            alt={event.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                          
                          {/* Time Left Badge */}
                          <div className={cn(
                            "absolute top-4 left-4 px-3 py-1.5 rounded-lg text-[11px] font-extrabold shadow-sm flex items-center gap-2 z-10 backdrop-blur-md",
                            statusInfo.isLive 
                              ? "bg-rose-500 text-white" 
                              : "bg-slate-900/90 text-slate-100"
                          )}>
                            <span className={cn(
                              "w-2 h-2 rounded-lg",
                              statusInfo.isLive ? "bg-white animate-pulse" : "bg-slate-400"
                            )} />
                            {statusInfo.daysLeftText}
                          </div>

                          <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-[11px] font-extrabold shadow-sm bg-indigo-600 text-white z-10 backdrop-blur-md">
                            {matchScore}% Match
                          </div>
                        </div>

                        {/* AVATAR OVERLAY */}
                        <div className="px-6 relative h-0">
                          <div className="absolute -top-10 left-6 w-[80px] h-[80px] bg-white border-4 border-white rounded-lg flex items-center justify-center shadow-md overflow-hidden z-20">
                            {event.club?.logo_url ? (
                              <img src={event.club.logo_url} className="w-full h-full object-cover bg-white" alt="Club logo" />
                            ) : (
                              <span className="text-slate-800 font-black text-2xl">{event.club?.name?.charAt(0) || 'C'}</span>
                            )}
                          </div>
                        </div>

                        {/* CONTENT SECTION */}
                        <div className="pt-14 px-6 pb-6 flex flex-col flex-1">
                          
                          {/* Title & Registered Count */}
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-extrabold text-xl text-slate-900 leading-tight tracking-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">
                              {event.title}
                            </h3>
                            <div className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold mt-0.5 border border-indigo-100">
                              <Users className="w-3.5 h-3.5" />
                              {attendees.totalCount} joined
                            </div>
                          </div>

                          {/* Subtitle */}
                          <p className="mt-2 text-xs font-bold text-slate-500 uppercase tracking-wider line-clamp-1">
                            {event.club?.name || 'DKTE'} <span className="text-slate-300 mx-1">&bull;</span> {collegeName}
                          </p>

                          <p className="mt-1 text-xs text-indigo-600 font-semibold truncate">
                            {matchReason}
                          </p>

                          {/* Badges */}
                          <div className="flex items-center gap-2 mt-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                              <Trophy className="w-3.5 h-3.5" />
                              {event.type || 'Competition'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold capitalize border border-slate-200">
                              <span className="w-2 h-2 rounded-lg bg-slate-500" />
                              {event.mode || 'Offline'}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="mt-4 text-[13px] text-slate-600 font-medium leading-relaxed line-clamp-2">
                            {event.description || 'An exciting event coming up.'}
                          </p>

                          <div className="mt-auto pt-6">
                            {/* Stats Box */}
                            <div className="border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-slate-50/50">
                              <div className="flex items-center gap-2.5 w-1/3">
                                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                  <Trophy className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 truncate">
                                    {event.prize_pool && Number(event.prize_pool) > 0 ? `₹${Number(event.prize_pool).toLocaleString()}` : '-'}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Prize</p>
                                </div>
                              </div>

                              <div className="w-px h-8 bg-slate-200 shrink-0" />

                              <div className="flex items-center gap-2.5 w-1/3 justify-center">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 truncate">
                                    {new Date(event.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Date</p>
                                </div>
                              </div>

                              <div className="w-px h-8 bg-slate-200 shrink-0" />

                              <div className="flex items-center gap-2.5 w-1/3 justify-end pr-1">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                  <IndianRupee className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 truncate">
                                    {event.entry_fee === 0 ? 'Free' : `₹${event.entry_fee}`}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Entry</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 w-full bg-slate-900 hover:bg-indigo-600 text-white text-sm font-bold py-3.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                              View Details <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })
              )}
 )}
            </TabsContent>

            {/* TAB 2: MY SCHEDULE / REGISTERED */}
            <TabsContent value="registrations" className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-0 outline-none">
              {userRegistrations.length === 0 ? (
                <Card className="col-span-full rounded-xl border border-slate-200/80 bg-white p-10 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">No Active Registrations</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-0">
                    You have not registered for any events yet. Check the "Recommended For You" tab to register.
                  </p>
                  <div className="mt-4">
                    <Button
                      onClick={() => setFeedTab('recommended')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                    >
                      View Recommended Events
                    </Button>
                  </div>
                </Card>
              ) : (
                userRegistrations.map((reg) => {
                  const event = reg.event;
                  const statusInfo = getEventStatusInfo(event);
                  const isAttended = reg.status === 'attended';
                  const attendees = eventAttendees[event.id] || { users: [], totalCount: 0 };
                  const collegeName = event.college || event.club?.college || 'Campus';

                  return (
                    <Link key={reg.id} href={`/dashboard/student/events/${event.id}`} className="block group h-full">
                      <Card className={cn(
                        "h-full rounded-xl border bg-white shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group cursor-pointer overflow-hidden",
                        statusInfo.isLive ? "border-slate-200" : "border-slate-200 opacity-90"
                      )}>
                        {/* IMAGE SECTION */}
                        <div className="relative h-[200px] w-full bg-slate-100 shrink-0 overflow-hidden">
                          <img
                            src={event.image_url || '/placeholder.svg'}
                            alt={event.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                          
                          {/* Status Badge */}
                          <div className={cn(
                            "absolute top-4 left-4 px-3 py-1.5 rounded-lg text-[11px] font-extrabold shadow-sm flex items-center gap-2 z-10 backdrop-blur-md",
                            isAttended 
                              ? "bg-emerald-500 text-white" 
                              : "bg-blue-500 text-white"
                          )}>
                            {isAttended ? 'Attended & Verified' : 'Registered'}
                          </div>
                        </div>

                        {/* AVATAR OVERLAY */}
                        <div className="px-6 relative h-0">
                          <div className="absolute -top-10 left-6 w-[80px] h-[80px] bg-white border-4 border-white rounded-lg flex items-center justify-center shadow-md overflow-hidden z-20">
                            {event.club?.logo_url ? (
                              <img src={event.club.logo_url} className="w-full h-full object-cover bg-white" alt="Club logo" />
                            ) : (
                              <span className="text-slate-800 font-black text-2xl">{event.club?.name?.charAt(0) || 'C'}</span>
                            )}
                          </div>
                        </div>

                        {/* CONTENT SECTION */}
                        <div className="pt-14 px-6 pb-6 flex flex-col flex-1">
                          
                          {/* Title & Registered Count */}
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-extrabold text-xl text-slate-900 leading-tight tracking-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">
                              {event.title}
                            </h3>
                            <div className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold mt-0.5 border border-indigo-100">
                              <Users className="w-3.5 h-3.5" />
                              {attendees.totalCount} joined
                            </div>
                          </div>

                          {/* Subtitle */}
                          <p className="mt-2 text-xs font-bold text-slate-500 uppercase tracking-wider line-clamp-1">
                            {event.club?.name || 'DKTE'} <span className="text-slate-300 mx-1">&bull;</span> {collegeName}
                          </p>

                          {/* Badges */}
                          <div className="flex items-center gap-2 mt-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                              <Trophy className="w-3.5 h-3.5" />
                              {event.type || 'Competition'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold capitalize border border-slate-200">
                              <span className="w-2 h-2 rounded-lg bg-slate-500" />
                              {event.mode || 'Offline'}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="mt-4 text-[13px] text-slate-600 font-medium leading-relaxed line-clamp-2">
                            {event.description || 'An exciting event coming up.'}
                          </p>

                          <div className="mt-auto pt-6">
                            {/* Stats Box */}
                            <div className="border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-slate-50/50">
                              <div className="flex items-center gap-2.5 w-1/3">
                                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                  <Trophy className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 truncate">
                                    {event.prize_pool && Number(event.prize_pool) > 0 ? `₹${Number(event.prize_pool).toLocaleString()}` : '-'}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Prize</p>
                                </div>
                              </div>

                              <div className="w-px h-8 bg-slate-200 shrink-0" />

                              <div className="flex items-center gap-2.5 w-1/3 justify-center">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 truncate">
                                    {new Date(event.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Date</p>
                                </div>
                              </div>

                              <div className="w-px h-8 bg-slate-200 shrink-0" />

                              <div className="flex items-center gap-2.5 w-1/3 justify-end pr-1">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                  <IndianRupee className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 truncate">
                                    {event.entry_fee === 0 ? 'Free' : `₹${event.entry_fee}`}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Entry</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 flex gap-2 w-full">
                              <Button variant="outline" className="flex-1 rounded-lg border-slate-200 hover:bg-slate-50 h-11" asChild>
                                <Link href="/dashboard/student/qr">
                                  QR Pass
                                </Link>
                              </Button>
                              <Button className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white h-11" asChild>
                                <Link href={`/dashboard/student/events/${event.id}`}>
                                  View
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })
              )}
 )}
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN (1/3 width) - PRACTICAL UTILITIES */}
        <div className="space-y-6 lg:mt-[62px]">

          {/* Joined Clubs Snapshot */}
          <Card className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Your Clubs
              </CardTitle>
              <Link href="/dashboard/student/my-clubs" className="text-xs text-indigo-600 hover:underline font-semibold">
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {userClubsList.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-500 mb-0">You haven't joined any campus clubs.</p>
                  <Link href="/dashboard/student/my-clubs" className="inline-block mt-3">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-8">
                      Explore Clubs
                    </Button>
                  </Link>
                </div>
              ) : (
                userClubsList.slice(0, 3).map((club: any) => (
                  <Link key={club.id} href={`/dashboard/student/my-clubs/${club.id}`} className="block">
                    <div className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-200/70 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {club.logo_url ? (
                          <img src={club.logo_url} alt={club.name} className="w-8 h-8 rounded-lg object-cover bg-white shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">
                            {club.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-bold text-xs text-slate-900 truncate">{club.name}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Credentials Snapshot */}
          {recentCerts.length > 0 && (
            <Card className="border border-black/5 shadow-sm rounded-xl bg-white overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  Recent Credentials
                </CardTitle>
                <Link href="/dashboard/student/certificates" className="text-xs text-emerald-700 hover:underline font-semibold">
                  All ({stats.certificates})
                </Link>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {recentCerts.map((cert) => (
                  <div key={cert.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">Certificate of Completion</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{cert.certificate_code}</p>
                    </div>
                    <Link href="/dashboard/student/certificates">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] font-semibold text-emerald-700">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
