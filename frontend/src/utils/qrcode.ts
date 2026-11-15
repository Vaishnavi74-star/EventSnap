import QRCode from 'qrcode';
import { EventItem } from '@/types';
import { formatDate } from '@/lib/utils';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generates high-resolution raster QR code as Data URL (PNG).
 */
export async function generateQRCodeDataUrl(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const {
    width = 1024,
    margin = 2,
    darkColor = '#0f172a',
    lightColor = '#ffffff',
    errorCorrectionLevel = 'H',
  } = options;

  try {
    return await QRCode.toDataURL(text, {
      width,
      margin,
      color: {
        dark: darkColor,
        light: lightColor,
      },
      errorCorrectionLevel,
    });
  } catch (err) {
    console.error('Failed to generate PNG QR code:', err);
    throw err;
  }
}

/**
 * Generates vector SVG QR code string.
 */
export async function generateQRCodeSvg(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const {
    margin = 2,
    darkColor = '#0f172a',
    lightColor = '#ffffff',
    errorCorrectionLevel = 'H',
  } = options;

  try {
    return await QRCode.toString(text, {
      type: 'svg',
      margin,
      color: {
        dark: darkColor,
        light: lightColor,
      },
      errorCorrectionLevel,
    });
  } catch (err) {
    console.error('Failed to generate SVG QR code:', err);
    throw err;
  }
}

/**
 * Downloads PNG file to attendee or organizer machine.
 */
export function downloadQRCode(dataUrl: string, fileName: string): void {
  const safeName = fileName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${safeName}_qr.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads vector SVG file for crisp printing.
 */
export function downloadQRCodeSvg(svgContent: string, fileName: string): void {
  const safeName = fileName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}_qr.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens a print dialog with a venue table card layout.
 */
export function printEventTableCard(event: EventItem, qrDataUrl: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const dateStr = formatDate(event.date);
  const venueStr = event.location || 'Venue Reception';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${event.name} — QR Photo Sharing Card</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          
          * { box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: #ffffff;
            color: #0f172a;
            margin: 0;
            padding: 32px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }

          .card {
            width: 100%;
            max-width: 480px;
            border: 2px solid #e2e8f0;
            border-radius: 24px;
            padding: 36px 32px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            background: #ffffff;
          }

          .badge {
            display: inline-block;
            background: #eef2ff;
            color: #4338ca;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 4px 14px;
            border-radius: 9999px;
            margin-bottom: 16px;
          }

          h1 {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin: 0 0 8px 0;
            color: #0f172a;
            line-height: 1.2;
          }

          .meta {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 24px;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .qr-wrapper {
            background: #ffffff;
            border: 2px solid #f1f5f9;
            border-radius: 20px;
            padding: 16px;
            display: inline-block;
            margin-bottom: 20px;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
          }

          .qr-wrapper img {
            width: 240px;
            height: 240px;
            display: block;
            border-radius: 8px;
          }

          .instructions {
            background: #f8fafc;
            border-radius: 16px;
            padding: 16px 20px;
            margin-bottom: 20px;
            border: 1px solid #e2e8f0;
          }

          .instructions h3 {
            margin: 0 0 6px 0;
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
          }

          .instructions p {
            margin: 0;
            font-size: 12px;
            color: #475569;
            line-height: 1.4;
          }

          .watermark {
            font-size: 11px;
            color: #94a3b8;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }

          @media print {
            body { padding: 0; }
            .card { border: none; box-shadow: none; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Live Photo Sharing</div>
          <h1>${event.name}</h1>
          <div class="meta">
            <span>📅 ${dateStr}</span>
            <span>📍 ${venueStr}</span>
          </div>

          <div class="qr-wrapper">
            <img src="${qrDataUrl}" alt="${event.name} QR Code" />
          </div>

          <div class="instructions">
            <h3>📷 How to Share Your Photos:</h3>
            <p>1. Open your phone camera app<br/>2. Point camera at this QR code<br/>3. Tap the link to upload and view memories!<br/><strong>No download or account required</strong></p>
          </div>

          <div class="watermark">
            <span>⚡ Powered by EventSnap</span>
          </div>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}
