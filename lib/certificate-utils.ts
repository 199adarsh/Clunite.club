import { generateDefaultCertificateSVG } from '@/components/certificates/default-template';
import { supabase } from '@/lib/supabase';

/**
 * Binary magic-byte header checks to validate uploaded template files.
 */
export async function validateImageFile(file: File): Promise<{ valid: boolean; error?: string; format?: string }> {
  // 1. Size check (10MB limit)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File size exceeds maximum 10MB limit.' };
  }

  // 2. Binary Magic-Byte check
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { valid: true, format: 'PNG' };
    }
    // JPEG/JPG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { valid: true, format: 'JPEG' };
    }
    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return { valid: true, format: 'GIF' };
    }
    // BMP: 42 4D ('BM')
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
      return { valid: true, format: 'BMP' };
    }
    // WebP: 52 49 46 46 ... 57 45 42 50 ('RIFF'...'WEBP')
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      return { valid: true, format: 'WebP' };
    }

    // SVG check (starts with <?xml or <svg)
    const textSample = await file.slice(0, 100).text();
    if (textSample.includes('<svg') || textSample.includes('<?xml')) {
      return { valid: true, format: 'SVG' };
    }

    return { valid: false, error: 'Unsupported or corrupted image format. Please upload JPG, PNG, GIF, BMP, or WebP.' };
  } catch (err) {
    return { valid: false, error: 'Failed to inspect file headers.' };
  }
}

export interface CSVRecipient {
  id: string;
  name: string;
  email: string;
  role?: string;
}

/**
 * Clean parser for recipient CSVs with up to 500 records.
 */
export function parseRecipientsCSV(csvContent: string): { recipients: CSVRecipient[]; errors: string[] } {
  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { recipients: [], errors: ['CSV file is empty.'] };
  }

  const recipients: CSVRecipient[] = [];
  const errors: string[] = [];

  // Inspect Header
  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('student') || h.includes('recipient'));
  const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
  const roleIdx = headers.findIndex(h => h.includes('role') || h.includes('position') || h.includes('type'));

  const startIndex = (nameIdx !== -1 || emailIdx !== -1) ? 1 : 0;
  const actualNameIdx = nameIdx !== -1 ? nameIdx : 0;
  const actualEmailIdx = emailIdx !== -1 ? emailIdx : 1;

  for (let i = startIndex; i < lines.length; i++) {
    if (recipients.length >= 500) {
      errors.push('Batch limit reached: Maximum 500 recipients per batch.');
      break;
    }

    const row = lines[i];
    // Split by comma ignoring commas inside quotes
    const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(',');
    const cleanCols = cols.map(c => c.trim().replace(/^["']|["']$/g, ''));

    const name = cleanCols[actualNameIdx] || '';
    const email = cleanCols[actualEmailIdx] || '';
    const role = roleIdx !== -1 ? (cleanCols[roleIdx] || 'Participant') : 'Participant';

    if (name) {
      recipients.push({
        id: `rec-${i}-${Date.now().toString(36)}`,
        name,
        email: email || `${name.toLowerCase().replace(/\s+/g, '')}@student.edu`,
        role,
      });
    }
  }

  if (recipients.length === 0) {
    errors.push('No valid recipient names found in CSV.');
  }

  return { recipients, errors };
}

/**
 * Generates unique verifiable certificate code (e.g. CLU-2026-X7K89)
 */
export function generateCertificateCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CLU-2026-${code}`;
}

/**
 * Downloads a sample template CSV
 */
export function downloadSampleCSV() {
  const sample = `Name,Email,Role
Aditya Deshmukh,aditya.deshmukh@gmail.com,Winner
Sneha Patil,sneha.patil@outlook.com,Participant
Rohan Kulkarni,rohan.kulkarni@yahoo.com,Participant
Pooja Sharma,pooja.sharma@college.edu,Participant
Vikram Singh,vikram.singh@campus.in,Runner Up`;

  const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'sample_recipients.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a certificate file (PNG or SVG) in print-ready 1920x1080 resolution
 */
export async function downloadCertificateFile(
  cert: {
    certificate_code: string;
    recipient_name: string;
    event_title: string;
    club_name: string;
    template_url?: string;
    template_config?: any;
    issued_at?: string;
  },
  studentCollege?: string,
  format: 'png' | 'svg' = 'png'
): Promise<void> {
  const isDefault = cert.template_url === 'default' || !cert.template_url;

  const svgDataUrl = generateDefaultCertificateSVG(
    cert.club_name,
    cert.event_title,
    cert.template_config?.role || 'Participant',
    {
      recipientName: cert.recipient_name,
      studentCollege: cert.template_config?.studentCollege || studentCollege || "DKTE's Textile and Engineering Institute, Ichalkaranji",
      teamName: cert.template_config?.teamName,
      isTeam: cert.template_config?.isTeam || !!cert.template_config?.teamName,
      hostCollege: cert.club_name || "DKTE Society's Textile & Engineering Institute",
      certCode: cert.certificate_code,
      issueDate: cert.issued_at
        ? new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : undefined,
    }
  );

  const finalTemplateUrl = isDefault ? svgDataUrl : cert.template_url!;

  if (format === 'svg' && finalTemplateUrl.startsWith('data:image/svg+xml')) {
    const rawSvg = decodeURIComponent(finalTemplateUrl.replace('data:image/svg+xml;charset=utf-8,', ''));
    const blob = new Blob([rawSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Certificate_${cert.event_title.replace(/\s+/g, '_')}_${cert.certificate_code}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // Draw to 1920x1080 canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const img = new Image();
  if (!finalTemplateUrl.startsWith('data:')) {
    img.crossOrigin = 'anonymous';
  }

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load certificate template image'));
    img.src = finalTemplateUrl;
  });

  ctx.drawImage(img, 0, 0, 1920, 1080);

  // If custom template, overlay configured custom text
  if (!isDefault && cert.template_config) {
    const cfg = cert.template_config;
    if (cert.recipient_name) {
      ctx.save();
      const fontStyle = cfg.italic ? 'italic ' : '';
      const fontWeight = cfg.bold ? 'bold ' : 'normal ';
      const fontFam = cfg.fontFamily || "'Cinzel', serif";
      const pixelSize = Math.round((cfg.fontSize || 48) * 1.6);
      ctx.font = `${fontStyle}${fontWeight}${pixelSize}px ${fontFam}`;
      ctx.fillStyle = cfg.color || '#0f172a';
      ctx.textAlign = cfg.align || 'center';
      ctx.textBaseline = 'middle';
      const nameX = ((cfg.xPercent || 50) / 100) * 1920;
      const nameY = ((cfg.yPercent || 43) / 100) * 1080;
      const textToDraw = cfg.uppercase !== false ? cert.recipient_name.toUpperCase() : cert.recipient_name;
      ctx.fillText(textToDraw, nameX, nameY);
      ctx.restore();
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
  if (!blob) throw new Error('Failed to create PNG blob');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Certificate_${cert.event_title.replace(/\s+/g, '_')}_${cert.certificate_code}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface UserCertificateItem {
  id: string;
  certificate_code: string;
  recipient_name: string;
  issued_at: string;
  event_title: string;
  club_name: string;
  template_url?: string;
  template_config?: any;
}

export async function fetchUserCertificates(authUser: { id: string; email?: string | null; user_metadata?: any }): Promise<UserCertificateItem[]> {
  if (!authUser?.id) return [];

  const certList: UserCertificateItem[] = [];
  const currentEmail = authUser.email?.toLowerCase();
  const currentUserId = authUser.id;

  // 1. Fetch explicitly issued certificates from Supabase table
  try {
    const { data: explicitCerts } = await (supabase as any)
      .from('issued_certificates')
      .select('*, event:events(title), club:clubs(name)')
      .or(`user_id.eq.${currentUserId}${currentEmail ? `,recipient_email.eq.${currentEmail}` : ''}`)
      .order('issued_at', { ascending: false });

    if (explicitCerts && explicitCerts.length > 0) {
      explicitCerts.forEach((c: any) => {
        certList.push({
          id: c.id,
          certificate_code: c.certificate_code,
          recipient_name: c.recipient_name,
          issued_at: c.issued_at,
          event_title: c.event?.title || c.event_title || 'Campus Event',
          club_name: c.club?.name || c.club_name || 'Campus Organization',
          template_url: c.template_url,
          template_config: c.template_config,
        });
      });
    }
  } catch (dbErr) {
    console.warn('Supabase certificates fetch error:', dbErr);
  }

  // 2. Fetch from Local Storage sync layer (strictly matching current user)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const localRaw = localStorage.getItem('clunite_issued_certificates');
      if (localRaw) {
        const localList = JSON.parse(localRaw);
        localList.forEach((c: any) => {
          const matchesEmail = currentEmail && c.recipient_email && c.recipient_email.toLowerCase() === currentEmail;
          const matchesUser = c.user_id && c.user_id === currentUserId;
          const matchesAny = matchesEmail || matchesUser;

          const alreadyExists = certList.some(
            (item) => item.certificate_code === c.certificate_code || item.id === c.id
          );

          if (matchesAny && !alreadyExists) {
            certList.push({
              id: c.id,
              certificate_code: c.certificate_code,
              recipient_name: c.recipient_name,
              issued_at: c.issued_at,
              event_title: c.event_title || 'Campus Event',
              club_name: c.club_name || 'Campus Club',
              template_url: c.template_url,
              template_config: c.template_config,
            });
          }
        });
      }
    }
  } catch (localErr) {
    console.warn('Local storage fetch error:', localErr);
  }

  // 3. Check attended events with certificates_enabled (deduplicating against event title & id)
  try {
    const { data: attendedRegs } = await supabase
      .from('event_registrations')
      .select('id, registered_at, created_at, event:events(id, title, contact_info, club:clubs(name))')
      .eq('user_id', currentUserId)
      .eq('status', 'attended');

    if (attendedRegs) {
      attendedRegs.forEach((r: any) => {
        const isCertEnabled = r.event?.contact_info?.certificates_enabled;
        const alreadyExists = certList.some(
          (c) => c.event_title?.toLowerCase() === r.event?.title?.toLowerCase() || c.id === r.id
        );

        if (isCertEnabled && !alreadyExists && r.event?.title) {
          certList.push({
            id: r.id,
            certificate_code: `CLU-${r.id.substring(0, 8).toUpperCase()}`,
            recipient_name: authUser.user_metadata?.full_name || currentEmail?.split('@')[0] || 'Student',
            issued_at: r.registered_at || r.created_at || new Date().toISOString(),
            event_title: r.event?.title || 'Campus Event',
            club_name: r.event?.club?.name || 'Campus Club',
          });
        }
      });
    }
  } catch (regErr) {
    console.warn('Registrations fetch error:', regErr);
  }

  return certList;
}

