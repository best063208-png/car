import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

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

async function renderNodeToPngDataUrl(node: HTMLElement): Promise<string> {
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
    style: {
      margin: '0',
      transform: 'none',
    },
  };

  try {
    return await toPng(node, options);
  } catch {
    return await toPng(node, { ...options, skipFonts: true });
  }
}

export async function exportQuotationAsImage(
  node: HTMLElement,
  filename: string
): Promise<void> {
  const dataUrl = await renderNodeToPngDataUrl(node);
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function shareQuotationImage(
  node: HTMLElement,
  filename: string,
  title: string
): Promise<'shared' | 'downloaded'> {
  const dataUrl = await renderNodeToPngDataUrl(node);
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
    }
  }

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
