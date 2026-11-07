// Master data for the demo. Shapes follow api/prisma/schema.prisma so the
// Node backend can replace this file with real API calls later.

export const TEAMS = {
  ENGINEERING: 'Engineering',
  MANAGEMENT: 'Management',
  CP: 'Contracts & Procurement',
  FINANCE: 'Finance',
  STORES: 'Stores',
  SUPPLIER: 'Supplier',
  LOGISTICS: 'Logistics',
  THIRD_PARTY: 'Third Party',
};

export const ROLES = {
  ENG_CREATOR: 'Engineering Creator',
  ENG_REVIEWER: 'Engineering Reviewer',
  ENG_APPROVER: 'Engineering Approver',
  MGMT_APPROVER: 'Management Approver',
  CP_LEAD: 'C&P Lead',
  BUYER: 'Buyer',
  FIN_REVIEWER: 'Finance Reviewer',
  FIN_APPROVER: 'Finance Approver',
  STORES_PREPARER: 'Stores Preparer',
  STORES_REVIEWER: 'Stores Reviewer',
  STORES_APPROVER: 'Stores Approver',
  SUPPLIER_USER: 'Supplier',
  LOGISTICS_USER: 'Logistics Partner',
  TECH_INSPECTOR: 'Technical Inspector',
};

export const SUPPLIERS = [
  { id: 's-alpha', code: 'SUP-1001', name: 'Alpha Power Systems', type: 'LOCAL', country: 'India', currency: 'INR', gstin: '27AAACA1234F1Z5', city: 'Pune', rating: 4.6, email: 'bids@alphapower.in' },
  { id: 's-bharat', code: 'SUP-1002', name: 'Bharat Electricals Ltd', type: 'LOCAL', country: 'India', currency: 'INR', gstin: '24AABCB5678K1Z2', city: 'Vadodara', rating: 4.4, email: 'sales@bharatelectricals.in' },
  { id: 's-crest', code: 'SUP-1003', name: 'Crest Energy Pvt Ltd', type: 'LOCAL', country: 'India', currency: 'INR', gstin: '29AADCC9012M1Z8', city: 'Bengaluru', rating: 3.7, email: 'tender@crestenergy.in' },
  { id: 's-delta', code: 'SUP-2001', name: 'Delta Global Inc', type: 'IMPORT', country: 'Germany', currency: 'USD', gstin: null, city: 'Hamburg', rating: 4.8, email: 'export@deltaglobal.com' },
  { id: 's-eastline', code: 'SUP-1004', name: 'Eastline Switchgear', type: 'LOCAL', country: 'India', currency: 'INR', gstin: '19AAECE3456P1Z1', city: 'Kolkata', rating: 4.1, email: 'rfq@eastline.co.in' },
  { id: 's-fortune', code: 'SUP-1005', name: 'Fortune Grid Solutions', type: 'LOCAL', country: 'India', currency: 'INR', gstin: '33AAFCF7890Q1Z4', city: 'Chennai', rating: 4.3, email: 'quotes@fortunegrid.in' },
];

export const SUB_VENDORS = [
  { id: 'sv-abb', name: 'ABB Bushings (OEM)' },
  { id: 'sv-siemens', name: 'Siemens Energy (OEM)' },
  { id: 'sv-cgl', name: 'CG Power (OEM)' },
];

export const LOGISTICS_PARTNERS = [
  { id: 'lp-swift', name: 'SwiftCargo Logistics', isThirdParty: true, email: 'ops@swiftcargo.in' },
  { id: 'lp-inhouse', name: 'Westfield In-house Fleet', isThirdParty: false, email: 'fleet@westfieldenergy.com' },
];

export const CUSTOMERS = [
  { id: 'c-gujgrid', name: 'Gujarat Grid Corporation' },
  { id: 'c-ntpl', name: 'Northern Transmission Pvt Ltd' },
];

export const USERS = [
  { id: 'u-ravi', name: 'Ravi Kumar', designation: 'Engineer', team: 'ENGINEERING', role: 'ENG_CREATOR', email: 'ravi.kumar@westfieldenergy.com' },
  { id: 'u-meera', name: 'Meera Iyer', designation: 'Lead Engineer', team: 'ENGINEERING', role: 'ENG_REVIEWER', email: 'meera.iyer@westfieldenergy.com' },
  { id: 'u-suresh', name: 'Suresh Rao', designation: 'Engineering Head', team: 'ENGINEERING', role: 'ENG_APPROVER', email: 'suresh.rao@westfieldenergy.com' },
  { id: 'u-anita', name: 'Anita Desai', designation: 'GM Projects', team: 'MANAGEMENT', role: 'MGMT_APPROVER', email: 'anita.desai@westfieldenergy.com' },
  { id: 'u-vikram', name: 'Vikram Shah', designation: 'C&P Manager', team: 'CP', role: 'CP_LEAD', email: 'vikram.shah@westfieldenergy.com' },
  { id: 'u-neha', name: 'Neha Kapoor', designation: 'Buyer', team: 'CP', role: 'BUYER', email: 'neha.kapoor@westfieldenergy.com' },
  { id: 'u-karan', name: 'Karan Mehta', designation: 'Finance Executive', team: 'FINANCE', role: 'FIN_REVIEWER', email: 'karan.mehta@westfieldenergy.com' },
  { id: 'u-priya', name: 'Priya Nair', designation: 'Finance Controller', team: 'FINANCE', role: 'FIN_APPROVER', email: 'priya.nair@westfieldenergy.com' },
  { id: 'u-ajay', name: 'Ajay Singh', designation: 'Storekeeper', team: 'STORES', role: 'STORES_PREPARER', email: 'ajay.singh@westfieldenergy.com' },
  { id: 'u-deepak', name: 'Deepak Joshi', designation: 'Stores Supervisor', team: 'STORES', role: 'STORES_REVIEWER', email: 'deepak.joshi@westfieldenergy.com' },
  { id: 'u-rohan', name: 'Rohan Verma', designation: 'Stores Manager', team: 'STORES', role: 'STORES_APPROVER', email: 'rohan.verma@westfieldenergy.com' },
  { id: 'u-tuv', name: 'M. Fischer', designation: 'TÜV Inspector', team: 'THIRD_PARTY', role: 'TECH_INSPECTOR', email: 'inspection@tuv-audit.com' },
  { id: 'u-swift', name: 'SwiftCargo Ops', designation: 'Logistics Coordinator', team: 'LOGISTICS', role: 'LOGISTICS_USER', email: 'ops@swiftcargo.in', logisticsPartnerId: 'lp-swift' },
  { id: 'u-sup-bharat', name: 'Rajesh Patel', designation: 'Sales Manager', team: 'SUPPLIER', role: 'SUPPLIER_USER', email: 'sales@bharatelectricals.in', supplierId: 's-bharat' },
  { id: 'u-sup-alpha', name: 'Sanjay Gupta', designation: 'Key Accounts', team: 'SUPPLIER', role: 'SUPPLIER_USER', email: 'bids@alphapower.in', supplierId: 's-alpha' },
  { id: 'u-sup-crest', name: 'Arun Reddy', designation: 'Tender Desk', team: 'SUPPLIER', role: 'SUPPLIER_USER', email: 'tender@crestenergy.in', supplierId: 's-crest' },
  { id: 'u-sup-delta', name: 'Lena Brandt', designation: 'Export Sales', team: 'SUPPLIER', role: 'SUPPLIER_USER', email: 'export@deltaglobal.com', supplierId: 's-delta' },
  { id: 'u-sup-eastline', name: 'Sourav Das', designation: 'Sales Engineer', team: 'SUPPLIER', role: 'SUPPLIER_USER', email: 'rfq@eastline.co.in', supplierId: 's-eastline' },
  { id: 'u-sup-fortune', name: 'K. Natarajan', designation: 'Business Head', team: 'SUPPLIER', role: 'SUPPLIER_USER', email: 'quotes@fortunegrid.in', supplierId: 's-fortune' },
];

export const ITEMS = [
  { id: 'i-bushing', internalPartNo: 'WE-ELE-13208', name: '132 kV Transformer Bushing Set', category: 'Electrical / HV', uom: 'SET', hsnCode: '8546', description: 'OIP condenser bushing, 132 kV, 800 A, porcelain housing, IEC 60137' },
  { id: 'i-lugs', internalPartNo: 'WE-ELE-10442', name: 'Copper Cable Lugs 630 sq mm', category: 'Electrical / LV', uom: 'NOS', hsnCode: '8536', description: 'Tinned copper crimp lugs, long barrel' },
  { id: 'i-turbine', internalPartNo: 'WE-MEC-20871', name: 'Gas Turbine Combustion Liner Kit', category: 'Mechanical / Rotating', uom: 'KIT', hsnCode: '8411', description: 'OEM combustion liner with transition pieces' },
  { id: 'i-relay', internalPartNo: 'WE-ELE-11730', name: 'Numerical Protection Relay', category: 'Electrical / Protection', uom: 'NOS', hsnCode: '8536', description: 'Feeder protection relay, IEC 61850' },
  { id: 'i-ct', internalPartNo: 'WE-ELE-12115', name: '132 kV Current Transformer', category: 'Electrical / HV', uom: 'NOS', hsnCode: '8504', description: 'Oil-filled CT, 0.2S class' },
  { id: 'i-valve', internalPartNo: 'WE-MEC-21590', name: 'High Pressure Gate Valve 8"', category: 'Mechanical / Piping', uom: 'NOS', hsnCode: '8481', description: 'Class 1500, ASTM A216 WCB' },
];

export const PAYMENT_TERM_TEMPLATES = [
  { id: 'pt-20-80', name: '20% advance vs ABG, 80% within 30 days of MRN', lines: [{ type: 'ADVANCE', percent: 20, trigger: 'AGAINST_ABG' }, { type: 'BALANCE', percent: 80, trigger: 'AFTER_MRN', dueDays: 30 }] },
  { id: 'pt-100-mrn', name: '100% within 30 days of MRN', lines: [{ type: 'BALANCE', percent: 100, trigger: 'AFTER_MRN', dueDays: 30 }] },
  { id: 'pt-lc', name: '90% against shipping docs via LC, 10% after MRN', lines: [{ type: 'AGAINST_DOCUMENTS', percent: 90, trigger: 'AGAINST_SHIPPING_DOCS' }, { type: 'RETENTION', percent: 10, trigger: 'AFTER_MRN', dueDays: 30 }] },
];

export const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];

export const STANDARD_TNC = `1. Prices are firm till complete execution of the order.
2. Supply shall conform to the technical specification and approved drawings.
3. Liquidated damages: 0.5% per week of delay, max 10% of order value.
4. Warranty: 18 months from supply or 12 months from commissioning, whichever is earlier.
5. Performance Bank Guarantee of 10% valid for warranty period plus 3 months.
6. Inspection by Westfield Energy or its nominated third party before dispatch.
7. Jurisdiction: Courts of Ahmedabad, Gujarat.`;

export const MGMT_THRESHOLD = 1000000; // ₹10 lakh

// Read-only workflow configuration (WorkflowStep table)
export const WORKFLOW_CONFIG = [
  { docType: 'PR', step: 1, name: 'Engineering review', role: 'ENG_REVIEWER', minAmount: null, canSkip: false },
  { docType: 'PR', step: 2, name: 'Engineering approval', role: 'ENG_APPROVER', minAmount: null, canSkip: false },
  { docType: 'PR', step: 3, name: 'Management approval', role: 'MGMT_APPROVER', minAmount: MGMT_THRESHOLD, canSkip: false },
  { docType: 'PR', step: 4, name: 'Assign buyer', role: 'CP_LEAD', minAmount: null, canSkip: false },
  { docType: 'TBE', step: 1, name: 'Internal technical evaluation', role: 'ENG_APPROVER', minAmount: null, canSkip: false },
  { docType: 'TBE', step: 2, name: 'Third-party technical evaluation', role: 'TECH_INSPECTOR', minAmount: null, canSkip: false },
  { docType: 'TBE', step: 3, name: 'TBE approval', role: 'MGMT_APPROVER', minAmount: null, canSkip: false },
  { docType: 'QCS', step: 1, name: 'QCS approval', role: 'CP_LEAD', minAmount: null, canSkip: false },
  { docType: 'PO', step: 1, name: 'Finance review (budget)', role: 'FIN_REVIEWER', minAmount: null, canSkip: false },
  { docType: 'PO', step: 2, name: 'Finance approval', role: 'FIN_APPROVER', minAmount: null, canSkip: false },
  { docType: 'PAYMENT', step: 1, name: 'Payment review', role: 'FIN_REVIEWER', minAmount: null, canSkip: false },
  { docType: 'PAYMENT', step: 2, name: 'Payment release', role: 'FIN_APPROVER', minAmount: null, canSkip: false },
  { docType: 'MRN', step: 1, name: 'MRN preparation', role: 'STORES_PREPARER', minAmount: null, canSkip: false },
  { docType: 'MRN', step: 2, name: 'MRN review', role: 'STORES_REVIEWER', minAmount: null, canSkip: true },
  { docType: 'MRN', step: 3, name: 'MRN approval', role: 'STORES_APPROVER', minAmount: null, canSkip: false },
];

export const userById = (id) => USERS.find((u) => u.id === id);
export const supplierById = (id) => SUPPLIERS.find((s) => s.id === id);
export const itemById = (id) => ITEMS.find((i) => i.id === id);
export const partnerById = (id) => LOGISTICS_PARTNERS.find((p) => p.id === id);
export const customerById = (id) => CUSTOMERS.find((c) => c.id === id);
export const termById = (id) => PAYMENT_TERM_TEMPLATES.find((t) => t.id === id);
