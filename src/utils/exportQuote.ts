import { toJpeg, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export type ExportImageFormat = 'png' | 'jpg';

export interface GallerySaveResult {
  method: 'share_sheet' | 'download' | 'permission_denied';
  dataUrl: string;
  filename: string;
}

async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        });
      }
      // Convert same-origin / relative images to data URLs so SVG foreignObject always renders them
      const src = img.getAttribute('src') || '';
      if (src && !src.startsWith('data:')) {
        try {
          const response = await fetch(src);
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('read failed'));
            reader.readAsDataURL(blob);
          });
          img.src = dataUrl;
        } catch {
          // Keep original src if fetch fails
        }
      }
    })
  );
}

export async function renderNodeToImageDataUrl(
  node: HTMLElement,
  format: ExportImageFormat = 'png'
): Promise<string> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  await waitForImages(node);

  const exportWidth = node.offsetWidth || 800;
  const exportHeight = node.scrollHeight || node.offsetHeight;

  const options = {
    width: exportWidth,
    height: exportHeight,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: false,
    quality: 0.95,
    style: {
      margin: '0',
      transform: 'none',
    },
  };

  try {
    return format === 'jpg'
      ? await toJpeg(node, options)
      : await toPng(node, options);
  } catch {
    return format === 'jpg'
      ? await toJpeg(node, { ...options, skipFonts: true })
      : await toPng(node, { ...options, skipFonts: true });
  }
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPhone|iPad|iPod|Android/i.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Mac/i.test(ua))
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Mac/i.test(ua))
  );
}

function triggerFileDownload(dataUrl: string, fullFilename: string): void {
  const link = document.createElement('a');
  link.download = fullFilename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportQuotationAsImage(
  node: HTMLElement,
  filename: string,
  format: ExportImageFormat = 'png',
  title = 'ใบเสนอราคารถยนต์'
): Promise<GallerySaveResult> {
  const ext = format === 'jpg' ? 'jpg' : 'png';
  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const fullFilename = `${filename}.${ext}`;
  const dataUrl = await renderNodeToImageDataUrl(node, format);

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  // On iPhone/iPad, Web Share API allows tapping "Save Image" directly into Apple Photos
  if (isIosDevice() && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], fullFilename, { type: mime });
      if (nav.canShare({ files: [file] })) {
        await nav.share({
          title,
          files: [file],
        });
        return { method: 'share_sheet', dataUrl, filename: fullFilename };
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      if (
        err instanceof Error &&
        (err.name === 'NotAllowedError' || err.name === 'SecurityError')
      ) {
        return { method: 'permission_denied', dataUrl, filename: fullFilename };
      }
    }
  }

  try {
    triggerFileDownload(dataUrl, fullFilename);
    return { method: 'download', dataUrl, filename: fullFilename };
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'NotAllowedError' || err.name === 'SecurityError')
    ) {
      return { method: 'permission_denied', dataUrl, filename: fullFilename };
    }
    throw err;
  }
}

export async function shareQuotationImage(
  node: HTMLElement,
  filename: string,
  title: string
): Promise<'shared' | 'downloaded' | 'permission_denied'> {
  const dataUrl = await renderNodeToImageDataUrl(node, 'png');
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], `${filename}.png`, { type: 'image/png' });

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  if (
    typeof nav.share === 'function' &&
    typeof nav.canShare === 'function' &&
    nav.canShare({ files: [file] })
  ) {
    try {
      await nav.share({
        title,
        files: [file],
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      if (
        err instanceof Error &&
        (err.name === 'NotAllowedError' || err.name === 'SecurityError')
      ) {
        return 'permission_denied';
      }
    }
  }

  triggerFileDownload(dataUrl, `${filename}.png`);
  return 'downloaded';
}

export async function exportQuotationAsPdf(
  node: HTMLElement,
  filename: string
): Promise<void> {
  const dataUrl = await renderNodeToPngDataUrl(node);

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('ไม่สามารถประมวลผลรูปภาพใบเสนอราคาได้'));
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const imgRatio = img.width / img.height;
  let renderWidth = usableWidth;
  let renderHeight = renderWidth / imgRatio;

  if (renderHeight > usableHeight) {
    renderHeight = usableHeight;
    renderWidth = renderHeight * imgRatio;
  }

  const offsetX = (pageWidth - renderWidth) / 2;
  pdf.addImage(dataUrl, 'PNG', offsetX, margin, renderWidth, renderHeight);
  pdf.save(`${filename}.pdf`);
}

export type FinanceShareResult =
  | 'shared_with_files'
  | 'shared_files_only'
  | 'shared_text_only'
  | 'fallback_required'
  | 'permission_denied';

export async function shareFinanceSubmissionToLine(
  files: File[],
  text: string,
  title = 'ส่งงานไฟแนนซ์'
): Promise<FinanceShareResult> {
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  if (typeof nav.share === 'function') {
    if (files.length > 0 && typeof nav.canShare === 'function') {
      // 1. Try sharing files + text together
      if (nav.canShare({ files, text })) {
        try {
          await nav.share({ title, text, files });
          return 'shared_with_files';
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') throw err;
          if (
            err instanceof Error &&
            (err.name === 'NotAllowedError' || err.name === 'SecurityError')
          ) {
            return 'permission_denied';
          }
        }
      }

      // 2. Fallback: share files via system Share Sheet (text handled by fallback UI / clipboard)
      if (nav.canShare({ files })) {
        try {
          await nav.share({ title, files });
          return 'shared_files_only';
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') throw err;
          if (
            err instanceof Error &&
            (err.name === 'NotAllowedError' || err.name === 'SecurityError')
          ) {
            return 'permission_denied';
          }
        }
      }
    } else if (files.length === 0) {
      try {
        await nav.share({ title, text });
        return 'shared_text_only';
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        if (
          err instanceof Error &&
          (err.name === 'NotAllowedError' || err.name === 'SecurityError')
        ) {
          return 'permission_denied';
        }
      }
    }
  }

  return 'fallback_required';
}

export async function shareFinanceFilesOnly(
  files: File[],
  title = 'รูปภาพใบจอง'
): Promise<'shared' | 'downloaded' | 'permission_denied'> {
  if (files.length === 0) return 'downloaded';

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  if (
    typeof nav.share === 'function' &&
    typeof nav.canShare === 'function' &&
    nav.canShare({ files })
  ) {
    try {
      await nav.share({ title, files });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      if (
        err instanceof Error &&
        (err.name === 'NotAllowedError' || err.name === 'SecurityError')
      ) {
        return 'permission_denied';
      }
    }
  }

  files.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name || `ใบจอง_${idx + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  });

  return 'downloaded';
}

async function renderNodeToPngDataUrl(node: HTMLElement): Promise<string> {
  return renderNodeToImageDataUrl(node, 'png');
}
