export interface ProjectData {
  name: string;
  type: string;
  location: string;
  specificProductName: string;
  authorName: string;
  vision: string;
  mission: string;
  initialInvestment: number;
  currency: string;
  localCurrency: string;
  exchangeRate: number;
  fundingType: string;
  targetAudience: string;
  lossTolerance: number; // TMA in %
  horizon: number; // n in years
  socialPain?: string;
  investorName?: string;
  projectBudget?: number;
  investorGains?: string;
  sustainability?: string;
}

export interface MonthlyEstimates {
  min: number;
  med: number;
  max: number;
  monthlyContribution?: number;
  yearlyPartnerSupport?: number;
  stateSupport?: number;
}

export interface Indicators {
  vpl: number;
  tir: number;
  paybackSimples: number;
  paybackDescontado: number;
  il: number;
  mv: number;
}

export interface FormQuestion {
  title: string;
  type: 'radio' | 'checkbox' | 'textarea' | 'text';
  options?: string[];
}
