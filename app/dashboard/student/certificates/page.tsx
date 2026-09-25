'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { getUserFromDatabase } from '@/lib/sync-user';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Award,
  Download,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Building2,
  Copy,
  Sparkles,
  ShieldCheck,
  Search,
  Loader2,
  FileCode,
} from 'lucide-react';
import { CertificateCanvas, CertificateCanvasRef } from '@/components/certificates/certificate-canvas';
import { generateDefaultCertificateSVG } from '@/components/certificates/default-template';
import { downloadCertificateFile, fetchUserCertificates, type UserCertificateItem } from '@/lib/certificate-utils';
import { toast } from 'sonner';

type StudentCertificate = UserCertificateItem;

export default function StudentCertificatesPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [studentCollege, setStudentCollege] = useState<string>('');
  const [selectedCert, setSelectedCert] = useState<StudentCertificate | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const modalCanvasRef = useRef<CertificateCanvasRef>(null);

  useEffect(() => {
    if (!authLoading) {
      fetchStudentCertificates();
    }
  }, [authUser, authLoading]);

  const fetchStudentCertificates = async () => {
    if (!authUser) {
      setCertificates([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // Fetch db user profile for accurate college name
      const dbUser = await getUserFromDatabase(authUser.id);
      if (dbUser?.college) {
        setStudentCollege(dbUser.college);
      }

      const certList = await fetchUserCertificates(authUser);
      setCertificates(certList);
    } catch (err) {
      console.error('Error fetching student certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Certificate code copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownload = async (cert: StudentCertificate, format: 'png' | 'svg' = 'png') => {
    try {
      setDownloadingId(cert.id);
      toast.info(`Generating high-resolution ${format.toUpperCase()} certificate...`);
      await downloadCertificateFile(
        cert,
        (cert as any).template_config?.studentCollege || studentCollege || (authUser as any)?.user_metadata?.college,
        format
      );
      toast.success('Certificate downloaded successfully!');
    } catch (err: any) {
      console.error('Error downloading certificate:', err);
      toast.error(err?.message || 'Failed to download certificate. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredCerts = certificates.filter(
    (c) =>
      c.event_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.club_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certificate_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Card */}
        <div className="relative rounded-2xl bg-white p-6 sm:p-8 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-200/60 via-purple-100/30 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Award className="h-3 w-3" /> Digital Credentials
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Certificates & Credentials
            </h1>
            <p className="text-slate-500 font-medium text-xs sm:text-sm">
              Verified digital credentials earned from campus events, hackathons, and workshops.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>{certificates.length} Verified Credentials</span>
            </Badge>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by event, club, or certificate ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-black/5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
            />
          </div>
        </div>

        {/* Certificates Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-white/60 rounded-3xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : filteredCerts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-black/5 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <Award className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-800">No Certificates Earned Yet</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                Participate in campus events, competitions, and workshops to earn verified digital credentials for your resume.
              </p>
            </div>
            <Link href="/dashboard/student/browse">
              <Button className="rounded-full bg-slate-950 hover:bg-slate-800 text-white font-bold px-6">
                Browse Upcoming Events
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCerts.map((cert) => {
              const defaultSvg = generateDefaultCertificateSVG(
                cert.club_name,
                cert.event_title,
                cert.template_config?.role || 'Participant',
                {
                  recipientName: cert.recipient_name,
                  studentCollege: (cert as any).template_config?.studentCollege || (cert as any).student_college || studentCollege || (authUser as any)?.user_metadata?.college || "DKTE's Textile and Engineering Institute, Ichalkaranji",
                  teamName: (cert as any).template_config?.teamName || (cert as any).team_name,
                  isTeam: (cert as any).template_config?.isTeam || !!(cert as any).template_config?.teamName || !!(cert as any).team_name,
                  hostCollege: cert.club_name || "DKTE Society's Textile & Engineering Institute",
                  certCode: cert.certificate_code,
                  issueDate: cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined,
                }
              );
              const bgUrl = cert.template_url === 'default' || !cert.template_url ? defaultSvg : cert.template_url;

              return (
                <Card
                  key={cert.id}
                  className="bg-white rounded-3xl border border-black/5 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between group"
                >
                  {/* Certificate Preview Thumbnail */}
                  <div
                    className="relative aspect-[16/9] bg-slate-100 overflow-hidden cursor-pointer"
                    onClick={() => {
                      setSelectedCert(cert);
                      setPreviewOpen(true);
                    }}
                  >
                    <img src={bgUrl} alt={cert.event_title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                      <Button size="sm" className="rounded-full bg-white text-slate-900 font-bold shadow-sm text-xs">
                        Inspect Certificate
                      </Button>
                    </div>

                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-slate-800 border border-slate-200/60 shadow-sm flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>{cert.certificate_code}</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 text-lg leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {cert.event_title}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>Issued by {cert.club_name}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(cert.certificate_code)}
                        className="hover:text-slate-700 font-mono flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copiedCode === cert.certificate_code ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-1/2 rounded-full border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setSelectedCert(cert);
                          setPreviewOpen(true);
                        }}
                      >
                        Inspect
                      </Button>

                      <Button
                        size="sm"
                        disabled={downloadingId === cert.id}
                        className="w-1/2 rounded-full bg-slate-950 hover:bg-indigo-600 text-white font-bold text-xs px-4"
                        onClick={() => handleDownload(cert, 'png')}
                      >
                        {downloadingId === cert.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      {/* Full Screen High-Res Modal Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full p-4 sm:p-6 bg-white rounded-3xl border-0 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-extrabold text-slate-900">
                {selectedCert?.event_title}
              </DialogTitle>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-xs">
                {selectedCert?.certificate_code}
              </Badge>
            </div>
            <DialogDescription className="text-slate-500 text-xs">
              Issued to {selectedCert?.recipient_name} by {selectedCert?.club_name}
            </DialogDescription>
          </DialogHeader>

          {selectedCert && (
            <div className="space-y-4">
              <CertificateCanvas
                ref={modalCanvasRef}
                templateUrl={
                  selectedCert.template_url === 'default' || !selectedCert.template_url
                    ? generateDefaultCertificateSVG(
                        selectedCert.club_name,
                        selectedCert.event_title,
                        selectedCert.template_config?.role || 'Participant',
                        {
                          recipientName: selectedCert.recipient_name,
                          studentCollege: (selectedCert as any).template_config?.studentCollege || (selectedCert as any).student_college || studentCollege || (authUser as any)?.user_metadata?.college || "DKTE's Textile and Engineering Institute, Ichalkaranji",
                          teamName: (selectedCert as any).template_config?.teamName || (selectedCert as any).team_name,
                          isTeam: (selectedCert as any).template_config?.isTeam || !!(selectedCert as any).template_config?.teamName || !!(selectedCert as any).team_name,
                          hostCollege: selectedCert.club_name || "DKTE Society's Textile & Engineering Institute",
                          certCode: selectedCert.certificate_code,
                          issueDate: selectedCert.issued_at ? new Date(selectedCert.issued_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined,
                        }
                      )
                    : selectedCert.template_url
                }
                config={{
                  recipientName: selectedCert.recipient_name,
                  fontFamily: selectedCert.template_config?.fontFamily || "'Cinzel', serif",
                  fontSize: selectedCert.template_config?.fontSize || 42,
                  color: selectedCert.template_config?.color || '#0f172a',
                  bold: selectedCert.template_config?.bold ?? true,
                  italic: selectedCert.template_config?.italic || false,
                  align: selectedCert.template_config?.align || 'center',
                  xPercent: selectedCert.template_config?.xPercent || 50.0,
                  yPercent: selectedCert.template_config?.yPercent || 43.0,
                  letterSpacing: selectedCert.template_config?.letterSpacing || 2,
                  uppercase: selectedCert.template_config?.uppercase ?? true,
                  showDate: false,
                  dateText: new Date(selectedCert.issued_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  }),
                  dateXPercent: selectedCert.template_config?.dateXPercent || 50.0,
                  dateYPercent: selectedCert.template_config?.dateYPercent || 67.0,
                  dateFontSize: selectedCert.template_config?.dateFontSize || 16,
                  dateColor: selectedCert.template_config?.dateColor || '#475569',
                  showCertCode: false,
                  certCodeText: selectedCert.certificate_code,
                  certCodeXPercent: selectedCert.template_config?.certCodeXPercent || 50.0,
                  certCodeYPercent: selectedCert.template_config?.certCodeYPercent || 94.5,
                  certCodeFontSize: selectedCert.template_config?.certCodeFontSize || 12,
                  certCodeColor: selectedCert.template_config?.certCodeColor || '#94a3b8',
                }}
                showGuides={false}
                readOnly={true}
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-500 font-medium">
                  Verified Clunite Digital Credential • 300 DPI Print Ready
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-slate-200 font-bold text-xs"
                    onClick={() => handleCopyCode(selectedCert.certificate_code)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    {copiedCode === selectedCert.certificate_code ? 'Copied' : 'Copy Code'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={downloadingId === selectedCert.id}
                    className="rounded-full border-slate-200 font-bold text-xs"
                    onClick={() => handleDownload(selectedCert, 'svg')}
                  >
                    <FileCode className="h-3.5 w-3.5 mr-1.5" /> Vector SVG
                  </Button>
                  <Button
                    type="button"
                    disabled={downloadingId === selectedCert.id}
                    className="rounded-full bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs px-6 shadow-sm"
                    onClick={() => handleDownload(selectedCert, 'png')}
                  >
                    {downloadingId === selectedCert.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 mr-1.5" /> Download PNG
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

