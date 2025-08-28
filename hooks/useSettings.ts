import { useLocalStorage } from './useLocalStorage';
import { BankDetails, LorryReceipt } from '../types';

export interface CompanySettings {
  logoUrl: string | null;
  themeColor: string;
  defaultBankDetails: BankDetails;
  defaultTerms: string;
  defaultRiskType: LorryReceipt['riskType'];
  defaultRemarks: string;
}

const initialSettings: CompanySettings = {
  logoUrl: null,
  themeColor: '#0D47A1', // Default brand primary
  defaultBankDetails: {
    accountHolderName: 'ALL INDIA LOGISTICS',
    bankName: 'HDFC Bank',
    accountNumber: '50200012345678',
    ifscCode: 'HDFC0001234',
  },
  defaultTerms: "1. The goods are accepted for transport at owner's risk.\n2. We are not responsible for leakage, breakage, or damage.\n3. Delivery will be made against the consignee's copy.",
  defaultRiskType: "AT OWNER'S RISK",
  defaultRemarks: "Handle with care",
};

export const useSettings = () => {
  const [settings, setSettings] = useLocalStorage<CompanySettings>('companySettings', initialSettings);
  return [settings, setSettings] as const;
};