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
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
         {/* Avatar */}
         <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
           <img src={userData?.gender?.toLowerCase() === 'female' ? '/girl.png' : '/boy.png'} alt="Student Avatar" className="w-full h-full object-cover" />
         </div>

         {/* Profile Info Area */}
         <div className="space-y-1.5 flex-1">
           {/* Tags & Name */}
           <div className="flex flex-wrap items-center gap-2">
             <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wide">
               STUDENT PORTAL
             </span>
             <span className="text-slate-300">•</span>
             <span className="text-slate-500 font-medium text-xs sm:text-sm truncate max-w-[200px] sm:max-w-md">
               {normalizedCollege}
             </span>
           </div>

           <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 pt-1">
             Welcome back, {userData?.full_name?.split(' ')[0] || 'Student'}
           </h1>
           <p className="text-sm text-slate-500 font-medium">
             {displayBranch} • Real-time event schedule, recommendations, and verified credentials.
           </p>

           {/* Badges */}
           <div className="pt-3 flex flex-wrap items-center gap-2">
            <Link href="/dashboard/student/rank">
              <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-[11px] sm:text-xs hover:bg-indigo-100 px-3 py-1.5 transition-colors flex items-center gap-1.5 rounded-xl shadow-none">
                <Zap className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />
                <span>{stats.totalXp} XP • {userTier.name}</span>
              </Badge>
            </Link>

            <Badge className="bg-slate-50 text-slate-700 border-none font-semibold text-[11px] sm:text-xs px-3 py-1.5 rounded-xl shadow-none">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              {stats.registeredEvents} Registered
            </Badge>

            <Badge className="bg-emerald-50 text-emerald-700 border-none font-semibold text-[11px] sm:text-xs px-3 py-1.5 rounded-xl shadow-none">
              <Award className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              {stats.certificates} Credentials
            </Badge>
           </div>
         </div>
      </div>

      {/* ================= ACTIVE EVENT PASS (IF REGISTERED) ================= */}
      {nextUpcomingEvent && (
        <Card className="border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-white shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Ticket className="h-6 w-6" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5">
                    UPCOMING ENTRY PASS
                  </Badge>
                  <span className="text-xs text-slate-500 font-medium">
                    {new Date(nextUpcomingEvent.event.start_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg truncate">
                  {nextUpcomingEvent.event.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 truncate">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{nextUpcomingEvent.event.venue || nextUpcomingEvent.event.location || 'Campus Venue'}</span>
                  <span>•</span>
                  <span>{nextUpcomingEvent.event.club?.name || 'Club'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
              <Link href="/dashboard/student/qr">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-9 shadow-sm flex items-center gap-1.5">
                  <QrCode className="h-4 w-4" />
                  <span>Open Check-in Pass</span>
                </Button>
              </Link>
              <Link href={`/dashboard/student/events/${nextUpcomingEvent.event.id}`}>
                <Button variant="outline" className="rounded-xl border-slate-200 text-xs font-semibold h-9">
                  Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= PRACTICAL STATS GRID ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link href="#schedule" onClick={() => setFeedTab('registrations')}>
          <div className="group flex items-center gap-3 w-full h-full p-4 bg-white rounded-2xl border border-slate-200 shadow-xs transition-all hover:shadow-md hover:border-slate-300 cursor-pointer">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg sm:text-xl text-slate-900 leading-none">{stats.registeredEvents}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate mt-1">Registered Events</p>
            </div>
            <div className="shrink-0 h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 transition-transform group-hover:translate-x-1">
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/student/certificates">
          <div className="group flex items-center gap-3 w-full h-full p-4 bg-white rounded-2xl border border-slate-200 shadow-xs transition-all hover:shadow-md hover:border-slate-300 cursor-pointer">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg sm:text-xl text-slate-900 leading-none">{stats.attendedEvents}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate mt-1">Attended Check-ins</p>
            </div>
            <div className="shrink-0 h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 transition-transform group-hover:translate-x-1">
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/student/certificates">
          <div className="group flex items-center gap-3 w-full h-full p-4 bg-white rounded-2xl border border-slate-200 shadow-xs transition-all hover:shadow-md hover:border-slate-300 cursor-pointer">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Star className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg sm:text-xl text-slate-900 leading-none">{stats.certificates}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate mt-1">Digital Credentials</p>
            </div>
            <div className="shrink-0 h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 transition-transform group-hover:translate-x-1">
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/student/my-clubs">
          <div className="group flex items-center gap-3 w-full h-full p-4 bg-white rounded-2xl border border-slate-200 shadow-xs transition-all hover:shadow-md hover:border-slate-300 cursor-pointer">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg sm:text-xl text-slate-900 leading-none">{stats.joinedClubs}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate mt-1">Club Memberships</p>
            </div>
            <div className="shrink-0 h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 transition-transform group-hover:translate-x-1">
              <ArrowRight className="h-3 w-3" />
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
            <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
              <TabsList className="bg-slate-100/90 rounded-xl p-1 border border-slate-200/70 shadow-xs h-auto">
                <TabsTrigger 
                  value="recommended" 
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs text-slate-600 hover:text-slate-900"
                >
                  <span>Recommended For You</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${feedTab === 'recommended' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                    {recommendedList.length}
                  </span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="registrations" 
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs text-slate-600 hover:text-slate-900"
                >
                  <span>My Schedule</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${feedTab === 'registrations' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                    {userRegistrations.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              <Link href="/dashboard/student/browse">
                <Button variant="ghost" size="sm" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/70 rounded-lg">
                  <span>Browse All</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </Link>
            </div>

            {/* TAB 1: RECOMMENDATIONS */}
            <TabsContent value="recommended" className="space-y-3.5 mt-0 outline-none">
              {recommendedList.length === 0 ? (
                <Card className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
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
                  const eventDate = new Date(event.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  const attendees = eventAttendees[event.id] || { users: [], totalCount: 0 };

                  return (
                    <Card
                      key={event.id}
                      className="border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200/90 rounded-2xl bg-white transition-all duration-200 overflow-hidden group"
                    >
                      <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-2 min-w-0 flex-1">
                          {/* Badges Row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                              {matchScore}% Match
                            </span>

                            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold capitalize">
                              {event.mode || 'offline'}
                            </Badge>

                            {event.entry_fee === 0 ? (
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                Free
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                ₹{event.entry_fee}
                              </span>
                            )}

                            {event.club?.name && (
                              <span className="text-[11px] text-slate-500 font-medium truncate">
                                • {event.club.name}
                              </span>
                            )}
                          </div>

                          {/* Event Title */}
                          <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight group-hover:text-indigo-600 transition-colors truncate">
                            {event.title}
                          </h3>

                          {/* Reason */}
                          <p className="text-xs text-indigo-600 font-semibold truncate">
                            {matchReason}
                          </p>

                          {/* Date & Location */}
                          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {eventDate}
                            </span>
                            <span className="flex items-center gap-1.5 truncate">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {event.venue || event.location || 'Campus Auditorium'}
                            </span>
                          </div>

                          {/* Attendees Stack (Logos / Avatars of recently registered students) */}
                          <div className="pt-1 flex items-center gap-2">
                            {attendees.users.length > 0 ? (
                              <>
                                <div className="flex -space-x-1 overflow-hidden shrink-0">
                                  {attendees.users.map((student, idx) => (
                                    <div
                                      key={student.id || idx}
                                      title={student.name}
                                      className={cn(
                                        "inline-flex h-6 w-6 rounded-full ring-2 ring-white items-center justify-center text-[9px] font-bold text-white shadow-xs select-none shrink-0",
                                        avatarColors[idx % avatarColors.length]
                                      )}
                                    >
                                      {student.initials}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[11px] font-medium text-slate-500">
                                  {attendees.totalCount > attendees.users.length
                                    ? `+${attendees.totalCount} students registered`
                                    : `${attendees.totalCount} ${attendees.totalCount === 1 ? 'student' : 'students'} registered`}
                                </span>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                <Users className="h-3.5 w-3.5 text-slate-400" />
                                <span>Be the first to register</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="shrink-0 w-full sm:w-auto text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <Link href={`/dashboard/student/events/${event.id}`}>
                            <Button className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs h-9 px-4 shadow-sm hover:shadow transition-all">
                              Register Now
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* TAB 2: MY SCHEDULE / REGISTERED */}
            <TabsContent value="registrations" className="space-y-3.5 mt-0 outline-none">
              {userRegistrations.length === 0 ? (
                <Card className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
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
                  const eventDate = new Date(event.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const isAttended = reg.status === 'attended';
                  const attendees = eventAttendees[event.id] || { users: [], totalCount: 0 };

                  return (
                    <Card
                      key={reg.id}
                      className="border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200/90 rounded-2xl bg-white transition-all duration-200 overflow-hidden group"
                    >
                      <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={`text-[10px] font-bold ${isAttended
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                            >
                              {isAttended ? 'Attended & Verified' : 'Registered'}
                            </Badge>
                            <span className="text-[11px] text-slate-500 font-semibold capitalize">
                              {event.mode || 'offline'}
                            </span>
                            {event.club?.name && (
                              <span className="text-[11px] text-slate-500 font-medium">• {event.club.name}</span>
                            )}
                          </div>

                          <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight group-hover:text-indigo-600 transition-colors truncate">
                            {event.title}
                          </h3>

                          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {eventDate}
                            </span>
                            <span className="flex items-center gap-1.5 truncate">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {event.venue || event.location || 'Campus Auditorium'}
                            </span>
                          </div>

                          {/* Attendees Stack */}
                          <div className="pt-1 flex items-center gap-2">
                            {attendees.users.length > 0 ? (
                              <>
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {attendees.users.map((student, idx) => (
                                    <div
                                      key={student.id || idx}
                                      title={student.name}
                                      className={cn(
                                        "inline-flex h-6 w-6 rounded-full ring-2 ring-white items-center justify-center text-[9px] font-bold text-white shadow-xs select-none",
                                        avatarColors[idx % avatarColors.length]
                                      )}
                                    >
                                      {student.initials}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[11px] font-medium text-slate-500">
                                  {attendees.totalCount} participants registered
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <Link href="/dashboard/student/qr">
                            <Button size="sm" variant="outline" className="rounded-xl border-slate-200 text-xs font-semibold h-9 px-3 hover:bg-slate-50">
                              <QrCode className="h-3.5 w-3.5 mr-1 text-slate-600" /> QR Pass
                            </Button>
                          </Link>
                          <Link href={`/dashboard/student/events/${event.id}`}>
                            <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold h-9 px-4">
                              View Event
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN (1/3 width) - PRACTICAL UTILITIES */}
        <div className="space-y-6 lg:mt-[62px]">

          {/* Joined Clubs Snapshot */}
          <Card className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
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
            <Card className="border border-black/5 shadow-sm rounded-2xl bg-white overflow-hidden">
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
