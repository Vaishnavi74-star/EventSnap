import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import {
  generateQRCodeDataUrl,
  generateQRCodeSvg,
  downloadQRCode,
  downloadQRCodeSvg,
  printEventTableCard,
} from '@/utils/qrcode';
import { useToast } from '@/context/ToastContext';
import {
  Copy,
  Download,
  Printer,
  Check,
  ExternalLink,
  Smartphone,
  Info,
  Layers,
  Settings2,
} from 'lucide-react';
import { EventItem } from '@/types';

interface QRCodeModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeModal({ event, isOpen, onClose }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [customHost, setCustomHost] = useState('');
  const [showHostConfig, setShowHostConfig] = useState(false);
  const { success, error } = useToast();

  // Resolved public attendee URL: defaults to window.location.origin/events/{eventId}
  const defaultBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://eventsnap.io';
  const activeBaseUrl = customHost.trim() ? customHost.trim().replace(/\/+$/, '') : defaultBaseUrl;
  const publicUrl = event ? `${activeBaseUrl}/events/${event.eventId}` : '';

  useEffect(() => {
    if (event && isOpen && publicUrl) {
      // Generate both high-resolution PNG data URL and vector SVG
      generateQRCodeDataUrl(publicUrl, { width: 1024, margin: 2 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => error('QR Error', err.message));

      generateQRCodeSvg(publicUrl, { margin: 2 })
        .then((svg) => setQrSvg(svg))
        .catch(console.error);
    }
  }, [event, isOpen, publicUrl]);

  if (!event) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      success('Link Copied!', 'Event URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      error('Copy Failed', 'Please manually copy the URL');
    }
  };

  const handleDownloadPng = () => {
    if (qrDataUrl) {
      downloadQRCode(qrDataUrl, event.name);
      success('PNG Downloaded', '1024x1024 high-resolution image saved');
    }
  };

  const handleDownloadSvg = () => {
    if (qrSvg) {
      downloadQRCodeSvg(qrSvg, event.name);
      success('SVG Downloaded', 'Vector graphic ready for high-precision printing');
    }
  };

  const handlePrint = () => {
    if (qrDataUrl) {
      printEventTableCard(event, qrDataUrl);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Stage QR Code & Attendee Ingestion"
      description="Project this QR code on keynote projector screens or print on attendee badges. Attendees scan with mobile cameras to snap and send photos directly to AWS S3."
      className="max-w-lg text-center"
    >
      <div className="flex flex-col items-center pt-1">
        {/* Event Name & Id Banner */}
        <div className="mb-3 text-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-[11px] font-bold mb-1">
            <span>Tech Summit Organizer Console</span>
          </div>
          <h4 className="text-base font-extrabold text-slate-900 tracking-tight">{event.name}</h4>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
            Immutable Event ID: {event.eventId}
          </span>
        </div>

        {/* QR Code Container */}
        <div className="relative p-4 rounded-2xl bg-white border border-slate-200/90 shadow-md mb-4 flex items-center justify-center group">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code for ${event.name}`}
              className="w-60 h-60 rounded-xl object-contain"
            />
          ) : (
            <div className="w-60 h-60 flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
              Rendering QR Code...
            </div>
          )}
        </div>

        {/* Event Link Input & Copy */}
        <div className="w-full mb-4">
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-left">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="w-full bg-transparent px-2.5 text-xs text-slate-700 outline-none truncate font-mono"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="shrink-0 h-8 px-3 text-xs gap-1.5 bg-white shadow-xs font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
          </div>
        </div>

        {/* Mobile Testing & Custom Host Accordion */}
        <div className="w-full mb-5 text-left">
          <button
            type="button"
            onClick={() => setShowHostConfig(!showHostConfig)}
            className="flex items-center justify-between w-full text-xs font-semibold text-brand-700 hover:text-brand-800 p-2 rounded-lg bg-brand-50/60 border border-brand-100/80 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              Testing on a phone via local Wi-Fi?
            </span>
            <span className="text-[11px] underline">
              {showHostConfig ? 'Hide' : 'Configure IP'}
            </span>
          </button>

          {showHostConfig && (
            <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 animate-fade-in">
              <p className="text-slate-600 text-[11px] leading-relaxed">
                If your phone is on the same Wi-Fi network, replace <code>localhost</code> with your computer's local IP (e.g. <code>http://192.168.1.15:5173</code>) so your phone can reach it:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. http://192.168.1.15:5173"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                />
                {customHost && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCustomHost('')}
                    className="text-xs h-7 px-2"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
          <Button variant="outline" size="sm" onClick={handleDownloadPng} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5 text-brand-600" />
            PNG (High-Res)
          </Button>

          <Button variant="outline" size="sm" onClick={handleDownloadSvg} className="gap-1.5 text-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            SVG (Vector)
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5 text-slate-700" />
            Print Card
          </Button>

          <a href={publicUrl} target="_blank" rel="noreferrer" className="w-full">
            <Button variant="subtle" size="sm" className="w-full gap-1.5 text-xs">
              <ExternalLink className="w-3.5 h-3.5" />
              Open Page
            </Button>
          </a>
        </div>

        {/* Persistence Notice */}
        <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2 text-left text-[11px] text-slate-500">
          <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          <span>
            <strong>Permanently Valid:</strong> This QR code points directly to <code>/events/{event.eventId}</code>. Even if you edit the event title, venue, or date, this QR code will continue to work seamlessly.
          </span>
        </div>
      </div>
    </Dialog>
  );
}
