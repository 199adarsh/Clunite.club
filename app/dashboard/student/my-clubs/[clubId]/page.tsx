'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  Calendar,
  Star,
  MapPin,
  Clock,
  Trophy,
  ExternalLink,
  Plus,
  Share2,
  ShieldCheck,
  Check,
  Building2,
  Mail,
  User,
  GraduationCap,
  Sparkles,
  Layers,
  FileText,
  MessageSquare,
  Globe,
  Github,
  Linkedin,
  Instagram,
  X,
  Lock,
  ChevronRight,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useClub, joinClubInstant, leaveClubInstant } from '@/hooks/useClubs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatBranchName } from '@/lib/tier-utils';

interface ClubMemberItem {
  id: string;
  role: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    branch: string | null;
    gender: string | null;
  };
}

export default function ClubProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clubId = params.clubId as string;
  const { user: authUser } = useAuth();
  const userId = authUser?.id;

  const { club, events, loading, error, refetch } = useClub(clubId);
  const [activeTab, setActiveTab] = useState('overview');
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [membersList, setMembersList] = useState<ClubMemberItem[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Check if current logged-in user is a member
  useEffect(() => {
    async function checkMembershipAndLoadMembers() {
      if (!clubId) return;
      try {
        setMembersLoading(true);

        // 1. Check user membership
        if (userId) {
          const { data: memberCheck } = await supabase
            .from('club_memberships')
            .select('id')
            .eq('club_id', clubId)
            .eq('user_id', userId)
            .maybeSingle();
          setIsMember(!!memberCheck);
        }

        // 2. Fetch all members of this club
        const { data: memberData } = await supabase
          .from('club_memberships')
          .select(`
            id,
            role,
            user:users (id, full_name, email, avatar_url, branch, gender)
          `)
          .eq('club_id', clubId);

        if (memberData) {
          const validMembers = (memberData as any[])
            .filter((m) => m.user)
            .map((m) => ({
              id: m.id,
              role: m.role || 'Member',
              user: m.user,
            }));
          setMembersList(validMembers);
        }
      } catch (err) {
        console.error('Error fetching club membership data:', err);
      } finally {
        setMembersLoading(false);
      }
    }

    checkMembershipAndLoadMembers();
  }, [clubId, userId]);

  const handleJoin = async () => {
    if (!userId) {
      router.push('/login');
      return;
    }

    try {
      setJoining(true);
      await joinClubInstant(userId, clubId);
      setIsMember(true);
      await refetch();
      toast.success(`Joined ${club?.name || 'club'}!`);
    } catch (err) {
      console.error('Error joining club:', err);
      toast.error('Failed to join club.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!userId) return;

    try {
      setLeaving(true);
      await leaveClubInstant(userId, clubId);
      setIsMember(false);
      await refetch();
      setLeaveModalOpen(false);
      toast.info(`Left ${club?.name || 'club'}.`);
    } catch (err) {
      console.error('Error leaving club:', err);
      toast.error('Failed to leave club.');
    } finally {
      setLeaving(false);
    }
  };

  const handleCopyShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success('Club link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Separate upcoming and past events
  const now = new Date();
  const upcomingEvents = (events || []).filter((e) => new Date(e.start_date) > now || e.status === 'published');
  const pastEvents = (events || []).filter((e) => new Date(e.start_date) <= now && e.status !== 'published');

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] py-16 max-w-7xl mx-auto pb-12">
        <div className="bg-white p-8 rounded-xl border border-black/5 text-center space-y-3 max-w-md shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto font-bold text-lg">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900">Club Not Found</h2>
          <p className="text-xs text-slate-500">
            The club you are looking for might have been moved or removed.
          </p>
          <Button onClick={() => router.push('/dashboard/student/my-clubs')} className="rounded-xl text-xs">
            Back to My Clubs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 antialiased max-w-7xl mx-auto pb-12">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/student/my-clubs">
          <Button variant="ghost" size="sm" className="rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to My Clubs
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyShare}
            className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 mr-1" /> : <Share2 className="h-3.5 w-3.5 mr-1" />}
            {copiedLink ? 'Copied' : 'Share Club'}
          </Button>
        </div>
      </div>

      {/* ================= HERO CLUB BANNER ================= */}
      <div className="relative rounded-xl bg-white border border-zinc-200/80 shadow-sm overflow-hidden">
        {/* Cover Background - Apple/Vercel Minimalist */}
        <div className="h-48 sm:h-64 w-full bg-zinc-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-200/50 to-zinc-50/20 backdrop-blur-3xl" />
          {club.banner_url && (
            <img
              src={club.banner_url}
              alt={club.name}
              className="w-full h-full object-cover opacity-70 mix-blend-multiply transition-transform duration-1000 hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
        </div>

        {/* Content */}
        <div className="p-8 pt-0 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 sm:-mt-20 mb-2">
            {/* Avatar & Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
              <div className="relative shrink-0">
                {club.logo_url ? (
                  <img
                    src={club.logo_url}
                    alt={club.name}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover border border-zinc-200/80 shadow-sm bg-white"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-zinc-100 text-zinc-900 font-semibold text-4xl flex items-center justify-center border border-zinc-200/80 shadow-sm">
                    {club.name.charAt(0)}
                  </div>
                )}
                {club.is_verified && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-lg p-1.5 shadow-sm border-2 border-white" title="Verified Club">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="space-y-2 mt-2 sm:mt-0 pb-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
                    {club.name}
                  </h1>
                  <Badge className="bg-zinc-100 text-zinc-600 border border-zinc-200 text-xs font-medium capitalize px-3 py-1 rounded-lg shadow-none">
                    {club.category}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-500 font-medium flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-zinc-400" />
                  <span>{club.college}</span>
                </p>
              </div>
            </div>

            {/* Membership Action Button */}
            <div className="flex items-center gap-3 shrink-0 mt-4 md:mt-0 pb-1">
              {isMember ? (
                <div className="flex items-center gap-2 bg-zinc-50/80 p-1.5 rounded-lg border border-zinc-200/60 shadow-sm">
                  <Badge className="bg-white text-zinc-700 border-zinc-200 text-xs font-medium px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                    <Check className="h-3.5 w-3.5" />
                    <span>Member</span>
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLeaveModalOpen(true)}
                    className="rounded-lg text-xs font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 h-8 px-4 transition-colors"
                  >
                    Leave
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleJoin}
                  disabled={joining}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg text-sm px-8 h-11 shadow-sm transition-all duration-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {joining ? 'Joining...' : 'Join Club'}
                </Button>
              )}
            </div>
          </div>

          {/* Tagline / Description */}
          {club.tagline && (
            <div className="mt-6">
              <p className="text-[15px] font-medium text-zinc-600 leading-relaxed max-w-3xl">
                {club.tagline}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ================= STATS ROW ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-zinc-200/80 shadow-sm rounded-xl bg-white hover:border-zinc-300 transition-colors duration-300 cursor-default">
          <CardContent className="p-6 text-left">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest block mb-2">Members</span>
            <p className="text-3xl font-medium text-zinc-900 tracking-tight">
              {club.members_count || membersList.length || 1}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/80 shadow-sm rounded-xl bg-white hover:border-zinc-300 transition-colors duration-300 cursor-default">
          <CardContent className="p-6 text-left">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest block mb-2">Events Hosted</span>
            <p className="text-3xl font-medium text-zinc-900 tracking-tight">
              {events.length || club.events_hosted_count || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/80 shadow-sm rounded-xl bg-white hover:border-zinc-300 transition-colors duration-300 cursor-default">
          <CardContent className="p-6 text-left">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest block mb-2">Credibility</span>
            <p className="text-3xl font-medium text-zinc-900 tracking-tight flex items-baseline gap-1">
              {club.credibility_score ? Number(club.credibility_score).toFixed(1) : '9.4'}
              <span className="text-sm font-medium text-zinc-400">/10</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/80 shadow-sm rounded-xl bg-white hover:border-zinc-300 transition-colors duration-300 cursor-default">
          <CardContent className="p-6 text-left">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest block mb-2">Category</span>
            <p className="text-lg font-medium text-zinc-800 capitalize truncate mt-2">
              {club.category || 'Technical'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ================= TABS SECTION ================= */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="w-full overflow-x-auto no-scrollbar pb-1 -mb-1">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 bg-zinc-100/80 p-1 rounded-lg h-auto gap-1">
            <TabsTrigger
              value="overview"
              className="rounded-lg px-5 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all duration-300 shrink-0"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="rounded-lg px-5 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all duration-300 flex items-center gap-2 shrink-0"
            >
              <span>Events</span>
              <Badge className="bg-zinc-200/50 text-zinc-600 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 text-[10px] px-1.5 py-0 h-4 border-0 rounded-lg">
                {events.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="rounded-lg px-5 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all duration-300 flex items-center gap-2 shrink-0"
            >
              <span>Team</span>
              <Badge className="bg-zinc-200/50 text-zinc-600 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 text-[10px] px-1.5 py-0 h-4 border-0 rounded-lg">
                {membersList.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="resources"
              className="rounded-lg px-5 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all duration-300 shrink-0"
            >
              Community
            </TabsTrigger>
          </TabsList>
        </div>

        {/* =========================================================================
            TAB 1: OVERVIEW & NOTICES
           ========================================================================= */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: About & Vision */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-black/5 shadow-sm rounded-xl bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    About the Organization
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <p>
                    {club.description ||
                      `${club.name} is a premier student organization on campus dedicated to fostering collaboration, hands-on learning, and practical problem solving.`}
                  </p>
                  {club.vision && (
                    <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                      <span className="text-[11px] font-bold uppercase text-indigo-700">Vision & Mission</span>
                      <p className="text-xs text-indigo-900 font-medium">{club.vision}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pinned Notices / Announcements */}
              <Card className="border border-black/5 shadow-sm rounded-xl bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    Club Notice Board & Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">Official Orientation & Welcome Meeting</span>
                      <span className="text-[10px] text-slate-400">Recently Pinned</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Welcome all newly joined members! Join our official Discord and WhatsApp groups in the "Community & Links" tab for weekly sync schedules and internal project allocations.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">Upcoming Hackathons & Workshop Series</span>
                      <span className="text-[10px] text-slate-400">Notice</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Check out the "Events" tab to register early for our upcoming campus workshop sessions and earn Clunite verified certificates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Leadership & Info */}
            <div className="space-y-6">
              <Card className="border border-black/5 shadow-sm rounded-xl bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Leadership & Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5 text-xs">
                  {club.faculty_in_charge && (
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Faculty In-Charge</span>
                      <p className="font-bold text-slate-900">{club.faculty_in_charge}</p>
                    </div>
                  )}

                  {club.contact_email && (
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Official Email</span>
                      <p className="font-semibold text-indigo-600 truncate">{club.contact_email}</p>
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Affiliation</span>
                    <p className="font-semibold text-slate-800">{club.college}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 2: EVENTS & SCHEDULE
           ========================================================================= */}
        <TabsContent value="events" className="space-y-6">
          {events.length === 0 ? (
            <div className="bg-white rounded-xl p-12 border border-black/5 text-center space-y-3 shadow-sm">
              <Calendar className="h-8 w-8 text-indigo-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No Events Scheduled</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                This club currently does not have active published events. Check back soon for new hackathons and workshops.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((event) => (
                <Card
                  key={event.id}
                  className="group border border-slate-200/60 shadow-sm hover:shadow-xl rounded-xl bg-white transition-all duration-500 hover:-translate-y-1 overflow-hidden flex flex-col justify-between cursor-pointer"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200/50 text-[10px] font-bold tracking-wide uppercase px-2.5 py-1">
                        {event.mode || 'offline'}
                      </Badge>
                      {event.entry_fee === 0 ? (
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100/50">
                          Free Entry
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                          ₹{event.entry_fee}
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-lg line-clamp-1 group-hover:text-indigo-600 transition-colors duration-300">{event.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed font-medium">
                      {event.description || 'Join this exciting campus event hosted by the club.'}
                    </p>

                    <div className="space-y-2.5 pt-4 border-t border-slate-100/60 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Calendar className="h-3.5 w-3.5" />
                        </div>
                        <span>{new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                          <Users className="h-3.5 w-3.5" />
                        </div>
                        <span>{event.current_participants || 0} registered</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-1.5 m-4 mt-0">
                    <Link
                      href={`/dashboard/student/events/${event.id}`}
                      className="block w-full"
                    >
                      <Button size="sm" className="w-full bg-slate-50 hover:bg-indigo-600 text-slate-700 hover:text-white rounded-xl text-xs font-bold transition-all duration-300 group-hover:shadow-md">
                        View Event Details <ChevronRight className="h-3.5 w-3.5 ml-1.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* =========================================================================
            TAB 3: TEAM & MEMBERS DIRECTORY
           ========================================================================= */}
        <TabsContent value="team" className="space-y-6">
          {membersLoading ? (
            <div className="flex h-48 items-center justify-center bg-white rounded-xl border border-black/5">
              <Skeleton className="h-6 w-32" />
            </div>
          ) : membersList.length === 0 ? (
            <div className="bg-white rounded-xl p-12 border border-black/5 text-center space-y-3 shadow-sm">
              <Users className="h-8 w-8 text-indigo-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No Members Listed</h3>
              <p className="text-xs text-slate-500">Be the first to join this organization!</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {membersList.map((m) => {
                  let avatarUrl = m.user.avatar_url;
                  if (!avatarUrl) {
                    avatarUrl = m.user.gender?.toLowerCase() === 'female' ? '/girl.png' : '/boy.png';
                  }

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-200/40 hover:bg-white hover:border-indigo-200 hover:shadow-lg transition-all duration-300 group cursor-default"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={avatarUrl}
                          alt={m.user.full_name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200/60 bg-white shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-sm"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 text-sm truncate block group-hover:text-indigo-600 transition-colors duration-300">
                            {m.user.full_name || 'Student Member'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium truncate block">
                            {formatBranchName(m.user.branch)}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        <Badge
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm ${
                            m.role.toLowerCase().includes('lead') || m.role.toLowerCase().includes('admin')
                              ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border-none'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          {m.role || 'Member'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* =========================================================================
            TAB 4: RESOURCES & COMMUNITY
           ========================================================================= */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="border border-black/5 shadow-sm rounded-xl bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-indigo-600" />
                  Official Community Channels
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Connect with fellow members and core committee leads.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      WA
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">WhatsApp Community</p>
                      <p className="text-[10px] text-slate-500">Member announcements & quick chat</p>
                    </div>
                  </div>
                  {isMember ? (
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-8">
                      Join Group
                    </Button>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500 text-[10px]">Members Only</Badge>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      DC
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Discord Server</p>
                      <p className="text-[10px] text-slate-500">Dev syncs, voice channels & projects</p>
                    </div>
                  </div>
                  {isMember ? (
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-8">
                      Join Server
                    </Button>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500 text-[10px]">Members Only</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-black/5 shadow-sm rounded-xl bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Shared Learning Materials
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Slide decks, GitHub repos, and workshop resources.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-xs">GitHub Organization & Repos</p>
                    <p className="text-[10px] text-slate-500">Open-source campus projects & codebases</p>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs h-8">
                    View GitHub
                  </Button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-xs">Workshop Slide Decks & Drive</p>
                    <p className="text-[10px] text-slate-500">Handouts, cheat-sheets, and study kits</p>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs h-8">
                    Open Drive
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ================= LEAVE CONFIRMATION MODAL ================= */}
      <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
        <DialogContent className="max-w-sm bg-white rounded-xl p-6 border border-slate-200 shadow-xl">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-base font-bold text-slate-900">
              Leave {club.name}?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to leave? You will lose access to member notices and internal club community links.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLeaveModalOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleLeave}
              disabled={leaving}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
            >
              {leaving ? 'Leaving...' : 'Confirm Leave'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
