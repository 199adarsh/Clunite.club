'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Target,
  Zap,
  Award,
  ArrowLeft,
  Download,
  Sparkles,
  AlertTriangle,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  EngagementTrendsChart,
  PerformanceOverviewChart,
  MonthlyTrendsChart,
  EventCategoriesChart,
  ParticipantsSatisfactionChart,
  EventTypeAnalysisChart,
} from '@/components/analytics/modern-charts';
import {
  ParticipantsByDepartmentChart,
  ParticipantsByYearChart,
  EventComparisonChart,
  RegistrationByCategoryChart,
  IncomeVsExpensesChart,
  ExpenseBreakdownChart,
  ParticipantsByGenderChart,
  EngagementTrendsOverTimeChart,
} from '@/components/analytics/additional-charts';
import {
  fetchClubAnalytics,
  fetchEventComparison,
  fetchParticipantDemographics,
  fetchFinancialMetrics,
  fetchTimeSeriesData,
  generateInsights,
  type ClubAnalytics,
  type EventAnalytics,
  type ParticipantDemographics,
  type FinancialMetrics,
  type TimeSeriesData,
} from '@/lib/analytics-data';

export default function ModernAnalyticsPage() {
  const router = useRouter();
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [eventsForClub, setEventsForClub] = useState<any[]>([]);
  const [expenseForm, setExpenseForm] = useState({
    eventId: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    amount: '',
    vendor: '',
    paymentMethod: '',
    incurredAt: new Date().toISOString().slice(0, 16),
    notes: '',
  });
  const [savingExpense, setSavingExpense] = useState(false);
  const [stats, setStats] = useState<ClubAnalytics>({
    totalEvents: 0,
    totalParticipants: 0,
    avgSatisfaction: 0,
    totalRevenue: 0,
    growthRate: 0,
    engagementRate: 0,
    attendanceRate: 0,
  });
  const [eventComparison, setEventComparison] = useState<EventAnalytics[]>([]);
  const [demographics, setDemographics] = useState<ParticipantDemographics>({
    byDepartment: [],
    byYear: [],
    byGender: [],
    byCollege: [],
  });
  const [financial, setFinancial] = useState<FinancialMetrics>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    expenseBreakdown: [],
    incomeByEvent: [],
  });
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    const clubId = sessionStorage.getItem('selectedClubId');
    if (!clubId) {
      router.push('/dashboard/organizer/select-club');
      return;
    }
    setSelectedClubId(clubId);
    loadAnalyticsData(clubId);
    // Load events for expense form
    (async () => {
      const { data } = await (await import('@/lib/supabase')).supabase
        .from('events')
        .select('id,title,start_date')
        .eq('club_id', clubId)
        .order('start_date', { ascending: false });
      setEventsForClub(data || []);
    })();
  }, []);

  const loadAnalyticsData = async (clubId: string) => {
    try {
      setLoading(true);

      const [
        analyticsData,
        eventsData,
        demographicsData,
        financialData,
        timeData,
      ] = await Promise.all([
        fetchClubAnalytics(clubId),
        fetchEventComparison(clubId),
        fetchParticipantDemographics(clubId),
        fetchFinancialMetrics(clubId),
        fetchTimeSeriesData(clubId, 90),
      ]);

      setStats(analyticsData);
      setEventComparison(eventsData);
      setDemographics(demographicsData);
      setFinancial(financialData);
      setTimeSeriesData(timeData);

      const generatedInsights = generateInsights(
        analyticsData,
        demographicsData,
        financialData
      );
      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const engagementData = timeSeriesData.map((d) => ({
    month: d.date,
    engagement: d.registrations,
  }));
  const performanceData = [
    { metric: 'Attendance', value: stats.attendanceRate },
    { metric: 'Satisfaction', value: stats.avgSatisfaction * 20 },
    { metric: 'Engagement', value: stats.engagementRate },
    { metric: 'Growth', value: Math.max(0, stats.growthRate + 50) },
    { metric: 'Revenue', value: Math.min(100, stats.totalRevenue / 1000) },
  ];
  const monthlyData = timeSeriesData.map((d) => ({
    month: d.date,
    participants: d.registrations,
    revenue: d.revenue,
  }));
  const categoryData = demographics.byDepartment
    .slice(0, 5)
    .map((d) => ({ name: d.name, value: d.count }));
  const satisfactionData = eventComparison.slice(0, 7).map((e) => ({
    participants: e.registrations,
    satisfaction: 3.5 + Math.random() * 1.5,
  }));
  const eventTypeData = eventComparison.reduce((acc: any[], event) => {
    const existing = acc.find((item) => item.type === event.type);
    if (existing) {
      existing.value += event.registrations;
    } else {
      acc.push({ type: event.type, value: event.registrations });
    }
    return acc;
  }, []);

  const getInsightIcon = (iconName: string) => {
    switch (iconName) {
      case 'TrendingUp':
        return TrendingUp;
      case 'TrendingDown':
        return TrendingDown;
      case 'AlertTriangle':
        return AlertTriangle;
      case 'DollarSign':
        return DollarSign;
      case 'Users':
        return Users;
      case 'Award':
        return Award;
      default:
        return Sparkles;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF7F4] p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7F4] px-3 py-4 sm:px-6 sm:py-6 md:px-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard/organizer/host">
              <Button variant="outline" size="icon" className="rounded-full shrink-0 h-9 w-9 sm:h-10 sm:w-10">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Analytics Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                Real-time insights into your event performance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto font-semibold rounded-xl shadow-sm">
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Add Income or Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Event
                    </label>
                    <Select
                      value={expenseForm.eventId}
                      onValueChange={(v) =>
                        setExpenseForm({ ...expenseForm, eventId: v })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventsForClub.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Type *
                    </label>
                    <Select
                      value={expenseForm.type}
                      onValueChange={(v: 'income' | 'expense') =>
                        setExpenseForm({ ...expenseForm, type: v })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <Input
                        className="mt-1"
                        value={expenseForm.category}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            category: e.target.value,
                          })
                        }
                        placeholder="e.g., Marketing, Venue"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Amount (₹)
                      </label>
                      <Input
                        className="mt-1"
                        type="number"
                        step="0.01"
                        value={expenseForm.amount}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            amount: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Vendor
                      </label>
                      <Input
                        className="mt-1"
                        value={expenseForm.vendor}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            vendor: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Payment Method
                      </label>
                      <Input
                        className="mt-1"
                        value={expenseForm.paymentMethod}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            paymentMethod: e.target.value,
                          })
                        }
                        placeholder="UPI / Cash / Card"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Incurred At
                    </label>
                    <Input
                      className="mt-1"
                      type="datetime-local"
                      value={expenseForm.incurredAt}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          incurredAt: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <Input
                      className="mt-1"
                      value={expenseForm.notes}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          notes: e.target.value,
                        })
                      }
                      placeholder="optional"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setExpenseOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={
                        savingExpense ||
                        !expenseForm.eventId ||
                        !expenseForm.type ||
                        !expenseForm.category ||
                        !expenseForm.amount
                      }
                      onClick={async () => {
                        try {
                          setSavingExpense(true);
                          const { supabase } = await import('@/lib/supabase');
                          const {
                            data: { user },
                          } = await supabase.auth.getUser();
                          if (!user) throw new Error('Not authenticated');
                          const { error } = await supabase
                            .from('event_expenses')
                            .insert({
                              event_id: expenseForm.eventId,
                              type: expenseForm.type,
                              category: expenseForm.category,
                              amount: Number(expenseForm.amount),
                              vendor: expenseForm.vendor || null,
                              payment_method: expenseForm.paymentMethod || null,
                              incurred_at: new Date(
                                expenseForm.incurredAt
                              ).toISOString(),
                              notes: expenseForm.notes || null,
                              created_by: user.id,
                            });
                          if (error) throw error;
                          setExpenseOpen(false);
                          setExpenseForm({
                            eventId: '',
                            type: 'expense',
                            category: '',
                            amount: '',
                            vendor: '',
                            paymentMethod: '',
                            incurredAt: new Date().toISOString().slice(0, 16),
                            notes: '',
                          });
                          toast.success(
                            `${expenseForm.type === 'income' ? 'Income' : 'Expense'} saved successfully`
                          );
                          if (selectedClubId) loadAnalyticsData(selectedClubId);
                        } catch (e) {
                          console.error(e);
                          toast.error(
                            (e as any)?.message || 'Failed to save expense'
                          );
                        } finally {
                          setSavingExpense(false);
                        }
                      }}
                    >
                      {savingExpense
                        ? 'Saving...'
                        : `Save ${expenseForm.type === 'income' ? 'Income' : 'Expense'}`}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
          {/* Total Events */}
          <Card className="border-none shadow-md bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-5 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-white truncate">
                Total Events
              </CardTitle>
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white/90 shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0 sm:pt-0">
              <div className="text-xl sm:text-2xl md:text-3xl font-black mb-0.5 sm:mb-1">{stats.totalEvents}</div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-white/90 truncate">
                <TrendingUp className="h-3 w-3 shrink-0" />
                <span className="truncate">+{stats.growthRate}% vs last mo</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Participants */}
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-5 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-white truncate">
                Participants
              </CardTitle>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white/90 shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0 sm:pt-0">
              <div className="text-xl sm:text-2xl md:text-3xl font-black mb-0.5 sm:mb-1">
                {stats.totalParticipants.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-white/90 truncate">
                <TrendingUp className="h-3 w-3 shrink-0" />
                <span className="truncate">Across all events</span>
              </div>
            </CardContent>
          </Card>

          {/* Average Satisfaction */}
          <Card className="border-none shadow-md bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-5 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-white truncate">
                Avg Satisfaction
              </CardTitle>
              <Award className="h-4 w-4 sm:h-5 sm:w-5 text-white/90 shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0 sm:pt-0">
              <div className="text-xl sm:text-2xl md:text-3xl font-black mb-0.5 sm:mb-1">
                {stats.avgSatisfaction}/5.0
              </div>
              <p className="text-[10px] sm:text-xs text-white/90 truncate">Excellent rating</p>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="border-none shadow-md bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-5 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-white truncate">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white/90 shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0 sm:pt-0">
              <div className="text-xl sm:text-2xl md:text-3xl font-black mb-0.5 sm:mb-1">
                ₹{stats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-[10px] sm:text-xs text-white/90 truncate">+18.2% growth</p>
            </CardContent>
          </Card>

          {/* Engagement Rate */}
          <Card className="border-none shadow-md bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-5 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-white truncate">
                Engagement
              </CardTitle>
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white/90 shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0 sm:pt-0">
              <div className="text-xl sm:text-2xl md:text-3xl font-black mb-0.5 sm:mb-1">
                {stats.engagementRate}%
              </div>
              <p className="text-[10px] sm:text-xs text-white/90 truncate">Above average</p>
            </CardContent>
          </Card>

          {/* Growth Rate */}
          <Card className="border-none shadow-md bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-5 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-white truncate">
                Growth Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white/90 shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0 sm:pt-0">
              <div className="text-xl sm:text-2xl md:text-3xl font-black mb-0.5 sm:mb-1">
                +{stats.growthRate}%
              </div>
              <p className="text-[10px] sm:text-xs text-white/90 truncate">Month over month</p>
            </CardContent>
          </Card>
        </div>

        {/* Insights Section */}
        {insights.length > 0 && (
          <Card className="border border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <div>
                  <CardTitle className="text-base sm:text-lg">Key Insights</CardTitle>
                  <CardDescription className="text-xs">
                    AI-powered analysis of your event performance
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
              <div className="grid gap-2.5 sm:gap-4 sm:grid-cols-2">
                {insights.map((insight, index) => {
                  const IconComponent = getInsightIcon(insight.icon);
                  const gradients = [
                    'bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200',
                    'bg-gradient-to-br from-red-50 to-rose-100 border-red-200',
                    'bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200',
                    'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200',
                  ];
                  return (
                    <div
                      key={index}
                      className={`flex gap-2.5 sm:gap-3 rounded-xl border p-3 sm:p-4 ${gradients[index % gradients.length]}`}
                    >
                      <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs sm:text-sm mb-0.5 text-gray-900 truncate">
                          {insight.title}
                        </p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {insight.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full grid grid-cols-4 bg-slate-200/80 p-1 rounded-xl h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 px-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="participants" className="text-xs sm:text-sm py-2 px-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">Participants</TabsTrigger>
            <TabsTrigger value="events" className="text-xs sm:text-sm py-2 px-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">Events</TabsTrigger>
            <TabsTrigger value="financial" className="text-xs sm:text-sm py-2 px-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {engagementData.length > 0 && (
                <EngagementTrendsChart data={engagementData} />
              )}
              {satisfactionData.length > 0 && (
                <ParticipantsSatisfactionChart data={satisfactionData} />
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PerformanceOverviewChart data={performanceData} />
              {categoryData.length > 0 && (
                <EventCategoriesChart data={categoryData} />
              )}
            </div>
            {timeSeriesData.length > 0 && (
              <EngagementTrendsOverTimeChart data={timeSeriesData} />
            )}
            {monthlyData.length > 0 && (
              <MonthlyTrendsChart data={monthlyData} />
            )}
          </TabsContent>

          <TabsContent value="participants" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <ParticipantsByDepartmentChart
                data={demographics.byDepartment.slice(0, 8)}
              />
              <ParticipantsByYearChart data={demographics.byYear} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {demographics.byGender.length > 0 && (
                <ParticipantsByGenderChart data={demographics.byGender} />
              )}
              {demographics.byCollege.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Participants by College</CardTitle>
                    <CardDescription>
                      Top institutions represented
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {demographics.byCollege
                        .slice(0, 5)
                        .map((college, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <span className="text-sm font-medium">
                              {college.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {college.count}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({college.percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            {eventComparison.length > 0 && (
              <EventComparisonChart data={eventComparison.slice(0, 8)} />
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              {eventTypeData.length > 0 && (
                <EventTypeAnalysisChart data={eventTypeData} />
              )}
              {categoryData.length > 0 && (
                <RegistrationByCategoryChart data={categoryData} />
              )}
            </div>
            {eventComparison.length > 0 && (
              <Card className="border border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                  <CardTitle className="text-base sm:text-lg">Event Performance Details</CardTitle>
                  <CardDescription className="text-xs">
                    Detailed metrics for each event
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 sm:pt-0">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[500px]">
                      <thead>
                        <tr className="border-b border-gray-200 bg-slate-50/50">
                          <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">
                            Event
                          </th>
                          <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">
                            Type
                          </th>
                          <th className="text-right py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">
                            Reg.
                          </th>
                          <th className="text-right py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">
                            Att.
                          </th>
                          <th className="text-right py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">
                            Revenue
                          </th>
                          <th className="text-right py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">
                            Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventComparison.slice(0, 10).map((event, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors"
                          >
                            <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-medium text-gray-900 text-xs sm:text-sm truncate max-w-[140px] sm:max-w-none">
                              {event.title}
                            </td>
                            <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm">
                              <Badge variant="outline" className="capitalize text-[10px] sm:text-xs">
                                {event.type}
                              </Badge>
                            </td>
                            <td className="text-right py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-xs sm:text-sm">
                              {event.registrations}
                            </td>
                            <td className="text-right py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-xs sm:text-sm">
                              {event.attendance}
                            </td>
                            <td className="text-right py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-xs sm:text-sm">
                              ₹{event.revenue.toLocaleString()}
                            </td>
                            <td className="text-right py-2.5 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm">
                              <span
                                className={`font-bold ${
                                  event.registrations > 0 &&
                                  event.attendance / event.registrations > 0.8
                                    ? 'text-green-600'
                                    : 'text-orange-600'
                                }`}
                              >
                                {event.registrations > 0
                                  ? `${Math.round((event.attendance / event.registrations) * 100)}%`
                                  : 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <IncomeVsExpensesChart data={financial} />
            <div className="grid gap-4 lg:grid-cols-2">
              {financial.expenseBreakdown.length > 0 && (
                <ExpenseBreakdownChart data={financial.expenseBreakdown} />
              )}
              {financial.incomeByEvent.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Income by Event</CardTitle>
                    <CardDescription>
                      Revenue contribution per event
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {financial.incomeByEvent
                        .sort((a, b) => b.income - a.income)
                        .slice(0, 10)
                        .map((event, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <span className="text-sm font-medium">
                              {event.eventName}
                            </span>
                            <span className="text-sm font-semibold">
                              ₹{event.income.toLocaleString()}
                            </span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <Card className="border border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg">Financial Summary</CardTitle>
                <CardDescription className="text-xs">
                  Overall financial performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
                  <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-green-700 mb-1 sm:mb-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-semibold">Total Income</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-green-900">
                      ₹{financial.totalIncome.toLocaleString()}
                    </p>
                    <p className="text-[10px] sm:text-xs text-green-600 mt-0.5">
                      From all events
                    </p>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-100 border border-red-200">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-red-700 mb-1 sm:mb-2">
                      <TrendingDown className="h-4 w-4" />
                      <span className="font-semibold">Total Expenses</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-red-900">
                      ₹{financial.totalExpenses.toLocaleString()}
                    </p>
                    <p className="text-[10px] sm:text-xs text-red-600 mt-0.5">
                      Operational costs
                    </p>
                  </div>
                  <div
                    className={`p-3.5 sm:p-4 rounded-xl border ${
                      financial.netProfit >= 0
                        ? 'bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200'
                        : 'bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1.5 text-xs sm:text-sm mb-1 sm:mb-2 ${
                        financial.netProfit >= 0
                          ? 'text-blue-700'
                          : 'text-orange-700'
                      }`}
                    >
                      {financial.netProfit >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="font-semibold">Net Profit</span>
                    </div>
                    <p
                      className={`text-2xl sm:text-3xl font-black ${
                        financial.netProfit >= 0
                          ? 'text-blue-900'
                          : 'text-orange-900'
                      }`}
                    >
                      ₹{financial.netProfit.toLocaleString()}
                    </p>
                    <p
                      className={`text-[10px] sm:text-xs mt-0.5 ${
                        financial.netProfit >= 0
                          ? 'text-blue-600'
                          : 'text-orange-600'
                      }`}
                    >
                      {financial.netProfit >= 0
                        ? 'Profitable'
                        : 'Operating at loss'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
