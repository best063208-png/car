import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Copy,
  Download,
  Edit3,
  Eye,
  FileImage,
  ImagePlus,
  MessageSquare,
  RefreshCw,
  Send,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import {
  DealerSettings,
  FinanceAttachment,
  QuoteSession,
  QuoteState,
  WizardStep,
} from '../types/dealer';
import {
  FinanceShareResult,
  shareFinanceFilesOnly,
  shareFinanceSubmissionToLine,
} from '../utils/exportQuote';
import {
  buildFinanceSubmissionLineText,
  calculateQuote,
  formatTHB,
  getLineShareUrl,
} from '../utils/finance';

interface FinanceSubmissionViewProps {
  settings: DealerSettings;
  quoteSessions: QuoteSession[];
  activeQuoteId: string;
  attachmentsByQuoteId: Record<string, FinanceAttachment[]>;
  onSelectQuoteSession: (sessionId: string) => void;
  onUpdateQuoteState: (
    sessionId: string,
    updater: (prev: QuoteState) => QuoteState
  ) => void;
  onAddAttachments: (sessionId: string, files: File[]) => void;
  onReplaceAttachment: (
    sessionId: string,
    attachmentId: string,
    file: File
  ) => void;
  onRemoveAttachment: (sessionId: string, attachmentId: string) => void;
  onClearAttachments: (sessionId: string) => void;
  onJumpToCalculatorStep: (
    sessionId: string,
    step: Exclude<WizardStep, 'preview'>
  ) => void;
  onNotify: (message: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FinanceSubmissionView: React.FC<FinanceSubmissionViewProps> = ({
  settings,
  quoteSessions,
  activeQuoteId,
  attachmentsByQuoteId,
  onSelectQuoteSession,
  onUpdateQuoteState,
  onAddAttachments,
  onReplaceAttachment,
  onRemoveAttachment,
  onClearAttachments,
  onJumpToCalculatorStep,
  onNotify,
}) => {
  const sortedSessions = useMemo(() => {
    return [...quoteSessions].sort((a, b) => {
      const timeA = Math.max(
        Date.parse(a.updatedAt || '') || 0,
        Date.parse(a.createdAt || '') || 0
      );
      const timeB = Math.max(
        Date.parse(b.updatedAt || '') || 0,
        Date.parse(b.createdAt || '') || 0
      );
      return timeB - timeA;
    });
  }, [quoteSessions]);

  const selectedSession = useMemo(() => {
    return (
      quoteSessions.find((q) => q.id === activeQuoteId) ||
      sortedSessions[0] ||
      quoteSessions[0]
    );
  }, [quoteSessions, sortedSessions, activeQuoteId]);

  const calc = useMemo(
    () => calculateQuote(settings, selectedSession.state),
    [settings, selectedSession.state]
  );

  const financeLineText = useMemo(
    () => buildFinanceSubmissionLineText(selectedSession.state, calc),
    [selectedSession.state, calc]
  );

  const lineTextOnlyUrl = useMemo(
    () => getLineShareUrl(financeLineText),
    [financeLineText]
  );

  const attachments = attachmentsByQuoteId[selectedSession.id] || [];

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const [replacingAttachmentId, setReplacingAttachmentId] = useState<
    string | null
  >(null);
  const [previewLightbox, setPreviewLightbox] =
    useState<FinanceAttachment | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedJustNow, setCopiedJustNow] = useState(false);
  const [sendMode, setSendMode] = useState<
    'together' | 'image_first' | 'text_first'
  >('together');
  const [stepProgress, setStepProgress] = useState<{
    sessionId: string;
    imagesSent: boolean;
    textSent: boolean;
  }>({
    sessionId: selectedSession.id,
    imagesSent: false,
    textSent: false,
  });
  const [shareFallbackModal, setShareFallbackModal] = useState<{
    mode: FinanceShareResult;
  } | null>(null);

  const imagesSent =
    stepProgress.sessionId === selectedSession.id && stepProgress.imagesSent;
  const textSent =
    stepProgress.sessionId === selectedSession.id && stepProgress.textSent;

  const markImagesSent = () =>
    setStepProgress((prev) => ({
      sessionId: selectedSession.id,
      imagesSent: true,
      textSent: prev.sessionId === selectedSession.id ? prev.textSent : false,
    }));

  const markTextSent = () =>
    setStepProgress((prev) => ({
      sessionId: selectedSession.id,
      imagesSent:
        prev.sessionId === selectedSession.id ? prev.imagesSent : false,
      textSent: true,
    }));

  const updateState = (updater: (prev: QuoteState) => QuoteState) => {
    onUpdateQuoteState(selectedSession.id, updater);
  };

  const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (picked.length > 0) {
      onAddAttachments(selectedSession.id, picked);
      onNotify(`แนบรูปภาพใบจองเพิ่ม ${picked.length} รูปเรียบร้อยแล้ว`);
    }
    e.target.value = '';
  };

  const handleReplacePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && replacingAttachmentId) {
      onReplaceAttachment(selectedSession.id, replacingAttachmentId, file);
      onNotify('เปลี่ยนรูปภาพใบจองเรียบร้อยแล้ว');
    }
    setReplacingAttachmentId(null);
    e.target.value = '';
  };

  const handleCopyFinanceText = async () => {
    try {
      await navigator.clipboard.writeText(financeLineText);
      setCopiedJustNow(true);
      window.setTimeout(() => setCopiedJustNow(false), 2000);
      onNotify('คัดลอกข้อความส่งงานไฟแนนซ์แล้ว');
    } catch {
      onNotify('ไม่สามารถคัดลอกอัตโนมัติได้ กรุณาคัดลอกจากช่องข้อความด้านบน');
    }
  };

  const handleSendToLine = async () => {
    setIsSharing(true);
    try {
      const files = attachments.map((a) => a.file);
      const result = await shareFinanceSubmissionToLine(
        files,
        financeLineText,
        `ส่งงานไฟแนนซ์ ${calc.trim.modelName} ${calc.trim.trimName}`
      );

      if (result === 'shared_with_files') {
        markImagesSent();
        markTextSent();
        onNotify('เปิดหน้าต่างแชร์ข้อความและรูปภาพไปยัง LINE เรียบร้อยแล้ว');
      } else if (result === 'shared_files_only') {
        markImagesSent();
        try {
          await navigator.clipboard.writeText(financeLineText);
        } catch {
          // Ignore clipboard errors gracefully
        }
        setShareFallbackModal({ mode: 'shared_files_only' });
        onNotify('แชร์รูปภาพแล้ว และคัดลอกข้อความงานไฟแนนซ์ไว้ให้สำหรับวางใน LINE');
      } else if (result === 'shared_text_only') {
        markTextSent();
        onNotify('เปิดหน้าต่างแชร์ข้อความงานไฟแนนซ์เรียบร้อยแล้ว');
      } else {
        try {
          await navigator.clipboard.writeText(financeLineText);
        } catch {
          // Ignore clipboard errors gracefully
        }
        setShareFallbackModal({ mode: result });
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        onNotify('ไม่สามารถเปิดเมนูแชร์ได้ กรุณาใช้ตัวเลือกคัดลอกข้อความและแนบรูป');
        setShareFallbackModal({ mode: 'fallback_required' });
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleSendImagesStep = async () => {
    if (attachments.length === 0) {
      onNotify('กรุณาแนบรูปภาพใบจองอย่างน้อย 1 รูปก่อนส่งรูป');
      return;
    }
    setIsSharing(true);
    try {
      const files = attachments.map((a) => a.file);
      const res = await shareFinanceFilesOnly(
        files,
        `รูปใบจอง ${calc.trim.modelName} ${calc.trim.trimName}`
      );
      if (res === 'shared') {
        markImagesSent();
        onNotify('ส่งรูปใบจองเข้า LINE แล้ว สามารถกดส่งข้อความในขั้นตอนถัดไปได้ทันที');
      } else if (res === 'downloaded') {
        markImagesSent();
        onNotify('บันทึกรูปภาพใบจองลงเครื่องแล้ว สามารถเลือกแนบในแชท LINE ได้ทันที');
      } else {
        onNotify('สิทธิ์การแชร์ถูกจำกัด กรุณาบันทึกรูปแล้วแนบส่งใน LINE');
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        onNotify('ไม่สามารถแชร์รูปภาพได้ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleSendTextStep = async (copyAndOpenLine = true) => {
    try {
      await navigator.clipboard.writeText(financeLineText);
      setCopiedJustNow(true);
      window.setTimeout(() => setCopiedJustNow(false), 2000);
    } catch {
      // Ignore clipboard error on restricted contexts
    }
    markTextSent();
    if (copyAndOpenLine) {
      onNotify('เปิด LINE เพื่อส่งข้อความงานไฟแนนซ์แล้ว (คัดลอกข้อความสำรองไว้ด้วย)');
    } else {
      onNotify('คัดลอกข้อความส่งงานไฟแนนซ์แล้ว สามารถวาง (Paste) ในแชท LINE เดิมได้เลย');
    }
  };

  const handleShareFilesOnly = async () => {
    if (attachments.length === 0) return;
    try {
      const res = await shareFinanceFilesOnly(
        attachments.map((a) => a.file),
        'รูปภาพใบจอง'
      );
      if (res === 'shared') {
        markImagesSent();
        onNotify('เปิดเมนูแชร์รูปภาพใบจองแล้ว');
      } else if (res === 'downloaded') {
        markImagesSent();
        onNotify('บันทึกรูปภาพใบจองลงเครื่องแล้ว สามารถเลือกรูปส่งในแชท LINE ได้ทันที');
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        onNotify('เกิดข้อผิดพลาดในการส่งรูปภาพใบจอง');
      }
    }
  };

  const downPctLabel = Number.isInteger(Number(calc.downPercentActual.toFixed(1)))
    ? String(Math.round(calc.downPercentActual))
    : calc.downPercentActual.toFixed(1);

  return (
    <div className="space-y-6">
      {/* Hidden File Inputs for Gallery, Camera & Individual Slot Replace */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/*"
        multiple
        onChange={handleGalleryPick}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleGalleryPick}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/*"
        onChange={handleReplacePick}
        className="hidden"
      />

      {/* Page Header & Quotation Selector */}
      <section className="card-premium rounded-2xl overflow-hidden">
        <div className="h-1 gold-copper-bar" />
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                ส่งงานไฟแนนซ์ · ดึงข้อมูลจากใบเสนอราคาอัตโนมัติ
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">
                เตรียมข้อมูลส่งงานไฟแนนซ์ พร้อมแนบรูปใบจองส่ง LINE
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                เชื่อมโยงข้อมูลชุดเดียวกับใบเสนอราคา แก้ไขเบอร์โทร สีรถ หรือหมายเหตุได้ทันทีโดยไม่ต้องกรอกซ้ำ
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onJumpToCalculatorStep(selectedSession.id, 3)}
                className="min-h-[40px] px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                แก้ไขเงินดาวน์ / ดอกเบี้ย
              </button>
              <button
                type="button"
                onClick={() => onJumpToCalculatorStep(selectedSession.id, 5)}
                className="min-h-[40px] px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                เปิดขั้นตอนที่ 5
              </button>
            </div>
          </div>

          {/* Step 1: Select Quotation */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <label
              htmlFor="finance-quote-selector"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              1. เลือกใบเสนอราคาที่ต้องการส่งงาน ({sortedSessions.length} รายการ)
            </label>
            <select
              id="finance-quote-selector"
              value={selectedSession.id}
              onChange={(e) => onSelectQuoteSession(e.target.value)}
              className="w-full min-h-[46px] px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {sortedSessions.map((item, idx) => {
                const c = calculateQuote(settings, item.state);
                const rankLabel = idx === 0 ? '[ล่าสุด] ' : '';
                const customer = item.state.customerName.trim()
                  ? `คุณ${item.state.customerName.trim()}`
                  : 'ไม่ระบุชื่อลูกค้า';
                const pay = c.isCashPurchase
                  ? 'ซื้อสด'
                  : `ดาวน์ ${Math.round(c.downPercentActual)}% · ผ่อน ${formatTHB(
                      c.monthlyInstallment
                    )} ฿/ด.`;
                return (
                  <option key={item.id} value={item.id}>
                    {rankLabel}
                    {c.trim.modelName} {c.trim.trimName} — {customer} ({pay})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </section>

      {/* Cash Mode Advisory */}
      {calc.isCashPurchase && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-amber-950 dark:text-amber-200">
                ใบเสนอราคานี้อยู่ในรูปแบบ &quot;ซื้อเงินสด&quot;
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-0.5">
                หากต้องการส่งงานจัดไฟแนนซ์ สามารถสลับรูปแบบเป็นจัดไฟแนนซ์เพื่อคำนวณเงินดาวน์ ยอดจัด และค่างวดได้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              updateState((prev) => ({ ...prev, purchaseType: 'finance' }));
              onNotify('เปลี่ยนใบเสนอราคาเป็นรูปแบบจัดไฟแนนซ์แล้ว');
            }}
            className="min-h-[42px] px-4 py-2 text-xs font-extrabold btn-gold-copper rounded-xl shrink-0 cursor-pointer"
          >
            เปลี่ยนเป็นจัดไฟแนนซ์ทันที
          </button>
        </div>
      )}

      {/* Main Two-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Synced Quote Summary + Missing Fields + Booking Slip Images */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 2: Synced Auto-Pulled Vehicle & Loan Summary */}
          <section className="card-premium rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  2. ข้อมูลที่ดึงจากใบเสนอราคาอัตโนมัติ
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white mt-0.5">
                  {calc.trim.modelName} · {calc.trim.trimName}
                </h2>
              </div>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                ซิงก์ข้อมูลล่าสุด
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/75 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  ราคารถสุทธิ
                </div>
                <div className="text-sm sm:text-base font-extrabold font-mono-num text-slate-950 dark:text-white mt-0.5">
                  {formatTHB(calc.netCarPrice)} ฿
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/75 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  เงินดาวน์ ({downPctLabel}%)
                </div>
                <div className="text-sm sm:text-base font-extrabold font-mono-num text-slate-950 dark:text-white mt-0.5">
                  {formatTHB(calc.downPaymentGross)} ฿
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/75 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  ยอดจัดไฟแนนซ์
                </div>
                <div className="text-sm sm:text-base font-extrabold font-mono-num text-slate-950 dark:text-white mt-0.5">
                  {formatTHB(calc.financeAmount)} ฿
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/75 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  อัตราดอกเบี้ย
                </div>
                <div className="text-sm sm:text-base font-extrabold font-mono-num text-slate-950 dark:text-white mt-0.5">
                  {calc.effectiveInterestRate.toFixed(2)}% / ปี
                </div>
                {calc.specialDiscountActive && (
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5 truncate">
                    {calc.specialDiscountLabel}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/75 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  ชำระงวดแรกวันรับรถ
                </div>
                <div className="text-sm sm:text-base font-extrabold font-mono-num text-slate-950 dark:text-white mt-0.5">
                  {selectedSession.state.payFirstInstallmentOnDelivery &&
                  calc.firstInstallmentDueOnDelivery > 0
                    ? `${formatTHB(calc.firstInstallmentDueOnDelivery)} ฿`
                    : 'ไม่มี'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gradient-to-br from-[#070d1f] to-[#162652] text-white border border-amber-400/50">
                <div className="text-[11px] text-slate-300">
                  ผ่อน ({calc.tenorMonths} งวด)
                </div>
                <div className="text-sm sm:text-base font-extrabold font-mono-num text-amber-300 mt-0.5">
                  {formatTHB(calc.monthlyInstallment)} ฿/ด.
                </div>
              </div>
            </div>
          </section>

          {/* Step 3 & 4: Customer Info, Vehicle Color & Notes (Synced back to Quote) */}
          <section className="card-premium rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                3–4. ตรวจสอบข้อมูลลูกค้า สีรถ และหมายเหตุเพิ่มเติม
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ข้อมูลที่กรอกหรือแก้ไขที่นี่จะเชื่อมโยงกับใบเสนอราคานี้โดยอัตโนมัติ
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ชื่อลูกค้า
                </label>
                <input
                  type="text"
                  value={selectedSession.state.customerName}
                  placeholder="ระบุชื่อลูกค้า เช่น สมชาย ใจดี"
                  onChange={(e) =>
                    updateState((prev) => ({
                      ...prev,
                      customerName: e.target.value,
                    }))
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={selectedSession.state.customerPhone}
                  placeholder="08X-XXX-XXXX"
                  onChange={(e) =>
                    updateState((prev) => ({
                      ...prev,
                      customerPhone: e.target.value,
                    }))
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono-num bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  สีรถ (สำหรับแจ้งส่งงานไฟแนนซ์)
                </label>
                <input
                  type="text"
                  value={selectedSession.state.vehicleColor || ''}
                  placeholder="เช่น ขาวมุก / เทา / ดำ / เงิน"
                  onChange={(e) =>
                    updateState((prev) => ({
                      ...prev,
                      vehicleColor: e.target.value,
                    }))
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  หมายเหตุเพิ่มเติม (ส่งไฟแนนซ์)
                </label>
                <textarea
                  rows={2}
                  value={selectedSession.state.financeNote || ''}
                  placeholder="ระบุเงื่อนไขพิเศษ อาชีพลูกค้า นัดเซ็นเอกสาร หรือรายละเอียดเพิ่มเติม..."
                  onChange={(e) =>
                    updateState((prev) => ({
                      ...prev,
                      financeNote: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
          </section>

          {/* Step 5: Booking Slip Photo Attachments */}
          <section className="card-premium rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  5. แนบรูปภาพใบจอง (รองรับมากกว่า 1 รูป)
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  รองรับไฟล์ JPG, PNG จากแกลเลอรี หรือถ่ายภาพจริงจากกล้องมือถือ (แนบแล้ว {attachments.length} รูป)
                </p>
              </div>
              {attachments.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClearAttachments(selectedSession.id);
                    onNotify('ล้างรูปภาพใบจองทั้งหมดแล้ว');
                  }}
                  className="min-h-[36px] px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                >
                  ลบทั้งหมด
                </button>
              )}
            </div>

            {/* Two Touch-Friendly Upload Triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="min-h-[48px] px-4 py-3 text-xs sm:text-sm font-bold bg-slate-950 hover:bg-slate-800 dark:bg-[#162652] dark:hover:bg-[#1e336b] text-amber-300 border border-transparent dark:border-amber-400/40 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ImagePlus className="w-4 h-4 shrink-0" />
                <span>เลือกรูปภาพใบจอง (แกลเลอรี)</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="min-h-[48px] px-4 py-3 text-xs sm:text-sm font-bold bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>ถ่ายภาพใบจองจากกล้อง</span>
              </button>
            </div>

            {attachments.length === 0 ? (
              <div className="p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                <FileImage className="w-7 h-7 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ยังไม่มีรูปภาพใบจองที่แนบไว้
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  กดเลือกรูปจากแกลเลอรีหรือถ่ายภาพจากกล้องมือถือเพื่อส่งพร้อมข้อความ LINE
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {attachments.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewLightbox(item)}
                      className="relative group aspect-[4/3] w-full bg-slate-200 dark:bg-slate-950 overflow-hidden cursor-pointer"
                      aria-label={`ดูตัวอย่างรูปภาพ ${item.name}`}
                    >
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </button>
                    <div className="p-2 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                        รูปที่ {idx + 1}: {item.name}
                      </div>
                      <div className="text-[10px] font-mono-num text-slate-500 dark:text-slate-400">
                        {formatFileSize(item.size)}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setReplacingAttachmentId(item.id);
                            replaceInputRef.current?.click();
                          }}
                          className="min-h-[36px] px-2 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          เปลี่ยน
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveAttachment(selectedSession.id, item.id)
                          }
                          className="min-h-[36px] px-2 py-1 text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Live LINE Message Preview & Primary Send Action */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
          <div className="card-premium rounded-2xl overflow-hidden">
            <div className="h-1.5 gold-copper-bar" />
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#06C755] text-white inline-flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-950 dark:text-white">
                      6–7. ตรวจสอบข้อความและส่งงานเข้า LINE
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      อัปเดตข้อความอัตโนมัติตามข้อมูลใบเสนอราคา
                    </div>
                  </div>
                </div>
              </div>

              {/* Exact Formatted LINE Message Box */}
              <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans border border-slate-800 max-h-[380px] overflow-y-auto">
                {financeLineText}
              </pre>

              {/* Send Mode Selector: Together vs Image-First vs Chat/Text-First */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    เลือกรูปแบบการส่งเข้า LINE
                  </span>
                  {(imagesSent || textSent) && (
                    <button
                      type="button"
                      onClick={() =>
                        setStepProgress({
                          sessionId: selectedSession.id,
                          imagesSent: false,
                          textSent: false,
                        })
                      }
                      className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      รีเซ็ตสถานะการส่ง
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSendMode('together')}
                    className={`min-h-[38px] px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      sendMode === 'together'
                        ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    ส่งรูป + ข้อความพร้อมกัน
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendMode('image_first')}
                    className={`min-h-[38px] px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      sendMode === 'image_first'
                        ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    ส่งรูปก่อน → ข้อความ
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendMode('text_first')}
                    className={`min-h-[38px] px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      sendMode === 'text_first'
                        ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    ส่งข้อความ/แชทก่อน → รูป
                  </button>
                </div>
              </div>

              {/* Action Controls Based on Selected Mode */}
              {sendMode === 'together' && (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={isSharing}
                    onClick={handleSendToLine}
                    className="w-full min-h-[48px] px-4 py-3 text-sm font-extrabold bg-[#06C755] hover:bg-[#05b24c] disabled:opacity-60 text-white rounded-xl inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
                  >
                    <Share2 className="w-4 h-4 shrink-0" />
                    <span>
                      {attachments.length > 0
                        ? `ส่งรูปใบจอง (${attachments.length} รูป) + ข้อความพร้อมกัน`
                        : 'ส่งข้อความงานเข้า LINE'}
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleCopyFinanceText}
                      className="min-h-[44px] px-3 py-2 text-xs font-bold bg-slate-950 hover:bg-slate-800 dark:bg-[#162652] dark:hover:bg-[#1e336b] text-amber-300 rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedJustNow ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedJustNow ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}</span>
                    </button>

                    <a
                      href={lineTextOnlyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markTextSent()}
                      className="min-h-[44px] px-3 py-2 text-xs font-bold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl inline-flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-[#06C755]" />
                      <span>เปิดแชท LINE</span>
                    </a>
                  </div>
                </div>
              )}

              {sendMode === 'image_first' && (
                <div className="space-y-3">
                  {/* Step 1: Send Images First */}
                  <div
                    className={`p-3.5 rounded-xl border space-y-2.5 ${
                      imagesSent
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-950 dark:text-white">
                        ขั้นตอนที่ 1: ส่งรูปใบจองเข้า LINE ก่อน
                      </span>
                      {imagesSent && (
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          ส่งรูปแล้ว
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isSharing || attachments.length === 0}
                      onClick={handleSendImagesStep}
                      className="w-full min-h-[46px] px-4 py-2.5 text-xs sm:text-sm font-extrabold btn-gold-copper disabled:opacity-50 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 shrink-0" />
                      <span>
                        {attachments.length > 0
                          ? `ส่งรูปภาพใบจอง (${attachments.length} รูป)`
                          : 'กรุณาแนบรูปภาพใบจองด้านซ้ายก่อน'}
                      </span>
                    </button>
                  </div>

                  {/* Step 2: Send Text / Open LINE Chat */}
                  <div
                    className={`p-3.5 rounded-xl border space-y-2.5 ${
                      textSent
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-950 dark:text-white">
                        ขั้นตอนที่ 2: ส่งข้อความเข้าแชท LINE ต่อ
                      </span>
                      {textSent && (
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          ส่งข้อความแล้ว
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={lineTextOnlyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSendTextStep(true)}
                        className="min-h-[44px] px-3 py-2 text-xs font-extrabold bg-[#06C755] hover:bg-[#05b24c] text-white rounded-xl inline-flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5 shrink-0" />
                        <span>เปิดแชท LINE ส่งข้อความ</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleSendTextStep(false)}
                        className="min-h-[44px] px-3 py-2 text-xs font-bold bg-slate-950 hover:bg-slate-800 dark:bg-[#162652] text-amber-300 rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 shrink-0" />
                        <span>คัดลอกไปวางแชทเดิม</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {sendMode === 'text_first' && (
                <div className="space-y-3">
                  {/* Step 1: Send Text / Chat First */}
                  <div
                    className={`p-3.5 rounded-xl border space-y-2.5 ${
                      textSent
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-950 dark:text-white">
                        ขั้นตอนที่ 1: ส่งข้อความ / เปิดแชท LINE ก่อน
                      </span>
                      {textSent && (
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          ส่งข้อความแล้ว
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={lineTextOnlyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSendTextStep(true)}
                        className="min-h-[46px] px-3 py-2 text-xs font-extrabold bg-[#06C755] hover:bg-[#05b24c] text-white rounded-xl inline-flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5 shrink-0" />
                        <span>เปิดแชท LINE ส่งข้อความ</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleSendTextStep(false)}
                        className="min-h-[46px] px-3 py-2 text-xs font-bold bg-slate-950 hover:bg-slate-800 dark:bg-[#162652] text-amber-300 rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 shrink-0" />
                        <span>คัดลอกข้อความ</span>
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Send Booking Slip Images After */}
                  <div
                    className={`p-3.5 rounded-xl border space-y-2.5 ${
                      imagesSent
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-950 dark:text-white">
                        ขั้นตอนที่ 2: ส่งรูปใบจองตามเข้าแชทเดิม
                      </span>
                      {imagesSent && (
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          ส่งรูปแล้ว
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isSharing || attachments.length === 0}
                      onClick={handleSendImagesStep}
                      className="w-full min-h-[46px] px-4 py-2.5 text-xs sm:text-sm font-extrabold btn-gold-copper disabled:opacity-50 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 shrink-0" />
                      <span>
                        {attachments.length > 0
                          ? `ส่งรูปภาพใบจอง (${attachments.length} รูป) เข้าแชท`
                          : 'กรุณาแนบรูปภาพใบจองด้านซ้ายก่อน'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                สามารถส่งรูปพร้อมข้อความในคำสั่งเดียว (เมื่ออุปกรณ์รองรับ) หรือสลับเลือกส่งรูปก่อนแล้วค่อยส่งข้อความ / ส่งข้อความเข้าแชทก่อนแล้วตามด้วยรูปใบจองได้ทันทีครับ
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Image Preview Lightbox Modal */}
      {previewLightbox && (
        <div
          role="dialog"
          aria-modal="true"
          className="no-print fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewLightbox(null)}
        >
          <div
            className="max-w-2xl w-full bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2 text-white">
              <div className="text-xs sm:text-sm font-bold truncate">
                {previewLightbox.name}
              </div>
              <button
                type="button"
                onClick={() => setPreviewLightbox(null)}
                className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 inline-flex items-center justify-center cursor-pointer"
                aria-label="ปิดตัวอย่างรูป"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-slate-950 flex items-center justify-center">
              <img
                src={previewLightbox.previewUrl}
                alt={previewLightbox.name}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Fallback Modal when OS/Browser doesn't send both Text & Files together */}
      {shareFallbackModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="no-print fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="h-1 gold-copper-bar" />
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-950 dark:text-white">
                    {shareFallbackModal.mode === 'shared_files_only'
                      ? 'แชร์รูปใบจองแล้ว — ขั้นตอนส่งข้อความประกอบ'
                      : 'ส่งงานเข้า LINE แบบแยกขั้นตอน'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {shareFallbackModal.mode === 'shared_files_only'
                      ? 'ระบบคัดลอกข้อความงานไฟแนนซ์ไว้ในคลิปบอร์ดแล้ว สามารถวาง (Paste) ในแชท LINE ที่เพิ่งส่งรูปได้เลย'
                      : 'อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการส่งไฟล์ภาพพร้อมข้อความในคำสั่งเดียว กรุณาส่งตาม 2 ขั้นตอนด้านล่าง'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShareFallbackModal(null)}
                  className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center justify-center cursor-pointer"
                  aria-label="ปิด"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                    ขั้นตอนที่ 1: ส่งข้อความงานไฟแนนซ์
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyFinanceText}
                      className="min-h-[44px] px-3 py-2 text-xs font-bold bg-slate-950 text-amber-300 rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      คัดลอกข้อความ
                    </button>
                    <a
                      href={lineTextOnlyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3 py-2 text-xs font-bold bg-[#06C755] text-white rounded-xl inline-flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      เปิด LINE ส่งข้อความ
                    </a>
                  </div>
                </div>

                {attachments.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="text-xs font-extrabold text-slate-950 dark:text-white">
                      ขั้นตอนที่ 2: แนบรูปภาพใบจอง ({attachments.length} รูป)
                    </div>
                    <button
                      type="button"
                      onClick={handleShareFilesOnly}
                      className="w-full min-h-[44px] px-3 py-2 text-xs font-bold btn-gold-copper rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      ส่ง / บันทึกรูปภาพใบจองเพื่อแนบใน LINE
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShareFallbackModal(null)}
                className="w-full min-h-[44px] px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl cursor-pointer"
              >
                ปิดหน้าต่างนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
