/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  DollarSign, FileText, Download, PiggyBank, Plus, TrendingUp,
  TrendingDown, ArrowDownLeft, Receipt, CheckCircle, Calculator
} from 'lucide-react';
import { Expense, Order } from '../types';

interface AccountingManagerProps {
  expenses: Expense[];
  orders: Order[];
  currency: string;
  onAddExpense: (expenseData: any) => Promise<any>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function AccountingManager({ expenses, orders, currency, onAddExpense, showToast }: AccountingManagerProps) {
  const [expenseCategory, setExpenseCategory] = useState<'Rent' | 'Utilities' | 'Inventory Purchase' | 'Marketing' | 'Payroll' | 'Damaged Goods' | 'Other'>('Utilities');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmt, setExpenseAmt] = useState(100);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expensePayMethod, setExpensePayMethod] = useState('Cash');
  const [activeTab, setActiveTab] = useState<'pl' | 'transactions' | 'expenses'>('pl');
  const [txSearch, setTxSearch] = useState('');
  const [txStatus, setTxStatus] = useState('all');

  const completedOrders = orders.filter(o => o.status === 'Completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalCOGS = completedOrders.reduce((sum, o) =>
    sum + o.items.reduce((s, item) => s + (item.cost * item.quantity), 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const periodLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const filteredOrders = orders.filter(o => {
    const matchStatus = txStatus === 'all' || o.status === txStatus;
    const matchSearch = o.receiptNumber.toLowerCase().includes(txSearch.toLowerCase()) ||
      o.cashierName.toLowerCase().includes(txSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc || expenseAmt <= 0) { showToast('Description and valid amount are required.', 'error'); return; }
    try {
      await onAddExpense({ category: expenseCategory, description: expenseDesc, amount: expenseAmt, date: expenseDate, paymentMethod: expensePayMethod });
      showToast(`Expense logged: ${expenseDesc} — ${currency}${expenseAmt}`, 'success');
      setExpenseDesc('');
      setExpenseAmt(100);
    } catch {
      showToast('Error logging expense.', 'error');
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Receipt #', 'Date', 'Cashier', 'Subtotal', 'Tax', 'Service Charge', 'Discount', 'Grand Total', 'Payment', 'Status'],
      ...orders.map(o => [
        o.receiptNumber,
        new Date(o.timestamp).toLocaleDateString(),
        o.cashierName,
        o.subtotal.toFixed(2),
        o.taxTotal.toFixed(2),
        o.serviceCharge.toFixed(2),
        o.discountTotal.toFixed(2),
        o.grandTotal.toFixed(2),
        o.payments.map(p => p.method).join('+'),
        o.status
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sales_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded.', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Gross Revenue</span>
            <h3 className="text-xl font-bold text-stone-900 mt-1">{currency}{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> {completedOrders.length} completed</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-150 text-stone-800"><DollarSign className="w-5 h-5" /></div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">COGS</span>
            <h3 className="text-xl font-bold text-stone-900 mt-1">{currency}{totalCOGS.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-stone-400 font-medium mt-1">Acquisition cost</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-150 text-stone-500"><Calculator className="w-5 h-5" /></div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Operating Expenses</span>
            <h3 className="text-xl font-bold text-stone-900 mt-1">{currency}{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-red-700 font-semibold mt-1 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" /> {expenses.length} records</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-150 text-stone-800"><ArrowDownLeft className="w-5 h-5" /></div>
        </div>
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${netProfit >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <div>
            <span className="text-[10px] text-stone-600 uppercase font-bold tracking-wider">Net Profit</span>
            <h3 className={`text-xl font-black mt-1 ${netProfit >= 0 ? 'text-amber-950' : 'text-red-800'}`}>{currency}{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-amber-900 font-semibold mt-1">Margin: {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%</p>
          </div>
          <div className="bg-amber-900/10 p-3 rounded-xl text-amber-950"><PiggyBank className="w-5 h-5" /></div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-stone-100 p-1 rounded-xl w-fit gap-0.5">
        {(['pl', 'transactions', 'expenses'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === tab ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'}`}>
            {tab === 'pl' ? '📊 P&L Statement' : tab === 'transactions' ? '🧾 Sales Ledger' : '💸 Expenses'}
          </button>
        ))}
      </div>

      {/* P&L TAB */}
      {activeTab === 'pl' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Expense logger */}
          <div className="lg:col-span-5 bg-white border border-stone-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-2">
              <div><h4 className="text-sm font-bold text-stone-900">Log Operating Expense</h4><p className="text-[10px] text-stone-500">Record rents, utilities, payroll or damages</p></div>
              <Receipt className="w-5 h-5 text-amber-800" />
            </div>
            <form onSubmit={handleExpenseSubmit} className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Category</label>
                <select value={expenseCategory} onChange={(e: any) => setExpenseCategory(e.target.value)} className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none">
                  <option value="Rent">🏢 Monthly Rent</option>
                  <option value="Utilities">💡 Utilities</option>
                  <option value="Inventory Purchase">📦 Inventory Purchase</option>
                  <option value="Marketing">📣 Marketing</option>
                  <option value="Payroll">👥 Payroll</option>
                  <option value="Damaged Goods">⚠️ Damaged Goods</option>
                  <option value="Other">💼 Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Amount ({currency})</label>
                  <input type="number" step="0.01" min="0.01" value={expenseAmt || ''} onChange={e => setExpenseAmt(parseFloat(e.target.value) || 0)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono font-bold" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Date</label>
                  <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono" required />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Payment Method</label>
                <select value={expensePayMethod} onChange={e => setExpensePayMethod(e.target.value)} className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none">
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Description</label>
                <input type="text" placeholder="e.g. PLDT Fiber connection" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" required />
              </div>
              <button type="submit" className="w-full bg-stone-900 hover:bg-amber-950 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" /> Log Expense
              </button>
            </form>
          </div>

          {/* P&L Statement */}
          <div className="lg:col-span-7 bg-white border border-stone-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-5 h-5 text-amber-800" />
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">Profit & Loss Statement</h4>
                    <p className="text-[10px] text-stone-400">{periodLabel} · Active Cycle</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={exportCSV} className="bg-stone-100 hover:bg-stone-200 text-[10px] text-stone-700 px-2.5 py-1 rounded font-semibold inline-flex items-center gap-1"><Download className="w-3 h-3" /> CSV</button>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-100 text-stone-800">
                  <span className="font-medium">Sales Revenue (VAT Excl.)</span>
                  <span className="font-semibold font-mono">{currency}{(totalRevenue / 1.12).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100 text-stone-600 pl-3">
                  <span className="text-stone-500">VAT Collected</span>
                  <span className="font-mono">{currency}{completedOrders.reduce((s, o) => s + o.taxTotal, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-stone-900 font-bold bg-stone-50 px-2 rounded">
                  <span>TOTAL REVENUE</span>
                  <span className="font-mono">{currency}{totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100 text-red-800">
                  <span>(-) COGS</span>
                  <span className="font-mono font-medium">-{currency}{totalCOGS.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-stone-900 font-bold bg-stone-50 px-2 rounded">
                  <span>GROSS PROFIT</span>
                  <span className="font-mono text-amber-900">{currency}{grossProfit.toFixed(2)}</span>
                </div>
                <div className="space-y-1 pl-3 py-1 text-[11px] text-stone-500 border-b border-stone-100">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Operating Expenses</span>
                  {expenses.length > 0
                    ? expenses.map(exp => (
                        <div key={exp.id} className="flex justify-between">
                          <span>· {exp.category} — {exp.description}</span>
                          <span className="font-mono">-{currency}{exp.amount.toFixed(2)}</span>
                        </div>
                      ))
                    : <p className="text-stone-400">No expenses logged yet.</p>}
                </div>
                <div className="flex justify-between py-1.5 text-stone-900 font-black text-sm bg-amber-50 px-2 rounded">
                  <span>NET INCOME</span>
                  <span className={`font-mono text-base ${netProfit >= 0 ? 'text-amber-950' : 'text-red-700'}`}>{currency}{netProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-stone-100 flex justify-between items-center text-[10px] text-stone-400">
              <span>Period: {periodLabel}</span>
              <span className="flex items-center gap-1 text-emerald-700 font-bold"><CheckCircle className="w-3.5 h-3.5" /> Auto-computed from live data</span>
            </div>
          </div>
        </div>
      )}

      {/* SALES LEDGER TAB */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <input type="text" placeholder="Search receipt or cashier..." value={txSearch} onChange={e => setTxSearch(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none w-48" />
              <select value={txStatus} onChange={e => setTxStatus(e.target.value)} className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="all">All Status</option>
                <option value="Completed">Completed</option>
                <option value="Refunded">Refunded</option>
                <option value="Voided">Voided</option>
              </select>
            </div>
            <button onClick={exportCSV} className="bg-stone-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-stone-800 transition">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-[10px] uppercase font-bold text-stone-400">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Tax</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-stone-900">{order.receiptNumber}</td>
                    <td className="py-3 px-4 text-stone-500 font-mono text-[10px]">
                      {new Date(order.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-stone-700">{order.cashierName}</td>
                    <td className="py-3 px-4 text-stone-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                    <td className="py-3 px-4 text-right font-mono">{currency}{order.subtotal.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-stone-500">{currency}{order.taxTotal.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-stone-900">{currency}{order.grandTotal.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center text-[10px]">{order.payments.map(p => p.method).join(', ')}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                        order.status === 'Refunded' ? 'bg-orange-50 text-orange-700' :
                        'bg-red-50 text-red-700'
                      }`}>{order.status}</span>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-stone-400 text-xs">No transactions match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex justify-between items-center">
            <h4 className="text-sm font-bold text-stone-900">All Logged Expenses</h4>
            <span className="text-xs text-stone-500">
              {expenses.length} records · Total: <span className="font-bold text-red-700">-{currency}{totalExpenses.toFixed(2)}</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-[10px] uppercase font-bold text-stone-400">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[10px] font-semibold">{exp.category}</span>
                    </td>
                    <td className="py-3 px-4 text-stone-700">{exp.description}</td>
                    <td className="py-3 px-4 font-mono text-stone-500">{exp.date}</td>
                    <td className="py-3 px-4 text-stone-500">{exp.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-red-700">-{currency}{exp.amount.toFixed(2)}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-stone-400 text-xs">No expenses recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
