import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Columns2,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FilePlus2,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Printer,
  Send,
  Share2,
} from 'lucide-react';
import {
  CalculatedQuote,
  DealerSettings,
  QuoteSession,
  WizardStep,
} from '../types/dealer';
import {
  calculateQuote,
  formatTHB,
  formatTHBDecimal,
} from '../utils/finance';
import { QuotationSheet } from './QuotationSheet';

interface QuotationPreviewViewProps {
  settings: DealerSettings;
  session: QuoteSession;
  quoteSessions: QuoteSession[];
  calc: CalculatedQuote;
  lineShareText: string;
  lineShareUrl: string;
  isExporting: boolean;
  onJumpToStep: (step: Exclude<WizardStep, 'preview'>) => void;
  onEditQuoteSession: (
    sessionId: string,
    step: Exclude<WizardStep, 'preview'>
  ) => void;
  onCreateNewQuote: () => void;
  onDuplicateActiveQuote: () => void;
  onToggleAnonymousMode: () => void;
  onCopyText: () => void;
  onShareImage: () => void;
  onExportImage: () => void;
  onExportPdf: () => void;
}

const STEP_EDIT_LINKS: { step: Exclude<WizardStep, 'preview'>; label: string }[] = [
  { step: 1, label: '1. รุ่นรถยนต์' },
  { step: 2, label: '2. ราคา / ส่วนลด / VAT' },
  { step: 3, label: '3. ซื้อสด / ดาวน์ / งวด' },
  { step: 4, label: '4. ค่าใช้จ่ายวันรับรถ' },
  { step: 5, label: '5. ลูกค้าและโปรโมชั่น' },
];

function computeTotalCost(c: CalculatedQuote): number {
  const fees = c.registrationFee + c.redPlateDeposit + c.customDeliveryTotal;
  if (c.isCashPurchase) {
    return c.netCarPrice + fees;
  }
  // Total out-of-pocket: net down payment + subsidy VAT + delivery fees + total finance payments
  // (avoids double-counting booking deposit or 1st installment paid on delivery)
  return Number(
    (c.netDownPayment + c.subsidyVatAmount + fees + c.totalPayable).toFixed(2)
  );
}

function formatSessionOptionLabel(
  item: QuoteSession,
  c: CalculatedQuote,
  rankIndex: number
): string {
  const rankPrefix =
    rankIndex === 0 ? '[ล่าสุด #1] ' : rankIndex === 1 ? '[ล่าสุด #2] ' : '';
  const customer = item.state.customerName.trim()
    ? `คุณ${item.state.customerName.trim()}`
    : 'ไม่ระบุชื่อลูกค้า';
  const payment = c.isCashPurchase
    ? 'ซื้อสด'
    : `${formatTHB(c.monthlyInstallment)} ฿/ด. · ${c.tenorMonths} งวด`;
  return `${rankPrefix}${item.quoteNumber} — ${customer} (${c.trim.modelName} ${c.trim.trimName} | ${payment})`;
}

export const QuotationPreviewView: React.FC<QuotationPreviewViewProps> = ({
  settings,
  session,
  quoteSessions,
  calc,
  lineShareText,
  lineShareUrl,
  isExporting,
  onJumpToStep,
  onEditQuoteSession,
  onCreateNewQuote,
  onDuplicateActiveQuote,
  onToggleAnonymousMode,
  onCopyText,
  onShareImage,
  onExportImage,
  onExportPdf,
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

  const [showTextPreview, setShowTextPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'single' | 'compare'>('single');
  const [quoteAId, setQuoteAId] = useState<string>(
    () => sortedSessions[0]?.id || session.id
  );
  const [quoteBId, setQuoteBId] = useState<string>(
    () => sortedSessions[1]?.id || sortedSessions[0]?.id || session.id
  );

  const isAnonymous = Boolean(session.state.anonymousMode);

  const selectLatestTwo = () => {
    const first = sortedSessions[0] || session;
    const second = sortedSessions[1] || first;
    setQuoteAId(first.id);
    setQuoteBId(second.id);
  };

  useEffect(() => {
    if (!sortedSessions.some((q) => q.id === quoteAId)) {
      setQuoteAId(sortedSessions[0]?.id || session.id);
    }
    if (
      !sortedSessions.some((q) => q.id === quoteBId) ||
      (sortedSessions.length > 1 && quoteBId === quoteAId)
    ) {
      const other = sortedSessions.find((q) => q.id !== quoteAId);
      setQuoteBId(other ? other.id : session.id);
    }
  }, [sortedSessions, session.id, quoteAId, quoteBId]);

  const sessionA = useMemo(
    () => sortedSessions.find((q) => q.id === quoteAId) || sortedSessions[0] || session,
    [sortedSessions, quoteAId, session]
  );

  const sessionB = useMemo(() => {
    const found = sortedSessions.find((q) => q.id === quoteBId);
    if (found) return found;
    return sortedSessions.find((q) => q.id !== sessionA.id) || sessionA;
  }, [sortedSessions, quoteBId, sessionA]);

  const calcA = useMemo(
    () => calculateQuote(settings, sessionA.state),
    [settings, sessionA.state]
  );
  const calcB = useMemo(
    () => calculateQuote(settings, sessionB.state),
    [settings, sessionB.state]
  );

  const totalCostA = computeTotalCost(calcA);
  const totalCostB = computeTotalCost(calcB);

  const renderDiffBadge = (
    valA: number,
    valB: number,
    unit = 'บาท',
    decimals = false,
    onDark = false
  ) => {
    const diff = Number((valB - valA).toFixed(2));
    if (Math.abs(diff) < 0.01) {
      return (
        <span
          className={`text-xs font-medium ${
            onDark ? 'text-slate-300' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          เท่ากัน
        </span>
      );
    }
    const isLower = diff < 0;
    const formatted = decimals
      ? formatTHBDecimal(Math.abs(diff))
      : formatTHB(Math.abs(diff));
    return (
      <div className="inline-flex flex-col items-end">
        <span
          className={`text-xs font-bold font-mono-num ${
            isLower
              ? onDark
                ? 'text-emerald-300'
                : 'text-emerald-700 dark:text-emerald-400'
              : onDark
              ? 'text-amber-300'
              : 'text-amber-700 dark:text-amber-400'
          }`}
        >
          {diff > 0 ? `+${formatted}` : `-${formatted}`} {unit}
        </span>
        <span
          className={`text-[10px] ${
            onDark ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {isLower ? 'B ถูกกว่า' : 'B สูงกว่า'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Mode Switcher + Quick-Jump / Share Controls */}
      <div className="no-print max-w-[960px] mx-auto card-premium rounded-2xl overflow-hidden">
        <div className="h-1 gold-copper-bar" />
        <div className="p-5 sm:p-6 space-y-5">
          {/* Top Headline + View Mode Toggle + Anonymous + Back */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="text-xs font-mono-num font-bold text-amber-700 dark:text-amber-400">
                {previewMode === 'compare'
                  ? `เปรียบเทียบใบเสนอราคา (${quoteSessions.length} รายการที่บันทึกไว้)`
                  : `${session.quoteNumber} · ใบเสนอราคาสำเร็จรูป`}
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">
                {previewMode === 'compare'
                  ? 'ตารางเปรียบเทียบค่างวดและค่าใช้จ่ายรวม'
                  : `${calc.trim.modelName} (${calc.trim.trimName})${
                      session.state.customerName.trim()
                        ? ` — คุณ${session.state.customerName.trim()}`
                        : ''
                    }`}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              {/* Single vs Side-by-Side Comparison Switcher */}
              <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewMode('single')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    previewMode === 'single'
                      ? 'bg-gradient-to-r from-slate-950 to-slate-800 dark:from-[#162652] dark:to-[#1e336b] text-amber-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  ใบเสนอราคา
                </button>
                <button
                  type="button"
                  onClick={() => {
                    selectLatestTwo();
                    setPreviewMode('compare');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    previewMode === 'compare'
                      ? 'bg-gradient-to-r from-slate-950 to-slate-800 dark:from-[#162652] dark:to-[#1e336b] text-amber-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  เปรียบเทียบ 2 ใบ
                </button>
              </div>

              {previewMode === 'single' && (
                <button
                  type="button"
                  aria-pressed={isAnonymous}
                  onClick={onToggleAnonymousMode}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl border inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                    isAnonymous
                      ? 'bg-slate-950 dark:bg-[#162652] text-amber-300 border-amber-400/60 shadow-sm'
                      : 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {isAnonymous ? (
                    <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  {isAnonymous
                    ? 'โหมดไม่ระบุตัวตน: เปิด'
                    : 'โหมดไม่ระบุตัวตน: ปิด'}
                </button>
              )}

              <button
                type="button"
                onClick={() => onJumpToStep(5)}
                className="px-4 py-2 text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                กลับไปแก้ไขขั้นตอน
              </button>
            </div>
          </div>

          {previewMode === 'single' && (
            <>
              {/* Quick Jump to Any Step */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  แก้ไขข้อมูลรายขั้นตอนได้ทันที (ข้อมูลเดิมทั้งหมดจะยังอยู่ครบ)
                </div>
                <div className="flex flex-wrap gap-2">
                  {STEP_EDIT_LINKS.map((item) => (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => onJumpToStep(item.step)}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-amber-50 dark:bg-slate-900 dark:hover:bg-[#162652] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-amber-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2-Mode LINE Share & Export Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                {/* Mode 1: LINE Text */}
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-[#06C755] text-white inline-flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-950 dark:text-white">
                          โหมดที่ 1: ส่งเป็นข้อความทาง LINE
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          แบ่งหมวดราคา ดาวน์ ค่างวด และสิทธิประโยชน์อ่านง่าย
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={lineShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-[#06C755] to-[#049e42] hover:from-[#07d65c] hover:to-[#05b84d] text-white rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap shadow-sm transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      ส่งเข้า LINE ทันที
                    </a>
                    <button
                      type="button"
                      onClick={onCopyText}
                      className="px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      คัดลอกข้อความ
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTextPreview((v) => !v)}
                      className="px-2.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      {showTextPreview ? (
                        <>
                          ซ่อนข้อความ <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          ดูตัวอย่างข้อความ <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Mode 2: LINE Image & Document Export */}
                <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-slate-900/80 border border-amber-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg btn-gold-copper text-slate-950 inline-flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-950 dark:text-white">
                        โหมดที่ 2: ส่งเป็นรูปภาพทาง LINE / PDF
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        การ์ดใบเสนอราคาความละเอียดสูงพร้อมโลโก้และโปรโมชั่น
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={onShareImage}
                      className="btn-gold-copper px-3.5 py-2 text-xs font-extrabold disabled:opacity-60 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      แชร์รูปส่ง LINE
                    </button>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={onExportImage}
                      className="px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      บันทึก PNG
                    </button>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={onExportPdf}
                      className="btn-midnight px-3.5 py-2 text-xs font-semibold disabled:opacity-60 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap border border-transparent dark:border-slate-700 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-300" />
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      พิมพ์
                    </button>
                  </div>
                </div>
              </div>

              {/* Expandable LINE Text Message Preview */}
              {showTextPreview && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ตัวอย่างข้อความสำหรับส่งลูกค้าทาง LINE
                    </span>
                    <button
                      type="button"
                      onClick={onCopyText}
                      className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      คัดลอกทั้งหมด
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs leading-relaxed whitespace-pre-wrap font-sans border border-slate-800 max-h-80 overflow-y-auto">
                    {lineShareText}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Preview Content: Single Quotation Sheet OR Side-by-Side Comparison */}
      {previewMode === 'single' ? (
        <QuotationSheet
          settings={settings}
          state={session.state}
          calc={calc}
          quoteNumber={session.quoteNumber}
        />
      ) : (
        <div className="max-w-[960px] mx-auto space-y-5">
          {quoteSessions.length < 2 && (
            <div className="no-print card-premium rounded-2xl p-5 sm:p-6 border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/50 dark:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-sm font-extrabold text-slate-950 dark:text-white">
                  มีใบเสนอราคาที่บันทึกไว้เพียง 1 รายการ ({session.quoteNumber})
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  คัดลอกใบเสนอราคาปัจจุบันเพื่อปรับเงื่อนไข (เช่น เปลี่ยนเงินดาวน์ งวด หรือซื้อสด) หรือสร้างใบเสนอราคาใหม่อีกรุ่นเพื่อนำมาเทียบแบบเคียงข้าง
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onDuplicateActiveQuote}
                  className="btn-gold-copper px-3.5 py-2 text-xs font-extrabold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  คัดลอกใบนี้ไปเทียบเงื่อนไข
                </button>
                <button
                  type="button"
                  onClick={onCreateNewQuote}
                  className="btn-midnight px-3.5 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap border border-transparent dark:border-slate-700 cursor-pointer"
                >
                  <FilePlus2 className="w-3.5 h-3.5 text-amber-300" />
                  สร้างใบเสนอราคาใหม่
                </button>
              </div>
            </div>
          )}

          {/* Side-by-Side Session Selectors */}
          <div className="no-print card-premium rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                เลือกใบเสนอราคา 2 รายการเพื่อเปรียบเทียบ (ค่าเริ่มต้น: ล่าสุด 2 อันที่ทำไว้)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sortedSessions.length >= 2 && (
                  <>
                    <button
                      type="button"
                      onClick={selectLatestTwo}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      เลือกล่าสุด 2 อัน
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuoteAId(sessionB.id);
                        setQuoteBId(sessionA.id);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      สลับ A ↔ B
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onDuplicateActiveQuote}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  คัดลอกใบปัจจุบัน
                </button>
                <button
                  type="button"
                  onClick={onCreateNewQuote}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-950 hover:bg-slate-800 dark:bg-[#162652] dark:hover:bg-[#1e336b] text-amber-300 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  สร้างใบใหม่
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selector A */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-amber-700 dark:text-amber-400">
                    ใบเสนอราคา A (ล่าสุด #1)
                  </label>
                  <button
                    type="button"
                    onClick={() => onEditQuoteSession(sessionA.id, 3)}
                    className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    แก้ไขใบ A
                  </button>
                </div>
                <select
                  value={sessionA.id}
                  onChange={(e) => setQuoteAId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {sortedSessions.map((item, idx) => {
                    const c = calculateQuote(settings, item.state);
                    return (
                      <option key={item.id} value={item.id}>
                        {formatSessionOptionLabel(item, c, idx)}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Selector B */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-sky-700 dark:text-sky-400">
                    ใบเสนอราคา B (ล่าสุด #2)
                  </label>
                  <button
                    type="button"
                    onClick={() => onEditQuoteSession(sessionB.id, 3)}
                    className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    แก้ไขใบ B
                  </button>
                </div>
                <select
                  value={sessionB.id}
                  onChange={(e) => setQuoteBId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  {sortedSessions.map((item, idx) => {
                    const c = calculateQuote(settings, item.state);
                    return (
                      <option key={item.id} value={item.id}>
                        {formatSessionOptionLabel(item, c, idx)}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Side-by-Side Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                tag: 'ใบเสนอราคา A',
                accent: 'border-amber-400/50',
                badgeClass: 'bg-amber-400 text-slate-950',
                item: sessionA,
                c: calcA,
                totalCost: totalCostA,
              },
              {
                tag: 'ใบเสนอราคา B',
                accent: 'border-sky-400/50',
                badgeClass: 'bg-sky-400 text-slate-950',
                item: sessionB,
                c: calcB,
                totalCost: totalCostB,
              },
            ].map(({ tag, accent, badgeClass, item, c, totalCost }) => (
              <div
                key={tag}
                className={`card-midnight-hero text-white rounded-2xl p-5 border ${accent} space-y-4`}
              >
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${badgeClass}`}
                      >
                        {tag}
                      </span>
                      <span className="text-xs font-mono-num text-amber-300 font-semibold">
                        {item.quoteNumber}
                      </span>
                    </div>
                    <div className="text-base font-extrabold mt-1">
                      {c.trim.modelName} · {c.trim.trimName}
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {item.state.customerName.trim()
                        ? `ลูกค้า: คุณ${item.state.customerName.trim()}`
                        : 'ยังไม่ได้ระบุชื่อลูกค้า'}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white/10 text-slate-100 whitespace-nowrap">
                    {c.isCashPurchase
                      ? 'ซื้อเงินสด'
                      : `ผ่อน ${c.tenorMonths} งวด`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] text-slate-300">ค่างวด/เดือน</div>
                    <div className="text-base sm:text-lg font-extrabold font-mono-num text-amber-300 mt-0.5">
                      {c.isCashPurchase
                        ? '0 ฿'
                        : `${formatTHB(c.monthlyInstallment)} ฿`}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] text-slate-300">วันรับรถสุทธิ</div>
                    <div className="text-base sm:text-lg font-extrabold font-mono-num text-emerald-400 mt-0.5">
                      {formatTHB(c.totalDeliveryCashDue)} ฿
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] text-slate-300">ต้นทุนรวมทั้งหมด</div>
                    <div className="text-base sm:text-lg font-extrabold font-mono-num text-white mt-0.5">
                      {formatTHB(totalCost)} ฿
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-Side Comparison Table */}
          <div className="card-premium rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-950 dark:text-white">
                  ตารางเปรียบเทียบรายละเอียดค่างวดและค่าใช้จ่ายรวม
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  เปรียบเทียบความแตกต่างระหว่าง {sessionA.quoteNumber} (A) และ{' '}
                  {sessionB.quoteNumber} (B)
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="no-print self-start sm:self-auto px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                พิมพ์ตารางเปรียบเทียบ
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <th className="py-3.5 px-4 sm:px-5 min-w-[180px]">
                      รายการเปรียบเทียบ
                    </th>
                    <th className="py-3.5 px-4 text-right min-w-[150px] text-amber-700 dark:text-amber-300">
                      ใบเสนอราคา A ({sessionA.quoteNumber})
                    </th>
                    <th className="py-3.5 px-4 text-right min-w-[150px] text-sky-700 dark:text-sky-300">
                      ใบเสนอราคา B ({sessionB.quoteNumber})
                    </th>
                    <th className="py-3.5 px-4 sm:px-5 text-right min-w-[140px]">
                      ส่วนต่าง (B เทียบ A)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                  <tr>
                    <td className="py-3 px-4 sm:px-5 font-semibold text-slate-700 dark:text-slate-300">
                      รุ่นรถยนต์
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {calcA.trim.modelName} · {calcA.trim.trimName}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {calcB.trim.modelName} · {calcB.trim.trimName}
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right text-xs text-slate-400">
                      {calcA.trim.id === calcB.trim.id ? 'รุ่นเดียวกัน' : 'คนละรุ่น'}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 sm:px-5 font-semibold text-slate-700 dark:text-slate-300">
                      รูปแบบการซื้อ
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {calcA.isCashPurchase
                        ? 'ซื้อเงินสด'
                        : `จัดไฟแนนซ์ (${calcA.tenorMonths} งวด / ${calcA.tenorYears} ปี)`}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {calcB.isCashPurchase
                        ? 'ซื้อเงินสด'
                        : `จัดไฟแนนซ์ (${calcB.tenorMonths} งวด / ${calcB.tenorYears} ปี)`}
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right text-xs text-slate-500 dark:text-slate-400">
                      {calcA.isCashPurchase === calcB.isCashPurchase
                        ? calcA.isCashPurchase
                          ? 'ซื้อสดทั้งคู่'
                          : calcA.tenorMonths === calcB.tenorMonths
                          ? 'ระยะผ่อนเท่ากัน'
                          : `${calcB.tenorMonths - calcA.tenorMonths > 0 ? '+' : ''}${
                              calcB.tenorMonths - calcA.tenorMonths
                            } งวด`
                        : 'ซื้อสด vs ผ่อน'}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                      ราคาปกติ (MSRP)
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800 dark:text-slate-200">
                      {formatTHB(calcA.normalPrice)} ฿
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800 dark:text-slate-200">
                      {formatTHB(calcB.normalPrice)} ฿
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right">
                      {renderDiffBadge(calcA.normalPrice, calcB.normalPrice, '฿')}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                      ส่วนลดตัวรถ
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-emerald-700 dark:text-emerald-400">
                      -{formatTHB(calcA.vehicleDiscount)} ฿
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-emerald-700 dark:text-emerald-400">
                      -{formatTHB(calcB.vehicleDiscount)} ฿
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right text-xs font-mono-num text-slate-500 dark:text-slate-400">
                      {calcB.vehicleDiscount === calcA.vehicleDiscount
                        ? 'เท่ากัน'
                        : `${
                            calcB.vehicleDiscount - calcA.vehicleDiscount > 0
                              ? '+'
                              : '-'
                          }${formatTHB(
                            Math.abs(calcB.vehicleDiscount - calcA.vehicleDiscount)
                          )} ฿`}
                    </td>
                  </tr>

                  <tr className="bg-slate-50/70 dark:bg-slate-900/40">
                    <td className="py-3 px-4 sm:px-5 font-bold text-slate-900 dark:text-white">
                      ราคารถสุทธิ
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-950 dark:text-white">
                      {formatTHB(calcA.netCarPrice)} ฿
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-950 dark:text-white">
                      {formatTHB(calcB.netCarPrice)} ฿
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right">
                      {renderDiffBadge(calcA.netCarPrice, calcB.netCarPrice, '฿')}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                      เงินดาวน์ (หลังหักซับดาวน์)
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800 dark:text-slate-200">
                      {calcA.isCashPurchase
                        ? '— (ซื้อสด)'
                        : `${formatTHB(calcA.netDownPayment)} ฿ (${calcA.downPercentActual.toFixed(
                            1
                          )}%)`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800 dark:text-slate-200">
                      {calcB.isCashPurchase
                        ? '— (ซื้อสด)'
                        : `${formatTHB(calcB.netDownPayment)} ฿ (${calcB.downPercentActual.toFixed(
                            1
                          )}%)`}
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right">
                      {renderDiffBadge(
                        calcA.netDownPayment,
                        calcB.netDownPayment,
                        '฿'
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                      ยอดจัดไฟแนนซ์
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800 dark:text-slate-200">
                      {formatTHB(calcA.financeAmount)} ฿
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800 dark:text-slate-200">
                      {formatTHB(calcB.financeAmount)} ฿
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right">
                      {renderDiffBadge(calcA.financeAmount, calcB.financeAmount, '฿')}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                      อัตราดอกเบี้ยต่อปี
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800 dark:text-slate-200">
                      {calcA.isCashPurchase
                        ? '0.00% (ซื้อสด)'
                        : `${calcA.effectiveInterestRate.toFixed(2)}%`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800 dark:text-slate-200">
                      {calcB.isCashPurchase
                        ? '0.00% (ซื้อสด)'
                        : `${calcB.effectiveInterestRate.toFixed(2)}%`}
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right text-xs font-mono-num text-slate-500 dark:text-slate-400">
                      {Math.abs(
                        calcB.effectiveInterestRate - calcA.effectiveInterestRate
                      ) < 0.005
                        ? 'เท่ากัน'
                        : `${
                            calcB.effectiveInterestRate -
                              calcA.effectiveInterestRate >
                            0
                              ? '+'
                              : ''
                          }${(
                            calcB.effectiveInterestRate - calcA.effectiveInterestRate
                          ).toFixed(2)}%`}
                    </td>
                  </tr>

                  {/* Highlighted Monthly Installment Row */}
                  <tr className="bg-amber-50/70 dark:bg-amber-500/10">
                    <td className="py-3.5 px-4 sm:px-5 font-extrabold text-slate-950 dark:text-amber-300">
                      ค่างวดรายเดือน
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-num text-sm sm:text-base font-extrabold text-slate-950 dark:text-amber-300">
                      {calcA.isCashPurchase
                        ? '0 ฿/เดือน (ซื้อสด)'
                        : `${formatTHB(calcA.monthlyInstallment)} ฿/ด.`}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-num text-sm sm:text-base font-extrabold text-slate-950 dark:text-sky-300">
                      {calcB.isCashPurchase
                        ? '0 ฿/เดือน (ซื้อสด)'
                        : `${formatTHB(calcB.monthlyInstallment)} ฿/ด.`}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-right">
                      {renderDiffBadge(
                        calcA.monthlyInstallment,
                        calcB.monthlyInstallment,
                        '฿/ด.'
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                      ดอกเบี้ยรวมตลอดสัญญา
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800 dark:text-slate-200">
                      {formatTHBDecimal(calcA.totalInterest)} ฿
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800 dark:text-slate-200">
                      {formatTHBDecimal(calcB.totalInterest)} ฿
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right">
                      {renderDiffBadge(
                        calcA.totalInterest,
                        calcB.totalInterest,
                        '฿',
                        true
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                      ยอดชำระรวมไฟแนนซ์ (เงินต้น + ดอกเบี้ย)
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                      {formatTHBDecimal(calcA.totalPayable)} ฿
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                      {formatTHBDecimal(calcB.totalPayable)} ฿
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right">
                      {renderDiffBadge(
                        calcA.totalPayable,
                        calcB.totalPayable,
                        '฿',
                        true
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                      ค่าใช้จ่ายอื่นวันรับรถ (จดทะเบียน + ป้ายแดง + ตกแต่ง)
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800 dark:text-slate-200">
                      {formatTHB(
                        calcA.registrationFee +
                          calcA.redPlateDeposit +
                          calcA.customDeliveryTotal
                      )}{' '}
                      ฿
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800 dark:text-slate-200">
                      {formatTHB(
                        calcB.registrationFee +
                          calcB.redPlateDeposit +
                          calcB.customDeliveryTotal
                      )}{' '}
                      ฿
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right">
                      {renderDiffBadge(
                        calcA.registrationFee +
                          calcA.redPlateDeposit +
                          calcA.customDeliveryTotal,
                        calcB.registrationFee +
                          calcB.redPlateDeposit +
                          calcB.customDeliveryTotal,
                        '฿'
                      )}
                    </td>
                  </tr>

                  {/* Highlighted Delivery Cash Due Row */}
                  <tr className="bg-emerald-50/70 dark:bg-emerald-950/25">
                    <td className="py-3.5 px-4 sm:px-5 font-extrabold text-emerald-900 dark:text-emerald-300">
                      ยอดชำระวันรับรถสุทธิ
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-num text-sm sm:text-base font-extrabold text-emerald-800 dark:text-emerald-300">
                      {formatTHB(calcA.totalDeliveryCashDue)} ฿
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-num text-sm sm:text-base font-extrabold text-emerald-800 dark:text-emerald-300">
                      {formatTHB(calcB.totalDeliveryCashDue)} ฿
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-right">
                      {renderDiffBadge(
                        calcA.totalDeliveryCashDue,
                        calcB.totalDeliveryCashDue,
                        '฿'
                      )}
                    </td>
                  </tr>

                  {/* Highlighted Total Cost Row */}
                  <tr className="bg-slate-950 text-white dark:bg-[#0c1733]">
                    <td className="py-4 px-4 sm:px-5">
                      <div className="font-extrabold text-amber-300">
                        ต้นทุนรวมทั้งหมดตลอดสัญญา
                      </div>
                      <div className="text-[11px] text-slate-300 font-normal mt-0.5">
                        รวมเงินดาวน์/ราคาสด + ค่าใช้จ่ายวันรับรถ + ยอดผ่อนทั้งหมด
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono-num text-base font-extrabold text-amber-300">
                      {formatTHBDecimal(totalCostA)} ฿
                    </td>
                    <td className="py-4 px-4 text-right font-mono-num text-base font-extrabold text-sky-300">
                      {formatTHBDecimal(totalCostB)} ฿
                    </td>
                    <td className="py-4 px-4 sm:px-5 text-right">
                      {renderDiffBadge(totalCostA, totalCostB, '฿', true, true)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
