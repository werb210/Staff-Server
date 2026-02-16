export interface CreateLeadDTO {
  companyName: string;
  fullName: string;
  email: string;
  phone: string;

  yearsInBusiness?: string;
  annualRevenue?: string;
  monthlyRevenue?: string;
  requestedAmount?: string;
  creditScoreRange?: string;

  source?: string; // credit-readiness | contact | product-page
  productInterest?: string;
  industryInterest?: string;
}

export interface Lead extends CreateLeadDTO {
  id: string;
  createdAt: Date;
}
