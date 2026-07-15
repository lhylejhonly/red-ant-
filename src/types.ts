/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// User roles in the enterprise POS system
export type UserRole = 'Super Admin' | 'Admin' | 'Cashier' | 'Inventory Manager' | 'Accountant';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  pin: string;
  avatarUrl: string;
  is2FAEnabled?: boolean;
}

// Product Interface
export interface Product {
  id: string;
  sku: string;
  barcode: string;
  qrCode: string;
  name: string;
  description?: string;
  categoryId: string;
  brand: string;
  supplierId: string;
  cost: number;
  sellingPrice: number;
  wholesalePrice: number;
  taxRate: number; // percentage, e.g. 12 for 12%
  discountRate: number; // percentage discount
  expirationDate?: string;
  serialNumbers?: string[];
  warranty?: string; // e.g. "1 Year"
  stock: number;
  minStockAlert: number;
  isArchived: boolean;
  variants: {
    color?: string[];
    size?: string[];
    weight?: string[];
  };
  image: string;
  isDigital?: boolean;
  isCombo?: boolean;
  isEssential?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  outstandingBalance: number;
  paymentHistory: Array<{
    date: string;
    amount: number;
    reference: string;
  }>;
  documents: Array<{
    name: string;
    url: string;
    uploadedAt: string;
  }>;
}

// Order & Payment
export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  selectedWeight?: string;
  customDiscount?: number; // absolute dollar or percentage
}

export interface PaymentSplit {
  method: 'Cash' | 'Credit Card' | 'Debit Card' | 'GCash' | 'Maya' | 'Bank Transfer' | 'QR Payment';
  amount: number;
  reference?: string;
}

export interface Order {
  id: string;
  receiptNumber: string;
  timestamp: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    sellingPrice: number;
    cost: number;
    taxPaid: number;
    discountApplied: number;
    variantInfo?: string;
  }>;
  subtotal: number;
  taxTotal: number;
  serviceCharge: number;
  discountTotal: number;
  grandTotal: number;
  payments: PaymentSplit[];
  amountPaid: number;
  changeAmount: number;
  status: 'Completed' | 'Refunded' | 'Exchanged' | 'Voided';
  notes?: string;
  refundReason?: string;
  exchangeDetails?: string;
}

export interface HeldTransaction {
  id: string;
  timestamp: string;
  items: CartItem[];
  notes?: string;
  cashierName: string;
}

// Employee & Shift
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  attendance: 'Present' | 'Absent' | 'Late' | 'Off-Duty';
  lastClockIn?: string;
  lastClockOut?: string;
  monthlySalary: number;
  performanceScore: number; // 0 - 100
}

export interface ShiftLog {
  id: string;
  employeeId: string;
  employeeName: string;
  clockInTime: string;
  clockOutTime?: string;
  startingCash: number;
  endingCash?: number;
  actualEndingCash?: number;
  notes?: string;
}

// Utang / Credit
export interface CreditRecord {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  dateCreated: string;
  dueDate?: string;
  status: 'Unpaid' | 'Partial' | 'Paid';
  notes?: string;
  payments: Array<{
    date: string;
    amount: number;
  }>;
}

// Accounting
export interface Expense {
  id: string;
  category: 'Rent' | 'Utilities' | 'Inventory Purchase' | 'Marketing' | 'Payroll' | 'Damaged Goods' | 'Other';
  description: string;
  amount: number;
  date: string;
  paymentMethod: string;
  receiptUrl?: string;
}

// System configuration
export interface SystemSettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number;
  serviceChargeRate: number;
  currency: string; // e.g. "₱", "$", "€"
  timezone: string;
  language: string;
  storeLogoUrl: string;
  receiptLogoUrl: string;
  receiptFooter: string;
  enableSMS: boolean;
  enableEmail: boolean;
  enable2FA: boolean;
  printerIp: string;
  barcodeFormat: string;
}

// System Alert / Notification
export interface SystemNotification {
  id: string;
  type: 'Low Stock' | 'Out of Stock' | 'Return Request' | 'Supplier Delivery' | 'System Alert';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

// Audit / Activity log
export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string; // e.g. "Void Sale", "Delete Product", "Clock In"
  details: string;
  ipAddress: string;
}

// Simulated sent emails in system outbox
export interface SentEmail {
  id: string;
  to: string;
  subject: string;
  body: string; // HTML formatted string
  timestamp: string;
  type: 'Low Stock Summary' | 'System Report' | 'Security Alert';
  recipientName: string;
  recipientRole: string;
  isSimulated: boolean;
}

