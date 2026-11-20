export type BrandId = 'DEEPAL' | 'CHANGAN';

export type TenorMonths = 36 | 48 | 60 | 72 | 84;

export type DownPercentTier = 30 | 25 | 20 | 15 | 10 | 5;

export type RateTableType = 'standard' | 'lumin';

export type VatMode =
  | 'included_with_subsidy_vat'
  | 'included_no_subsidy_vat';

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 'preview';

export interface BenefitCategories {
  insuranceAndAct: string;
  homeCharger: string;
  vehicleWarranty: string;
  batteryWarranty: string;
  lifetimeBatteryWarranty: string;
  roadsideAssistance: string;
  extraItems: string[];
}

export interface VehicleTrim {
  id: string;
  modelId: string;
  brand: BrandId;
  modelName: string;
  trimName: string;
  powertrain: 'BEV' | 'REEV';
  normalPrice: number;
  specialPrice: number;
  defaultVehicleDiscount: number;
  defaultDownSubsidy: number;
  rateTable: RateTableType;
  packageTitle: string;
  benefits: BenefitCategories;
  active: boolean;
}

export type RateMatrix = Record<DownPercentTier, Record<TenorMonths, number | null>>;

export interface DeliveryExpenseDefaults {
  registrationFee: number;
  redPlateDeposit: number;
  bookingDeposit: number;
}

export interface ShowroomInfo {
  showroomName: string;
  branchName: string;
  address: string;
  phone: string;
  lineId: string;
  salesName: string;
  salesPhone: string;
  logoUrl: string;
  quoteValidityDays: number;
}

export interface FreebieItem {
  id: string;
  label: string;
  defaultChecked: boolean;
}

export interface DealerSettings {
  showroom: ShowroomInfo;
  trims: VehicleTrim[];
  rateMatrices: {
    standard: RateMatrix;
    lumin: RateMatrix;
  };
  earlyPaymentDiscount: number; // default 0.10
  deliveryDefaults: DeliveryExpenseDefaults;
  freebiePresets: FreebieItem[];
  defaultAnonymousMode?: boolean;
}

export interface CustomDeliveryItem {
  id: string;
  category?: 'accessory' | 'other';
  label: string;
  amount: string; // string so empty inputs stay truly blank
}

export interface QuoteState {
  selectedTrimId: string;
  purchaseType?: 'finance' | 'cash';
  vehicleDiscount: number;
  downPaymentSubsidy: number;
  vatMode?: VatMode;
  includeVat: boolean; // VAT 7% on down payment subsidy (กรณีซับดาวน์)
  downMode: 'percent' | 'amount';
  downPercentInput: number;
  downAmountInput: number;
  tenorMonths: TenorMonths;
  payFirstInstallmentOnDelivery: boolean;
  customInterestRate: number | null; // null = auto from table
  registrationFee: number;
  redPlateDeposit: number;
  bookingDeposit: number;
  customDeliveryItems: CustomDeliveryItem[];
  selectedFreebieIds: string[];
  customFreebieNote: string;
  promotionNote: string;
  benefitsOverride: BenefitCategories | null;
  customerName: string;
  customerPhone: string;
  bookingDetails: string;
  quoteNote: string;
  anonymousMode?: boolean;
}

export interface QuoteSession {
  id: string;
  quoteNumber: string;
  createdAt: string;
  updatedAt: string;
  currentStep: WizardStep;
  hasVisitedPreview: boolean;
  state: QuoteState;
}

export interface CalculatedQuote {
  trim: VehicleTrim;
  activeBenefits: BenefitCategories;
  isCashPurchase: boolean;
  normalPrice: number;
  baseSpecialPrice: number;
  vehicleDiscount: number;
  priceAfterDiscount: number;
  vatMode: VatMode;
  carVatAmount: number;
  priceBeforeVat: number;
  netCarPrice: number;
  downPaymentGross: number;
  downPercentActual: number;
  downPaymentSubsidy: number;
  netDownPayment: number;
  excessSubsidy: number;
  includeVat: boolean;
  subsidyVatAmount: number;
  financeAmount: number;
  tenorMonths: TenorMonths;
  tenorYears: number;
  tierMatched: DownPercentTier | null;
  tableRate: number | null;
  isRateUnavailable: boolean;
  earlyPaymentDiscountApplied: number;
  effectiveInterestRate: number;
  totalInterest: number;
  totalPayable: number;
  monthlyInstallment: number;
  firstInstallmentDueOnDelivery: number;
  registrationFee: number;
  redPlateDeposit: number;
  bookingDeposit: number;
  customDeliveryItemsParsed: {
    category: 'accessory' | 'other';
    label: string;
    amount: number;
  }[];
  customDeliveryTotal: number;
  totalDeliveryCashDue: number;
}
