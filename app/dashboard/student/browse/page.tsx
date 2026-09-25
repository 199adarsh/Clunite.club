'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Calendar,
  Users,
  Trophy,
  Globe,
  Monitor,
  MapPin,
  Sparkles,
  ArrowUpDown,
  LayoutGrid,
  List,
  RotateCcw,
  ChevronRight,
  Filter,
  CheckCircle2,
  Tag,
  Building2,
  GraduationCap,
  X,
  Bookmark,
  IndianRupee,
} from 'lucide-react';
import { supabase, type Event, type Club } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { getUserFromDatabase } from '@/lib/sync-user';
import { cn } from '@/lib/utils';

interface EventWithClub extends Event {
  club?: Club | null;
}

const avatarColors = [
  'bg-indigo-600',
  'bg-purple-600',
  'bg-emerald-600',
  'bg-blue-600',
  'bg-amber-600',
  'bg-rose-600',
];

/* Helper to compute deadline & live status */
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

export default function BrowseEventsPage() {
  const { user: authUser } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [events, setEvents] = useState<EventWithClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventAttendees, setEventAttendees] = useState<Record<string, { users: Array<{ id: string; name: string; initials: string }>; totalCount: number }>>({});

  // Filters & State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'closed'>('all');
  const [campusFilter, setCampusFilter] = useState<'all' | 'my_college' | 'inter_college'>('all');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [mode, setMode] = useState('all');
  const [sortBy, setSortBy] = useState<'upcoming' | 'popular' | 'prize' | 'fee_asc'>('upcoming');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (authUser) {
      getUserFromDatabase(authUser.id).then(setUserData);
    }
  }, [authUser]);

  useEffect(() => {
    fetchEventsAndAttendees();
  }, []);

  const fetchEventsAndAttendees = async () => {
    try {
      setLoading(true);
      const [eventsRes, attendeesRes] = await Promise.all([
        supabase
          .from('events')
          .select('*, club:clubs(*)')
          .order('start_date', { ascending: true }),

        supabase
          .from('event_registrations')
          .select('id, event_id, user_id, status, user:users(id, full_name, college, branch)')
          .in('status', ['registered', 'attended'])
          .limit(400),
      ]);

      const loadedEvents = eventsRes.data || [];
      setEvents(loadedEvents);

      // Process Attendees
      const attendeesMap: Record<string, { users: Array<{ id: string; name: string; initials: string }>; totalCount: number }> = {};
      (attendeesRes.data || []).forEach((reg: any) => {
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
    } catch (err) {
      console.error('Error loading browse events:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort Logic
  const filteredEvents = useMemo(() => {
    const q = search.toLowerCase().trim();
    const userCollege = (userData?.college || '').toLowerCase().trim();

    let result = events.filter((e) => {
      const statusInfo = getEventStatusInfo(e);
      const eventCollege = (e.college || e.club?.college || '').toLowerCase().trim();
      const isMyCollege = userCollege && (eventCollege.includes(userCollege) || userCollege.includes(eventCollege));

      // Live / Closed Filter
      if (statusFilter === 'live' && !statusInfo.isLive) return false;
      if (statusFilter === 'closed' && statusInfo.isLive) return false;

      // Campus Filter
      if (campusFilter === 'my_college' && !isMyCollege) return false;
      if (campusFilter === 'inter_college' && isMyCollege) return false;

      // Search
      const matchSearch =
        !q ||
        e.title?.toLowerCase().includes(q) ||
        e.club?.name?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.venue?.toLowerCase().includes(q) ||
        e.college?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Dropdown filters
      if (category !== 'all' && e.category !== category) return false;
      if (type !== 'all' && e.type !== type) return false;
      if (mode !== 'all' && e.mode !== mode) return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'popular') {
        const countA = eventAttendees[a.id]?.totalCount || a.current_participants || 0;
        const countB = eventAttendees[b.id]?.totalCount || b.current_participants || 0;
        return countB - countA;
      }
      if (sortBy === 'prize') {
        return (Number(b.prize_pool) || 0) - (Number(a.prize_pool) || 0);
      }
      if (sortBy === 'fee_asc') {
        return (Number(a.entry_fee) || 0) - (Number(b.entry_fee) || 0);
      }
      // default: upcoming soonest
      const dateA = new Date(a.start_date).getTime();
      const dateB = new Date(b.start_date).getTime();
      return dateA - dateB;
    });

    return result;
  }, [events, search, statusFilter, campusFilter, category, type, mode, sortBy, eventAttendees, userData]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCampusFilter('all');
    setCategory('all');
    setType('all');
    setMode('all');
    setSortBy('upcoming');
  };

  const isFiltered =
    search !== '' ||
    statusFilter !== 'all' ||
    campusFilter !== 'all' ||
    category !== 'all' ||
    type !== 'all' ||
    mode !== 'all' ||
    sortBy !== 'upcoming';

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Calendar className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500">Loading campus events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ================= HERO HEADER ================= */}
      <div className="relative rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-200/60 via-purple-100/30 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-2 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-bold uppercase tracking-wider">
              Directory
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Campus Events
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Explore hackathons, workshops, cultural fests, and club competitions across campuses.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-white/90 backdrop-blur rounded-xl border border-slate-200 px-4 py-2 text-center shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Available Events</p>
            <p className="text-xl font-extrabold text-slate-900">{filteredEvents.length}</p>
          </div>
        </div>
      </div>

      {/* ================= FILTER & SEARCH BAR ================= */}
      <div className="space-y-3">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2 w-full xl:w-fit bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5 transition-all">
          {/* Search Input */}
          <div className="relative flex-1 w-full xl:min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              className="pl-9 pr-8 h-9 w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-[13px] font-medium shadow-none"
              placeholder="Search events, clubs, colleges, venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear Search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Separator on desktop */}
          <div className="hidden xl:block h-5 w-px bg-slate-200 shrink-0 mx-0.5" />

          {/* Dropdown Filters Container */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-hide px-1">
            {/* Campus Scope Dropdown */}
            <Select value={campusFilter} onValueChange={(val: any) => setCampusFilter(val)}>
              <SelectTrigger className="h-8 w-auto min-w-[110px] bg-slate-50 hover:bg-slate-100 border-none rounded-xl text-[11px] font-semibold shadow-none focus:ring-0 transition-colors px-3">
                <SelectValue placeholder="All Campuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campuses</SelectItem>
                <SelectItem value="my_college">My College</SelectItem>
                <SelectItem value="inter_college">Inter-College</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Dropdown */}
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="h-8 w-auto min-w-[100px] bg-slate-50 hover:bg-slate-100 border-none rounded-xl text-[11px] font-semibold shadow-none focus:ring-0 transition-colors px-3">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="live">Live & Open</SelectItem>
                <SelectItem value="closed">Closed / Past</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Dropdown */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 w-auto min-w-[115px] bg-slate-50 hover:bg-slate-100 border-none rounded-xl text-[11px] font-semibold shadow-none focus:ring-0 transition-colors px-3">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Cultural">Cultural</SelectItem>
                <SelectItem value="Sports">Sports</SelectItem>
              </SelectContent>
            </Select>

            {/* Mode Dropdown */}
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="h-8 w-auto min-w-[95px] bg-slate-50 hover:bg-slate-100 border-none rounded-xl text-[11px] font-semibold shadow-none focus:ring-0 transition-colors px-3">
                <SelectValue placeholder="All Modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By Dropdown */}
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-8 w-auto min-w-[140px] bg-slate-50 hover:bg-slate-100 border-none rounded-xl text-[11px] font-semibold shadow-none focus:ring-0 transition-colors px-3">
                <span className="flex items-center gap-1.5 truncate">

                  <SelectValue placeholder="Sort: Upcoming Soonest" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming Soonest</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="prize">Highest Prize Pool</SelectItem>
                <SelectItem value="fee_asc">Free First</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset Filters Button */}
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 px-2.5 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors ml-0.5"
                title="Reset all filters"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}

            {/* Separator before view toggles */}
            <div className="hidden lg:block h-5 w-px bg-slate-200 shrink-0 mx-1" />

            {/* Grid / List View Toggle */}
            <div className="hidden lg:flex items-center bg-slate-100/80 rounded-[10px] p-0.5 border border-slate-200/60 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'h-7 w-7 rounded-[8px] flex items-center justify-center transition-all',
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                )}
                title="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'h-7 w-7 rounded-[8px] flex items-center justify-center transition-all',
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                )}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= EVENTS CONTENT ================= */}
      {filteredEvents.length === 0 ? (
        <Card className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Events Match Your Filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query, switching campus or live status, or clearing active filters.
          </p>
          <Button
            onClick={handleResetFilters}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold mt-2"
          >
            Clear All Filters
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        /* ================= WIDER GRID VIEW ================= */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEvents.map((event) => {
            const eventDate = new Date(event.start_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const attendees = eventAttendees[event.id] || { users: [], totalCount: 0 };
            const statusInfo = getEventStatusInfo(event);
            const collegeName = event.college || event.club?.college || 'DKTE Society\'s TEI';

            return (
              <Link key={event.id} href={`/dashboard/student/events/${event.id}`} className="block group h-full">
                <Card className={cn(
                  "h-full rounded-3xl border bg-white shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group cursor-pointer overflow-hidden",
                  statusInfo.isLive ? "border-slate-200" : "border-slate-200 opacity-90"
                )}>
                  {/* IMAGE SECTION */}
                  <div className="relative h-[200px] sm:h-[240px] w-full bg-slate-100 shrink-0 overflow-hidden">
                    <img
                      src={event.image_url || '/placeholder.svg'}
                      alt={event.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    
                    {/* Time Left Badge */}
                    <div className={cn(
                      "absolute top-4 left-4 px-3 py-1.5 rounded-full text-[11px] font-extrabold shadow-sm flex items-center gap-2 z-10 backdrop-blur-md",
                      statusInfo.isLive 
                        ? "bg-rose-500 text-white" 
                        : "bg-slate-900/90 text-slate-100"
                    )}>
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        statusInfo.isLive ? "bg-white animate-pulse" : "bg-slate-400"
                      )} />
                      {statusInfo.daysLeftText}
                    </div>

                    {/* Bookmark Button */}
                    <button className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-md text-white hover:bg-black/70 transition-colors z-10 hover:scale-105 active:scale-95">
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>

                  {/* AVATAR OVERLAY */}
                  <div className="px-6 relative h-0">
                    <div className="absolute -top-10 left-6 w-[80px] h-[80px] bg-white border-4 border-white rounded-2xl flex items-center justify-center shadow-md overflow-hidden z-20">
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
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        {event.mode || 'Offline'}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="mt-4 text-[13px] text-slate-600 font-medium leading-relaxed line-clamp-2">
                      {event.description || 'An exciting strategy and problem-solving competition where teams navigate challenges, make smart decisions and uncover the path to victory.'}
                    </p>

                    <div className="mt-auto pt-6">
                      {/* Stats Box */}
                      <div className="border border-slate-100 rounded-2xl p-3 flex items-center justify-between shadow-sm bg-slate-50/50">
                        
                        {/* Prize Pool */}
                        <div className="flex items-center gap-2.5 w-1/3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
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

                        {/* Date */}
                        <div className="flex items-center gap-2.5 w-1/3 justify-center">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
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

                        {/* Entry Fee */}
                        <div className="flex items-center gap-2.5 w-1/3 justify-end pr-1">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
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

                      {/* Button */}
                      <div className="mt-4 w-full bg-slate-900 hover:bg-indigo-600 text-white text-sm font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                        View Details <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>

                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ================= LIST VIEW ================= */
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const eventDate = new Date(event.start_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const attendees = eventAttendees[event.id] || { users: [], totalCount: 0 };
            const statusInfo = getEventStatusInfo(event);
            const collegeName = event.college || event.club?.college || 'DKTE Society\'s TEI';

            return (
              <Link key={event.id} href={`/dashboard/student/events/${event.id}`} className="block group">
                <Card className={cn(
                  "rounded-2xl border bg-white transition-all duration-200 p-4 sm:p-5",
                  statusInfo.isLive ? "border-slate-200 hover:border-indigo-300" : "border-slate-200 opacity-85"
                )}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Image Thumbnail */}
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
                        <img
                          src={event.image_url || '/placeholder.svg'}
                          alt={event.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Live / Days left badge */}
                          <Badge
                            className={cn(
                              'text-[10px] font-bold h-5.5 px-2 rounded-md leading-none inline-flex items-center',
                              !statusInfo.isLive
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : statusInfo.urgency === 'critical'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : statusInfo.urgency === 'urgent'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            )}
                          >
                            {statusInfo.daysLeftText}
                          </Badge>

                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold capitalize h-5.5 px-2 rounded-md leading-none inline-flex items-center">
                            {event.mode || 'offline'}
                          </Badge>

                          {/* Aligned Fee & Prize badges */}
                          {event.entry_fee === 0 ? (
                            <span className="inline-flex items-center justify-center h-5.5 px-2 rounded-md text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 leading-none">
                              Free
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center h-5.5 px-2 rounded-md text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-200/80 leading-none">
                              ₹{event.entry_fee}
                            </span>
                          )}

                          {event.prize_pool && Number(event.prize_pool) > 0 && (
                            <span className="inline-flex items-center justify-center gap-1 h-5.5 px-2 rounded-md text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 leading-none">
                              <Trophy className="h-3 w-3 text-amber-600" />
                              <span>₹{Number(event.prize_pool).toLocaleString()}</span>
                            </span>
                          )}

                          {event.club && (
                            <span className="text-xs text-slate-500 font-medium truncate">• {event.club.name}</span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors truncate">
                          {event.title}
                        </h3>

                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {eventDate}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {event.venue || (event as any).location || 'Campus Auditorium'}
                          </span>
                          <span className="flex items-center gap-1 text-indigo-600 font-semibold truncate">
                            <GraduationCap className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            {collegeName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Attendees & Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Attendees */}
                      <div className="flex items-center gap-2">
                        {attendees.users.length > 0 && (
                          <div className="flex -space-x-1 overflow-hidden shrink-0">
                            {attendees.users.map((student, idx) => (
                              <div
                                key={student.id || idx}
                                title={student.name}
                                className={cn(
                                  'inline-flex h-6 w-6 rounded-full ring-2 ring-white items-center justify-center text-[9px] font-bold text-white shadow-xs select-none shrink-0',
                                  avatarColors[idx % avatarColors.length]
                                )}
                              >
                                {student.initials}
                              </div>
                            ))}
                          </div>
                        )}
                        <span className="text-xs font-semibold text-slate-600">
                          {attendees.totalCount} joined
                        </span>
                      </div>

                      <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs h-9 px-4 shadow-xs">
                        {statusInfo.isLive ? 'View & Register' : 'View Archive'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}


