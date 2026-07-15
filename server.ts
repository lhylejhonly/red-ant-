/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { 
  Product, Category, Supplier, Order, HeldTransaction, 
  Employee, ShiftLog, Expense, SystemSettings, SystemNotification, AuditLog, User,
  PaymentSplit, UserRole, SentEmail
} from './src/types';

const app = express();

// ------------------------------
// Simple role enforcement (mock)
// ------------------------------
// Frontend uses mock token. We enforce roles server-side using request headers.
// Header contract (set by frontend):
// - x-user-role: one of UserRole strings
// - x-user-id: user id
// If headers are missing, user is treated as 'Cashier' (least privilege).
const getRoleFromReq = (req: express.Request): UserRole => {
  // Frontend sends these after login. Since this app uses a mock token,
  // we rely on role header for demo purposes.

  const raw = (req.headers['x-user-role'] as string | undefined) || '';
  const normalized = raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  const toCanonical = (r: string): UserRole => {
    switch (r.replace(/\s+/g, '')) {
      case 'superadmin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'cashier':
        return 'Cashier';
      case 'inventorymanager':
        return 'Inventory Manager';
      case 'accountant':
        return 'Accountant';
      default:
        return 'Cashier';
    }
  };

  return toCanonical(normalized);
};

const requireRoles = (roles: UserRole[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const role = getRoleFromReq(req);
    if (!roles.includes(role)) {
      return res.status(403).json({ error: `Forbidden. Requires roles: ${roles.join(', ')}` });
    }
    next();
  };
};

const PORT = parseInt(process.env.PORT || '3000', 10);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Supabase client (optional)
// This server has a JSON-file DB fallback, so we must not hard-crash
// when Supabase environment variables are not provided.
const hasSupabaseEnv =
  typeof process.env.SUPABASE_URL === 'string' && process.env.SUPABASE_URL.trim().length > 0 &&
  typeof process.env.SUPABASE_SERVICE_ROLE_KEY === 'string' && process.env.SUPABASE_SERVICE_ROLE_KEY.trim().length > 0;

const supabase = hasSupabaseEnv
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  : (null as any);



// Path to persistent DB file (fallback)
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'pos_db.json');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

// Initial seed data - minimal Super Admin only
const initialSeed = {
  users: [
    { id: 'usr_1', name: 'Super Admin', email: 'admin@redantstore.com', role: 'Super Admin', pin: '0000', avatarUrl: '', is2FAEnabled: false }
  ] as User[],

  categories: [] as Category[],

  suppliers: [] as Supplier[],

  products: [] as Product[],
  orders: [] as Order[],
  heldTransactions: [] as HeldTransaction[],
  expenses: [] as Expense[],
  settings: {
    companyName: 'Red Ant Store',
    address: '88 Earth Tone Boulevard, Design District, Manila',
    phone: '+63 2 8123 4567',
    email: 'hello@terracottacafe.com',
    taxRate: 12,
    serviceChargeRate: 5,
    currency: '₱',
    timezone: 'Asia/Manila',
    language: 'English',
    storeLogoUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100',
    receiptLogoUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100',
    receiptFooter: 'Thank you for supporting sustainable design and single-origin craft.',
    enableSMS: true,
    enableEmail: true,
    enable2FA: false,
    printerIp: '192.168.1.250',
    barcodeFormat: 'EAN-13'
  } as SystemSettings,

  notifications: [] as SystemNotification[],

  auditLogs: [] as AuditLog[],

  employees: [] as Employee[],

  shiftLogs: [] as ShiftLog[],

  creditRecords: [] as any[]
};

// Populate initial order records so that analytics graphs are immediately populated and beautiful
const generateHistoricalOrders = () => {

  const orders: Order[] = [];
  const startDaysAgo = 30;
  const current_time = new Date('2026-06-27T01:02:42-07:00'); // set by prompt

  for (let i = startDaysAgo; i >= 0; i--) {
    const targetDate = new Date(current_time.getTime());
    targetDate.setDate(targetDate.getDate() - i);
    // Set a random business hour
    targetDate.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

    // Calculate number of orders for this day (weekday vs weekend)
    const dayOfWeek = targetDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const orderCount = isWeekend ? 3 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 3);

    for (let j = 0; j < orderCount; j++) {
      const orderHour = new Date(targetDate.getTime());
      orderHour.setHours(orderHour.getHours() + j);

      // Randomly select 1 to 3 items
      const selectedItems: any[] = [];
      const itemConfigs = [
        { id: 'prod_1', name: 'Andean Single-Origin Coffee Beans', price: 28.00, cost: 14.50, tax: 12, disc: 5, sku: 'COF-AND-500' },
        { id: 'prod_2', name: 'Terracotta Matte Glaze Ceramic Mug', price: 19.50, cost: 8.00, tax: 12, disc: 0, sku: 'STN-CRT-001' },
        { id: 'prod_3', name: 'Barista Linen Cross-Back Apron', price: 42.00, cost: 18.00, tax: 12, disc: 10, sku: 'LIN-BAR-APR' },
        { id: 'prod_5', name: 'Dark Chocolate Cascara Truffles', price: 12.00, cost: 4.50, tax: 5, disc: 0, sku: 'SWE-DRK-TRF' },
        { id: 'prod_6', name: 'Ceramic Pour-Over Cone Dripper', price: 24.50, cost: 11.00, tax: 12, disc: 0, sku: 'STN-PO-DRP' }
      ];

      const itemCount = 1 + Math.floor(Math.random() * 3);
      let subtotal = 0;
      let taxTotal = 0;
      let discountTotal = 0;

      // Ensure we don't repeat items in the same order
      const shuffled = [...itemConfigs].sort(() => 0.5 - Math.random());
      for (let k = 0; k < itemCount; k++) {
        const item = shuffled[k];
        const qty = 1 + Math.floor(Math.random() * 2);
        const lineDiscount = Math.round(item.price * (item.disc / 100) * qty * 100) / 100;
        const baseLineAmount = (item.price * qty) - lineDiscount;
        const lineTax = Math.round(baseLineAmount * (item.tax / 100) * 100) / 100;

        selectedItems.push({
          productId: item.id,
          name: item.name,
          sku: item.sku,
          quantity: qty,
          sellingPrice: item.price,
          cost: item.cost,
          taxPaid: lineTax,
          discountApplied: lineDiscount,
          variantInfo: 'Standard'
        });

        subtotal += item.price * qty;
        discountTotal += lineDiscount;
        taxTotal += lineTax;
      }

      const serviceCharge = Math.round(subtotal * 0.05 * 100) / 100;
      const grandTotal = subtotal - discountTotal + taxTotal + serviceCharge;

      // Select payment methods
      const methods: ('Cash' | 'Credit Card' | 'Debit Card' | 'GCash' | 'Maya' | 'Bank Transfer' | 'QR Payment')[] = 
        ['Cash', 'Credit Card', 'GCash', 'Maya', 'Debit Card'];
      const primaryMethod = methods[Math.floor(Math.random() * methods.length)];
      const payments: PaymentSplit[] = [{ method: primaryMethod, amount: grandTotal }];

      const receiptId = 100000 + orders.length + 1;

      orders.push({
        id: `ord_${orders.length + 1}`,
        receiptNumber: `TR-${receiptId}`,
        timestamp: orderHour.toISOString(),
        cashierId: 'usr_3',
        cashierName: 'Elena Rostova',
        branchId: 'BR-01',
        items: selectedItems,
        subtotal: Math.round(subtotal * 100) / 100,
        taxTotal: Math.round(taxTotal * 100) / 100,
        serviceCharge,
        discountTotal: Math.round(discountTotal * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        payments,
        amountPaid: Math.ceil(grandTotal / 5) * 5, // Cash rounded up
        changeAmount: Math.round((Math.ceil(grandTotal / 5) * 5 - grandTotal) * 100) / 100,
        status: (i === 1 && j === 0) ? 'Voided' : 'Completed' // Mock one voided sale
      });
    }
  }
  return orders;
};

// Read Database
const readDB = () => {
  try {
    let db: any;
    if (fs.existsSync(DB_PATH)) {
      const rawData = fs.readFileSync(DB_PATH, 'utf8');
      db = JSON.parse(rawData);
    } else {
      // If db file doesn't exist, generate empty seed
      db = { ...initialSeed };
      db.orders = [];
      db.sentEmails = [];
    }

    // Ensure database migration integrity for sent simulated emails
    if (!db.sentEmails) {
      db.sentEmails = [];
    }

    // Ensure orders exist
    if (!db.orders) {
      db.orders = [];
    }

    // Ensure creditRecords exists
    if (!db.creditRecords) {
      db.creditRecords = [];
    }

    // Ensure isEssential is initialized on seeded products
    if (db.products) {
      db.products.forEach((p: any) => {
        if (p.isEssential === undefined) {
          p.isEssential = false;
        }
      });
    }

    // Write back any migration corrections
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    return db;
  } catch (err) {
    console.error('Error reading/seeding file-based JSON DB:', err);
    return { ...initialSeed, orders: [], sentEmails: [] };
  };
};

// Write Database
const writeDB = (data: any) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to file-based JSON DB:', err);
  }
};

// Initialize DB structure
let dbState = readDB();

// --------------------------------------------------
// AUTOMATED EMAIL NOTIFICATION SYSTEM FOR LOW STOCK
// --------------------------------------------------
const triggerLowStockEmailIfNeeded = (product: Product, oldStock: number, newStock: number) => {
  // Trigger only if marked as essential, and current stock is at or below the minimum stock alert, and old stock was above threshold (or undefined/first check)
  if (product.isEssential && newStock <= product.minStockAlert && (oldStock === undefined || oldStock > product.minStockAlert)) {
    try {
      const supplier = dbState.suppliers.find((s: Supplier) => s.id === product.supplierId) || {
        name: 'General Stock Supplier',
        contactName: 'N/A',
        email: 'replenishment@terracottapos.com',
        phone: 'N/A',
        address: 'N/A'
      };

      // Gather other essential low-stock items for the summary table
      const otherLowStockEssentials = dbState.products.filter((p: Product) => 
        !p.isArchived && p.isEssential && p.stock <= p.minStockAlert && p.id !== product.id
      );

      const emailId = `eml_${Date.now()}`;
      const subject = `⚠️ LOW STOCK ALERT (ESSENTIAL ITEM): ${product.name} [${product.sku}]`;

      // Build a premium HTML template using modern Earth Tone styling
      const htmlBody = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; background-color: #fafaf9; color: #1c1917; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
          <!-- Earth Tone Terracotta Header -->
          <div style="background: linear-gradient(135deg, #78350f, #9a3412); padding: 32px 24px; text-align: center; color: #ffffff;">
            <div style="font-size: 36px; margin-bottom: 10px;">⚠️</div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #fde047;">
              Priority Stock Warning
            </h1>
            <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9; color: #f5f5f4;">
              Enterprise Automated Inventory Notification
            </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 24px; background-color: #fafaf9;">
            <p style="margin-top: 0; font-size: 14px; line-height: 1.6; color: #44403c;">
              Attention <strong>Marcus Vance</strong> (Inventory Manager),
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #44403c;">
              This automated system report has been generated because stock levels for the high-priority <strong>essential item</strong> listed below have fallen below your safety alert threshold of <strong>${product.minStockAlert} units</strong>.
            </p>

            <!-- Focus Product Alert Box -->
            <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-left: 6px solid #b45309; border-radius: 12px; padding: 20px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 8px 0; color: #78716c; font-weight: 600; width: 140px;">Essential Product</td>
                  <td style="padding: 8px 0; color: #1c1917; font-weight: 800; font-size: 14px;">${product.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #78716c; font-weight: 600;">SKU Identifier</td>
                  <td style="padding: 8px 0; color: #78350f; font-family: monospace; font-weight: bold;">${product.sku}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #78716c; font-weight: 600;">Barcode</td>
                  <td style="padding: 8px 0; color: #44403c; font-family: monospace;">${product.barcode}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #78716c; font-weight: 600;">Current Stock Level</td>
                  <td style="padding: 8px 0; color: #dc2626; font-weight: 900; font-size: 16px; font-family: monospace;">
                    ${newStock} units
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #78716c; font-weight: 600;">Defined Threshold</td>
                  <td style="padding: 8px 0; color: #1c1917; font-weight: 600; font-family: monospace;">${product.minStockAlert} units</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #78716c; font-weight: 600;">Primary Supplier</td>
                  <td style="padding: 8px 0; color: #1c1917; line-height: 1.4;">
                    <strong>${supplier.name}</strong><br/>
                    <span style="font-size: 11px; color: #78716c;">Contact: ${supplier.contactName} • ${supplier.email}</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Other Low Stock Essential Items Summary Table -->
            <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #78350f; margin: 32px 0 12px; border-bottom: 2px solid #e7e5e4; padding-bottom: 6px;">
              Summary Report: Other Essential Low Stock Items
            </h3>
            ${
              otherLowStockEssentials.length > 0
                ? `
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.01);">
                  <thead>
                    <tr style="background-color: #f5f5f4; border-bottom: 1px solid #e7e5e4; color: #78716c; font-weight: 700;">
                      <th style="padding: 10px 12px;">Item Name</th>
                      <th style="padding: 10px 12px;">SKU</th>
                      <th style="padding: 10px 12px; text-align: right;">Current Stock</th>
                      <th style="padding: 10px 12px; text-align: right;">Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${otherLowStockEssentials.map((item: Product) => `
                      <tr style="border-bottom: 1px solid #f5f5f4;">
                        <td style="padding: 10px 12px; font-weight: 600; color: #1c1917;">${item.name}</td>
                        <td style="padding: 10px 12px; font-family: monospace; color: #78716c;">${item.sku}</td>
                        <td style="padding: 10px 12px; text-align: right; font-weight: 800; font-family: monospace; color: ${item.stock === 0 ? '#dc2626' : '#d97706'};">${item.stock} units</td>
                        <td style="padding: 10px 12px; text-align: right; color: #78716c; font-family: monospace;">${item.minStockAlert}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `
                : `<p style="font-size: 12px; color: #78716c; font-style: italic; margin: 8px 0;">No other essential items are currently flagged as low-stock.</p>`
            }

            <!-- CTA Replenishment Link -->
            <div style="text-align: center; margin: 36px 0 12px;">
              <a href="${process.env.APP_URL || 'https://ais-pre-nhpatb756yl46y6xhuhy26-8001516506.asia-east1.run.app'}" style="background-color: #78350f; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: bold; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(120, 53, 15, 0.2), 0 2px 4px -1px rgba(120, 53, 15, 0.1);">
                Review Stock & Dispatch Reorder
              </a>
            </div>
          </div>

          <!-- Professional Footer -->
          <div style="background-color: #f5f5f4; border-top: 1px solid #e7e5e4; padding: 20px; text-align: center; font-size: 11px; color: #78716c; line-height: 1.5;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #44403c;">Red Ant Store - Automated Replenishment Dispatcher</p>
            <p style="margin: 0;">Sent To: <strong>marcus@terracotta.com</strong> (Inventory Manager)</p>
            <p style="margin: 4px 0 0; font-size: 9px; color: #a8a29e;">This is an automated system notification. Replies to this address are not monitored.</p>
          </div>
        </div>
      `;

      const emailReport: SentEmail = {
        id: emailId,
        to: 'marcus@terracotta.com',
        subject,
        body: htmlBody,
        timestamp: new Date().toISOString(),
        type: 'Low Stock Summary',
        recipientName: 'Marcus Vance',
        recipientRole: 'Inventory Manager',
        isSimulated: true
      };

      if (!dbState.sentEmails) {
        dbState.sentEmails = [];
      }
      dbState.sentEmails.unshift(emailReport);

      // Save database state
      writeDB(dbState);
    } catch (e) {
      console.error('Error generating automated stock email summary report:', e);
    }
  }
};

// --------------------------------------------------
// REST API ENDPOINTS
// --------------------------------------------------

// LOG HELPER
const addAuditLog = (userId: string, userName: string, role: UserRole, action: string, details: string, req: express.Request) => {
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const newLog: AuditLog = {
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    userRole: role,
    action,
    details,
    ipAddress
  };
  dbState.auditLogs.unshift(newLog);
  writeDB(dbState);
};

// Auth
app.post('/api/auth/login', async (req, res) => {
  const { email, pin } = req.body;
  
  // Try Supabase first
  try {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('pin', pin)
      .single();


    if (!error && data) {
      addAuditLog(data.id, data.name, data.role, 'Login', 'Successful PIN login.', req);
      return res.json({
        token: 'mock-jwt-token-xyz-123456789',
        user: {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          avatarUrl: data.avatar_url || '',
          is2FAEnabled: data.is_2fa_enabled || false
        }
      });
    }
  } catch {}

  // Fallback to local JSON DB
  const localUser = dbState.users.find((u: User) => u.email === email && u.pin === pin);
  if (!localUser) {
    return res.status(401).json({ error: 'Invalid Email or Security PIN.' });
  }
  addAuditLog(localUser.id, localUser.name, localUser.role, 'Login', 'Successful PIN login.', req);
  return res.json({
    token: 'mock-jwt-token-xyz-123456789',
    user: {
      id: localUser.id,
      name: localUser.name,
      email: localUser.email,
      role: localUser.role,
      avatarUrl: localUser.avatarUrl || '',
      is2FAEnabled: localUser.is2FAEnabled || false
    }
  });
});

app.get('/api/auth/users', requireRoles(['Super Admin','Admin','Cashier','Inventory Manager','Accountant']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, avatar_url, is_2fa_enabled');
    if (error) throw error;
    return res.json(data.map((u: any) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      avatarUrl: u.avatar_url || '', is2FAEnabled: u.is_2fa_enabled || false
    })));
  } catch {
    // Fallback to local JSON DB
    return res.json(dbState.users.map((u: User) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      avatarUrl: u.avatarUrl || '', is2FAEnabled: u.is2FAEnabled || false
    })));
  }
});

// Products
app.get('/api/products', (req, res) => {
  res.json(dbState.products.filter((p: Product) => !p.isArchived));
});

app.post('/api/products', requireRoles(['Super Admin', 'Admin']), (req, res) => {
  const safeBarcode = req.body.barcode || `BC_${Date.now()}`;
  const safeCategoryId = req.body.categoryId || '';
  const safeSupplierId = req.body.supplierId || '';
  const safeImage = req.body.image || '';

  const safeStock = typeof req.body.stock === 'number' ? req.body.stock : (parseInt(req.body.stock) || 0);
  const safeMinStockAlert = typeof req.body.minStockAlert === 'number' ? req.body.minStockAlert : (parseInt(req.body.minStockAlert) || 0);
  const safeCost = typeof req.body.cost === 'number' ? req.body.cost : (parseFloat(req.body.cost) || 0);
  const safeSellingPrice = typeof req.body.sellingPrice === 'number' ? req.body.sellingPrice : (parseFloat(req.body.sellingPrice) || 0);
  const safeWholesalePrice = typeof req.body.wholesalePrice === 'number' ? req.body.wholesalePrice : (parseFloat(req.body.wholesalePrice) || 0);

  // Normalize fields that the UI expects to be valid numbers
  const safeDiscountRate = typeof req.body.discountRate === 'number'
    ? req.body.discountRate
    : (parseFloat(req.body.discountRate) || 0);

  const safeTaxRate = typeof req.body.taxRate === 'number'
    ? req.body.taxRate
    : (parseFloat(req.body.taxRate) || 0);

  // Ensure consistent variants shape: { color: string[]; size: string[] }
  const rawVariants = req.body.variants || {};
  const safeVariants = {
    color: Array.isArray(rawVariants?.color) ? rawVariants.color : [],
    size: Array.isArray(rawVariants?.size) ? rawVariants.size : []
  };

  const safeBrand = typeof req.body.brand === 'string' ? req.body.brand : '';
  const safeWarranty = typeof req.body.warranty === 'string' ? req.body.warranty : 'N/A';

  // Optional perishable support
  const safeExpirationDate = typeof req.body.expirationDate === 'string' ? req.body.expirationDate : undefined;

  const newProduct: Product = {
    ...req.body,
    id: `prod_${Date.now()}`,
    isArchived: false, // hard guarantee so it always shows in GET /api/products
    categoryId: safeCategoryId,
    supplierId: safeSupplierId,
    barcode: safeBarcode,
    image: safeImage,
    stock: safeStock,
    minStockAlert: safeMinStockAlert,
    cost: safeCost,
    sellingPrice: safeSellingPrice,
    wholesalePrice: safeWholesalePrice,

    discountRate: safeDiscountRate,
    taxRate: safeTaxRate,

    brand: safeBrand,
    warranty: safeWarranty,
    expirationDate: safeExpirationDate as any,

    variants: safeVariants,
    qrCode: `QR_${safeBarcode}`,
    isEssential: req.body.isEssential === true,
    isDigital: req.body.isDigital === true
  };


  dbState.products.push(newProduct);
  writeDB(dbState);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', requireRoles(['Super Admin', 'Admin']), (req, res) => {
  const { id } = req.params;
  const idx = dbState.products.findIndex((p: Product) => p.id === id);
  if (idx !== -1) {
    const oldProduct = dbState.products[idx];
    const oldStock = oldProduct.stock;
    dbState.products[idx] = { ...oldProduct, ...req.body };
    writeDB(dbState);
    
    // Trigger automated priority low-stock email report
    triggerLowStockEmailIfNeeded(dbState.products[idx], oldStock, dbState.products[idx].stock);
    
    res.json(dbState.products[idx]);
  } else {
    res.status(404).json({ error: 'Product not found.' });
  }
});

app.delete('/api/products/:id', requireRoles(['Super Admin', 'Admin']), (req, res) => {
  const { id } = req.params;
  const idx = dbState.products.findIndex((p: Product) => p.id === id);
  if (idx !== -1) {
    dbState.products.splice(idx, 1);
    writeDB(dbState);
    res.json({ success: true, message: 'Product deleted successfully.' });
  } else {
    res.status(404).json({ error: 'Product not found.' });
  }
});

// Credit / Utang Records
app.get('/api/credits', (req, res) => {
  res.json(dbState.creditRecords || []);
});

app.post('/api/credits', requireRoles(['Super Admin', 'Admin', 'Cashier']), (req, res) => {
  if (!dbState.creditRecords) dbState.creditRecords = [];
  const record = {
    ...req.body,
    id: `crd_${Date.now()}`,
    dateCreated: new Date().toISOString()
  };
  dbState.creditRecords.unshift(record);
  writeDB(dbState);
  res.status(201).json(record);
});

app.post('/api/credits/:id/payment', requireRoles(['Super Admin', 'Admin', 'Cashier']), (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (!dbState.creditRecords) return res.status(404).json({ error: 'No records.' });
  const idx = dbState.creditRecords.findIndex((r: any) => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Record not found.' });
  const record = dbState.creditRecords[idx];
  record.payments = record.payments || [];
  record.payments.push({ date: new Date().toISOString(), amount });
  record.amountPaid = (record.amountPaid || 0) + amount;
  record.balance = record.totalAmount - record.amountPaid;
  record.status = record.balance <= 0 ? 'Paid' : record.amountPaid > 0 ? 'Partial' : 'Unpaid';
  writeDB(dbState);
  res.json(record);
});

// Categories
app.get('/api/categories', (req, res) => {
  res.json(dbState.categories);
});

app.post('/api/categories', requireRoles(['Super Admin', 'Admin']), (req, res) => {
  const newCat: Category = {
    id: `cat_${Date.now()}`,
    name: req.body.name,
    description: req.body.description
  };
  dbState.categories.push(newCat);
  writeDB(dbState);
  res.status(201).json(newCat);
});

// Orders (Sales)
app.get('/api/orders', (req, res) => {
  res.json(dbState.orders);
});

app.post('/api/orders', requireRoles(['Super Admin', 'Admin', 'Cashier', 'Inventory Manager', 'Accountant']), (req, res) => {
  const { items, subtotal, taxTotal, serviceCharge, discountTotal, grandTotal, payments, amountPaid, changeAmount, notes, cashierId, cashierName } = req.body;
  
  // Deduct inventory stock
  items.forEach((item: any) => {
    const prod = dbState.products.find((p: Product) => p.id === item.productId);
    if (prod) {
      const oldStock = prod.stock;
      prod.stock = Math.max(0, prod.stock - item.quantity);
      // Trigger out-of-stock or low-stock alerts
      if (prod.stock === 0) {
        dbState.notifications.unshift({
          id: `ntf_${Date.now()}_oos`,
          type: 'Out of Stock',
          title: `Out of Stock: ${prod.name}`,
          message: `${prod.name} has completely run out of stock.`,
          timestamp: new Date().toISOString(),
          isRead: false
        });
      } else if (prod.stock <= prod.minStockAlert) {
        dbState.notifications.unshift({
          id: `ntf_${Date.now()}_low`,
          type: 'Low Stock',
          title: `Low Stock: ${prod.name}`,
          message: `${prod.name} stock level is down to ${prod.stock} units.`,
          timestamp: new Date().toISOString(),
          isRead: false
        });
      }
      // Trigger automated priority low-stock email report to Marcus Vance
      triggerLowStockEmailIfNeeded(prod, oldStock, prod.stock);
    }
  });

  const receiptId = 100000 + dbState.orders.length + 1;
  const newOrder: Order = {
    id: `ord_${Date.now()}`,
    receiptNumber: `TR-${receiptId}`,
    timestamp: new Date().toISOString(),
    cashierId: cashierId || 'usr_3',
    cashierName: cashierName || 'Elena Rostova',
    branchId: 'BR-01',
    items,
    subtotal,
    taxTotal,
    serviceCharge,
    discountTotal,
    grandTotal,
    payments,
    amountPaid,
    changeAmount,
    status: 'Completed',
    notes
  };

  dbState.orders.unshift(newOrder);
  addAuditLog(cashierId || 'usr_3', cashierName || 'Elena Rostova', 'Cashier', 'Create Order', `Recorded sale ${newOrder.receiptNumber} total ${dbState.settings.currency}${newOrder.grandTotal}`, req);
  writeDB(dbState);
  res.status(201).json(newOrder);
});

// Refund / Void order
app.put('/api/orders/:id/status', requireRoles(['Super Admin', 'Admin']), (req, res) => {
  const { id } = req.params;
  const { status, refundReason, cashierId, cashierName, role } = req.body;
  const idx = dbState.orders.findIndex((o: Order) => o.id === id);
  if (idx !== -1) {
    const order = dbState.orders[idx];
    order.status = status;
    if (refundReason) order.refundReason = refundReason;

    // Put items back into stock if voided or refunded
    if (status === 'Voided' || status === 'Refunded') {
      order.items.forEach((item: any) => {
        const prod = dbState.products.find((p: Product) => p.id === item.productId);
        if (prod) {
          prod.stock += item.quantity;
        }
      });
    }

    addAuditLog(
      cashierId || req.headers['x-user-id'] as string || 'usr_1', 
      cashierName || 'Super Admin', 
      role || 'Super Admin', 
      status, 
      `Order ${order.receiptNumber} set to ${status}. Reason: ${refundReason || 'N/A'}`, 
      req
    );
    writeDB(dbState);
    res.json(order);
  } else {
    res.status(404).json({ error: 'Order not found.' });
  }
});

// Archived Products - Super Admin view
app.get('/api/products/archived', requireRoles(['Super Admin', 'Admin']), (req, res) => {
  res.json(dbState.products.filter((p: Product) => p.isArchived));
});

// Restore archived product
app.put('/api/products/:id/restore', requireRoles(['Super Admin', 'Admin']), (req, res) => {
  const { id } = req.params;
  const idx = dbState.products.findIndex((p: Product) => p.id === id);
  if (idx !== -1) {
    dbState.products[idx].isArchived = false;
    writeDB(dbState);
    addAuditLog(req.headers['x-user-id'] as string, 'Super Admin', 'Super Admin', 'Restore Product', `Restored ${dbState.products[idx].name}`, req);
    res.json(dbState.products[idx]);
  } else {
    res.status(404).json({ error: 'Product not found.' });
  }
});

// Held Transactions (Hold / Resume)
app.get('/api/held-transactions', (req, res) => {
  res.json(dbState.heldTransactions);
});

app.post('/api/held-transactions', requireRoles(['Super Admin','Admin','Cashier','Inventory Manager','Accountant']), (req, res) => {
  const newHold: HeldTransaction = {
    id: `hold_${Date.now()}`,
    timestamp: new Date().toISOString(),
    items: req.body.items,
    notes: req.body.notes,
    cashierName: req.body.cashierName || 'Elena Rostova'
  };
  dbState.heldTransactions.push(newHold);
  writeDB(dbState);
  res.status(201).json(newHold);
});

app.delete('/api/held-transactions/:id', requireRoles(['Super Admin','Admin','Cashier']), (req, res) => {
  const { id } = req.params;
  dbState.heldTransactions = dbState.heldTransactions.filter((h: HeldTransaction) => h.id !== id);
  writeDB(dbState);
  res.json({ success: true });
});

// Suppliers
app.get('/api/suppliers', (req, res) => {
  res.json(dbState.suppliers);
});

app.post('/api/suppliers', requireRoles(['Super Admin','Admin']), (req, res) => {
  const newSup: Supplier = {
    id: `sup_${Date.now()}`,
    name: req.body.name,
    contactName: req.body.contactName,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    outstandingBalance: req.body.outstandingBalance || 0,
    paymentHistory: [],
    documents: []
  };
  dbState.suppliers.push(newSup);
  writeDB(dbState);
  res.status(201).json(newSup);
});

app.put('/api/suppliers/:id', requireRoles(['Super Admin','Admin']), (req, res) => {
  const { id } = req.params;
  const idx = dbState.suppliers.findIndex((s: Supplier) => s.id === id);
  if (idx !== -1) {
    dbState.suppliers[idx] = { ...dbState.suppliers[idx], ...req.body };
    writeDB(dbState);
    res.json(dbState.suppliers[idx]);
  } else {
    res.status(404).json({ error: 'Supplier not found.' });
  }
});

// Employees & Clock
app.get('/api/employees', (req, res) => {
  res.json(dbState.employees);
});

app.post('/api/employees', requireRoles(['Super Admin','Admin']), (req, res) => {
  const newEmp: Employee = {
    id: `usr_${Date.now()}`,
    name: req.body.name,
    email: req.body.email,
    role: req.body.role || 'Cashier',
    phone: req.body.phone,
    attendance: 'Off-Duty',
    monthlySalary: req.body.monthlySalary || 2000,
    performanceScore: 90
  };
  dbState.employees.push(newEmp);
  
  // also add to users so they can log in
  dbState.users.push({
    id: newEmp.id,
    name: newEmp.name,
    email: newEmp.email,
    role: newEmp.role,
    pin: '1234',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  });
  
  writeDB(dbState);
  res.status(201).json(newEmp);
});

app.put('/api/employees/:id', requireRoles(['Super Admin','Admin']), (req, res) => {
  const { id } = req.params;
  const idx = dbState.employees.findIndex((e: Employee) => e.id === id);
  if (idx !== -1) {
    dbState.employees[idx] = { ...dbState.employees[idx], ...req.body };
    // also sync user role
    const uIdx = dbState.users.findIndex((u: User) => u.id === id);
    if (uIdx !== -1) {
      dbState.users[uIdx].role = req.body.role;
      dbState.users[uIdx].name = req.body.name;
    }
    writeDB(dbState);
    res.json(dbState.employees[idx]);
  } else {
    res.status(404).json({ error: 'Employee not found.' });
  }
});

app.post('/api/employees/clock', requireRoles(['Super Admin','Admin','Cashier','Inventory Manager','Accountant']), (req, res) => {
  const { employeeId, type, startingCash, endingCash, actualEndingCash, notes } = req.body;
  const empIdx = dbState.employees.findIndex((e: Employee) => e.id === employeeId);
  if (empIdx === -1) return res.status(404).json({ error: 'Employee not found' });
  
  const emp = dbState.employees[empIdx];
  const now = new Date().toISOString();

  if (type === 'in') {
    emp.attendance = 'Present';
    emp.lastClockIn = now;
    
    const newShift: ShiftLog = {
      id: `sft_${Date.now()}`,
      employeeId,
      employeeName: emp.name,
      clockInTime: now,
      startingCash: startingCash || 150.00,
      notes
    };
    dbState.shiftLogs.push(newShift);
    addAuditLog(employeeId, emp.name, emp.role, 'Clock In', `Clocked in for shift with starter drawer ₱${startingCash}`, req);
  } else {
    emp.attendance = 'Off-Duty';
    emp.lastClockOut = now;

    // Close the latest open shift log
    const openShiftIdx = dbState.shiftLogs.findIndex((s: ShiftLog) => s.employeeId === employeeId && !s.clockOutTime);
    if (openShiftIdx !== -1) {
      dbState.shiftLogs[openShiftIdx].clockOutTime = now;
      dbState.shiftLogs[openShiftIdx].endingCash = endingCash;
      dbState.shiftLogs[openShiftIdx].actualEndingCash = actualEndingCash;
      dbState.shiftLogs[openShiftIdx].notes = notes;
    }
    addAuditLog(employeeId, emp.name, emp.role, 'Clock Out', `Clocked out shift. Drawer counted: ₱${actualEndingCash}. Notes: ${notes || 'none'}`, req);
  }

  writeDB(dbState);
  res.json({ success: true, employee: emp });
});

app.get('/api/shift-logs', (req, res) => {
  res.json(dbState.shiftLogs);
});

// Accounting Expenses
app.get('/api/expenses', (req, res) => {
  res.json(dbState.expenses);
});

app.post('/api/expenses', requireRoles(['Super Admin','Admin','Accountant']), (req, res) => {
  const newExpense: Expense = {
    id: `exp_${Date.now()}`,
    category: req.body.category,
    description: req.body.description,
    amount: parseFloat(req.body.amount),
    date: req.body.date || new Date().toISOString().split('T')[0],
    paymentMethod: req.body.paymentMethod || 'Cash'
  };
  dbState.expenses.unshift(newExpense);
  writeDB(dbState);
  res.status(201).json(newExpense);
});

// Notifications
app.get('/api/notifications', (req, res) => {
  res.json(dbState.notifications);
});

app.put('/api/notifications/read-all', requireRoles(['Super Admin','Admin','Inventory Manager','Accountant','Cashier']), (req, res) => {
  dbState.notifications.forEach((n: SystemNotification) => n.isRead = true);
  writeDB(dbState);
  res.json({ success: true });
});

// Automated Email Outbox Routes
app.get('/api/sent-emails', requireRoles(['Super Admin','Admin','Inventory Manager']), (req, res) => {
  res.json(dbState.sentEmails || []);
});

app.post('/api/sent-emails/test', requireRoles(['Super Admin','Admin','Inventory Manager']), (req, res) => {
  // Find any active essential item or general item to trigger a simulated low stock priority report
  const essentialItem = dbState.products.find((p: Product) => !p.isArchived && p.isEssential) || dbState.products.find((p: Product) => !p.isArchived);
  if (essentialItem) {
    const oldStock = essentialItem.minStockAlert + 5;
    const testStock = Math.max(0, essentialItem.minStockAlert - 2); // Force below threshold for demonstration
    
    // Trigger automated priority low-stock email summary report to Marcus Vance
    triggerLowStockEmailIfNeeded(essentialItem, oldStock, testStock);
    res.json({ success: true, message: `Simulated low stock report successfully triggered and sent to Marcus Vance for product: ${essentialItem.name}!` });
  } else {
    res.status(404).json({ error: 'No active products found to trigger test alert.' });
  }
});

// Users / Staff PIN Management
app.get('/api/users', requireRoles(['Super Admin','Admin']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, avatar_url, is_2fa_enabled, pin');
    if (error) throw error;
    const mapped = data.map((u: any) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      avatarUrl: u.avatar_url || '', is2FAEnabled: u.is_2fa_enabled || false, pin: u.pin
    }));
    // Keep local dbState in sync
    dbState.users = mapped.map((u: any) => ({ ...u, avatarUrl: u.avatarUrl, pin: u.pin }));
    res.json(mapped);
  } catch {
    // Fallback to local JSON DB
    res.json(dbState.users.map((u: User) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      avatarUrl: u.avatarUrl || '', is2FAEnabled: u.is2FAEnabled || false, pin: u.pin
    })));
  }
});

app.post('/api/users', requireRoles(['Super Admin','Admin']), async (req, res) => {
  const { name, email, role, pin } = req.body;
  if (!name || !email || !role || !pin)
    return res.status(400).json({ error: 'name, email, role, and pin are required.' });
  const id = `usr_${Date.now()}`;
  
  // Add to local dbState first (always works)
  const newUser: User = { id, name, email, role: role as UserRole, pin, avatarUrl: '', is2FAEnabled: false };
  dbState.users.push(newUser);
  dbState.employees.push({
    id, name, email, role: role as UserRole, phone: '', attendance: 'Off-Duty' as any,
    monthlySalary: 0, performanceScore: 90
  });
  writeDB(dbState);

  // Also try to persist in Supabase
  try {
    const { error } = await supabase.from('users').insert([{
      id, name, email, role, pin, avatar_url: '', is_2fa_enabled: false
    }]);
    if (error) throw error;
    await supabase.from('employees').insert([{
      id, name, email, role, phone: '', attendance: 'Off-Duty',
      monthly_salary: 0, performance_score: 90
    }]);
  } catch {}
  
  res.status(201).json({ id, name, email, role });
});

app.put('/api/users/:id', requireRoles(['Super Admin','Admin']), async (req, res) => {
  const { id } = req.params;
  const { name, email, role, pin } = req.body;
  
  // Update local dbState
  const uIdx = dbState.users.findIndex((u: User) => u.id === id);
  if (uIdx !== -1) {
    if (name) dbState.users[uIdx].name = name;
    if (email) dbState.users[uIdx].email = email;
    if (role) dbState.users[uIdx].role = role as UserRole;
    if (pin) dbState.users[uIdx].pin = pin;
  }
  const eIdx = dbState.employees.findIndex((e: Employee) => e.id === id);
  if (eIdx !== -1) {
    if (name) dbState.employees[eIdx].name = name;
    if (role) dbState.employees[eIdx].role = role as UserRole;
  }
  writeDB(dbState);

  // Also try Supabase
  try {
    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (pin) updates.pin = pin;
    await supabase.from('users').update(updates).eq('id', id);
    if (name || role) await supabase.from('employees').update({ name, role }).eq('id', id);
  } catch {}

  res.json({ success: true });
});

app.delete('/api/users/:id', requireRoles(['Super Admin','Admin']), async (req, res) => {
  const { id } = req.params;
  
  // Remove from local dbState
  dbState.users = dbState.users.filter((u: User) => u.id !== id);
  dbState.employees = dbState.employees.filter((e: Employee) => e.id !== id);
  writeDB(dbState);

  // Also try Supabase
  try {
    await supabase.from('users').delete().eq('id', id);
    await supabase.from('employees').delete().eq('id', id);
  } catch {}

  res.json({ success: true });
});

// Settings
app.get('/api/settings', (req, res) => {
  res.json(dbState.settings);
});

app.put('/api/settings', requireRoles(['Super Admin','Admin']), (req, res) => {
  dbState.settings = { ...dbState.settings, ...req.body };
  writeDB(dbState);
  res.json(dbState.settings);
});

// Audit Logs
app.get('/api/audit-logs', requireRoles(['Super Admin','Admin']), (req, res) => {
  res.json(dbState.auditLogs);
});

// --------------------------------------------------
// COMPREHENSIVE ANALYTICS & REPORTS
// --------------------------------------------------
app.get('/api/reports/analytics', requireRoles(['Super Admin','Admin']), (req, res) => {
  const orders: Order[] = dbState.orders.filter((o: Order) => o.status === 'Completed');
  const expenses: Expense[] = dbState.expenses;
  const products: Product[] = dbState.products;

  // Calculators
  const totalSalesVal = orders.reduce((acc, o) => acc + o.grandTotal, 0);
  const totalCostVal = orders.reduce((acc, o) => {
    return acc + o.items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  }, 0);
  const totalExpensesVal = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalProfitVal = totalSalesVal - totalCostVal - totalExpensesVal;

  // Filter for today's orders
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.timestamp.startsWith(todayStr));
  const todaySales = todayOrders.reduce((acc, o) => acc + o.grandTotal, 0);
  const todayCost = todayOrders.reduce((acc, o) => {
    return acc + o.items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  }, 0);
  const todayProfit = todaySales - todayCost;

  // Inventory stats
  const totalProductsCount = products.filter(p => !p.isArchived).length;
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.cost * p.stock), 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStockAlert && p.stock > 0 && !p.isArchived).length;
  const outOfStockCount = products.filter(p => p.stock === 0 && !p.isArchived).length;

  // Top Selling Products
  const productQuantityMap: { [key: string]: { name: string; qty: number; sales: number } } = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      if (!productQuantityMap[item.productId]) {
        productQuantityMap[item.productId] = { name: item.name, qty: 0, sales: 0 };
      }
      productQuantityMap[item.productId].qty += item.quantity;
      productQuantityMap[item.productId].sales += (item.sellingPrice * item.quantity);
    });
  });

  const topSellingProducts = Object.values(productQuantityMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Category Breakdown
  const categorySalesMap: { [key: string]: number } = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      // Find category name
      const p = dbState.products.find((prod: Product) => prod.id === item.productId);
      const catName = p ? (dbState.categories.find((c: Category) => c.id === p.categoryId)?.name || 'General') : 'General';
      categorySalesMap[catName] = (categorySalesMap[catName] || 0) + (item.sellingPrice * item.quantity);
    });
  });

  const categoryBreakdown = Object.entries(categorySalesMap).map(([name, value]) => ({ name, value }));

  // Generate historical data points for Graphing (Group by Day for the last 15 days)
  const historicalChartPoints: any[] = [];
  const current_time = new Date();

  for (let i = 14; i >= 0; i--) {
    const targetDate = new Date(current_time.getTime());
    targetDate.setDate(targetDate.getDate() - i);
    const dayKey = targetDate.toISOString().split('T')[0];

    const dayOrders = orders.filter(o => o.timestamp.startsWith(dayKey));
    const daySales = dayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const dayCost = dayOrders.reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + (item.cost * item.quantity), 0), 0);
    const dayExpenses = expenses.filter(e => e.date === dayKey).reduce((sum, e) => sum + e.amount, 0);
    const dayProfit = daySales - dayCost - dayExpenses;

    const formattedDay = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    historicalChartPoints.push({
      date: formattedDay,
      sales: Math.round(daySales * 100) / 100,
      profit: Math.round(dayProfit * 100) / 100,
      expenses: Math.round(dayExpenses * 100) / 100
    });
  }

  res.json({
    cards: {
      todaySales: Math.round(todaySales * 100) / 100,
      todayProfit: Math.round(todayProfit * 100) / 100,
      monthlySales: Math.round(totalSalesVal * 100) / 100,
      monthlyProfit: Math.round(totalProfitVal * 100) / 100,
      totalOrdersCount: orders.length + dbState.orders.filter((o: Order) => o.status === 'Voided').length,
      pendingOrdersCount: dbState.heldTransactions.length,
      totalProductsCount,
      lowStockCount,
      outOfStockCount,
      totalSuppliersCount: dbState.suppliers.length,
      inventoryValue: Math.round(totalInventoryValue * 100) / 100,
      totalExpenses: Math.round(totalExpensesVal * 100) / 100
    },
    topSellingProducts,
    categoryBreakdown,
    historicalChartPoints,
    recentTransactions: dbState.orders.slice(0, 10)
  });
});

// Database backup and restore simulation endpoints
app.post('/api/settings/backup', requireRoles(['Super Admin','Admin']), (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `pos_backup_${timestamp}.json`;
  const backupPath = path.join(DB_DIR, backupFilename);
  fs.writeFileSync(backupPath, JSON.stringify(dbState, null, 2), 'utf8');
  
  addAuditLog('usr_1', 'Sofia Loren', 'Super Admin', 'System Backup', `Created manual database backup: ${backupFilename}`, req);
  res.json({ success: true, filename: backupFilename, date: new Date().toISOString() });
});

// Serve frontend static build files in production, Vite middleware in development
const startServer = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Try setting a different PORT in .env.local (e.g. PORT=3001)`);
      process.exit(1);
    } else {
      throw err;
    }
  });
};

startServer().catch((err) => {
  console.error('Vite dev middleware server failed to start:', err);
});
