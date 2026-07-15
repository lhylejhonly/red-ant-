/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Check, X, CreditCard, User, Phone, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { CreditRecord } from '../types';

interface UtangManagerProps {
  creditRecords: CreditRecord[];
  currency: string;
  onAddCredit: (data: any) => Promise<any>;
  onAddPayment: (id: string, amount: number) => Promise<any>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function UtangManager({ creditRecords, currency, onAddCredit, onAddPayment, showToast }: UtangManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Unpaid' | 'Partial' | 'Paid'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({});

  // New credit form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemLines, setItemLines] = useState<Array<{ name: string; quantity: number; price: number }>>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const totalAmount = itemLines.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const filtered = creditRecords.filter(r => {
    const matchSearch = r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (r.customerPhone || '').includes(search);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalUtang = creditRecords.filter(r => r.status !== 'Paid').reduce((s, r) => s + r.balance, 0);
  const unpaidCount = creditRecords.filter(r => r.status === 'Unpaid').length;
  const partialCount = creditRecords.filter(r => r.status === 'Partial').length;

  const handleAddItem = () => {
    if (!itemName || itemPrice <= 0) { showToast('Item name and price required.', 'error'); return; }
    setItemLines(prev => [...prev, { name: itemName, quantity: itemQty, price: itemPrice }]);
    setItemName(''); setItemQty(1); setItemPrice(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) { showToast('Customer name is required.', 'error'); return; }
    if (itemLines.length === 0) { showToast('Add at least one item.', 'error'); return; }
    const result = await onAddCredit({
      customerName, customerPhone, items: itemLines,
      totalAmount, amountPaid: 0, balance: totalAmount,
      dueDate: dueDate || undefined, notes, status: 'Unpaid', payments: []
    });
    if (result) {
      showToast(`Utang recorded for ${customerName}.`, 'success');
      setCustomerName(''); setCustomerPhone(''); setItemLines([]);
      setDueDate(''); setNotes(''); setIsAdding(false);
    }
  };

  const handlePayment = async (record: CreditRecord) => {
    const amount = paymentAmounts[record.id] || 0;
    if (amount <= 0) { showToast('Enter a valid payment amount.', 'error'); return; }
    if (amount > record.balance) { showToast(`Amount exceeds balance of ${currency}${record.balance.toFixed(2)}.`, 'error'); return; }
    const result = await onAddPayment(record.id, amount);
    if (result) {
      showToast(`Payment of ${currency}${amount.toFixed(2)} recorded.`, 'success');
      setPaymentAmounts(prev => ({ ...prev, [record.id]: 0 }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Total Utang</span>
            <h3 className="text-xl font-bold text-red-700 mt-1">{currency}{totalUtang.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-stone-400 mt-1">{creditRecords.filter(r => r.status !== 'Paid').length} active records</p>
          </div>
          <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-red-700"><CreditCard className="w-5 h-5" /></div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Unpaid</span>
            <h3 className="text-xl font-bold text-stone-900 mt-1">{unpaidCount}</h3>
            <p className="text-[10px] text-stone-400 mt-1">No payment yet</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-stone-500"><User className="w-5 h-5" /></div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Partial</span>
            <h3 className="text-xl font-bold text-amber-700 mt-1">{partialCount}</h3>
            <p className="text-[10px] text-stone-400 mt-1">Partially paid</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-amber-700"><CreditCard className="w-5 h-5" /></div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white border border-stone-200 p-4 rounded-2xl shadow-sm">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input type="text" placeholder="Search customer..." value={search} onChange={e => setSearch(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none w-44" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none">
            <option value="all">All Status</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
        <button onClick={() => setIsAdding(true)}
          className="bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm">
          <Plus className="w-4 h-4" /> New Utang
        </button>
      </div>

      {/* Records List */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <CreditCard className="w-10 h-10 stroke-1 mx-auto mb-2 text-stone-300" />
            <p className="text-xs font-semibold">No utang records found.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filtered.map(record => (
              <div key={record.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-black text-sm shrink-0">
                      {record.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-900">{record.customerName}</p>
                      {record.customerPhone && (
                        <p className="text-[10px] text-stone-400 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{record.customerPhone}</p>
                      )}
                      <p className="text-[10px] text-stone-400">{new Date(record.dateCreated).toLocaleDateString()}{record.dueDate ? ` · Due: ${new Date(record.dueDate).toLocaleDateString()}` : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold text-red-700">{currency}{record.balance.toFixed(2)}</p>
                      <p className="text-[10px] text-stone-400">of {currency}{record.totalAmount.toFixed(2)}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      record.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                      record.status === 'Partial' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>{record.status}</span>
                    <button onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                      className="text-stone-400 hover:text-stone-700 transition">
                      {expandedId === record.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedId === record.id && (
                  <div className="mt-3 pt-3 border-t border-stone-100 space-y-3">
                    {/* Items */}
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Items</p>
                      <div className="space-y-0.5">
                        {record.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-stone-600">
                            <span>{item.name} × {item.quantity}</span>
                            <span className="font-mono">{currency}{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment history */}
                    {record.payments.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Payment History</p>
                        <div className="space-y-0.5">
                          {record.payments.map((p, i) => (
                            <div key={i} className="flex justify-between text-[10px] text-stone-500">
                              <span>{new Date(p.date).toLocaleDateString()}</span>
                              <span className="font-mono text-emerald-700">+{currency}{p.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Record payment */}
                    {record.status !== 'Paid' && (
                      <div className="flex gap-2 items-center">
                        <input type="number" step="0.01" min="0.01"
                          value={paymentAmounts[record.id] || ''}
                          onChange={e => setPaymentAmounts(prev => ({ ...prev, [record.id]: parseFloat(e.target.value) || 0 }))}
                          placeholder={`Amount (max ${currency}${record.balance.toFixed(2)})`}
                          className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono" />
                        <button onClick={() => handlePayment(record)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                          <Check className="w-3.5 h-3.5" /> Pay
                        </button>
                      </div>
                    )}

                    {record.notes && (
                      <p className="text-[10px] text-stone-400 italic">Note: {record.notes}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Utang Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-800" /> New Utang / Credit Record
              </h4>
              <button onClick={() => setIsAdding(false)} className="text-stone-400 hover:text-stone-900 transition"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Customer Name</label>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g. Juan dela Cruz" required
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Phone (optional)</label>
                  <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="09xx-xxx-xxxx"
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Due Date (optional)</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Notes (optional)</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Suki, bayad sa Biyernes"
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
                </div>
              </div>

              {/* Item adder */}
              <div className="border-t border-stone-100 pt-3 space-y-2">
                <p className="text-[10px] font-bold text-stone-500 uppercase">Items</p>
                <div className="flex gap-2">
                  <input type="text" value={itemName} onChange={e => setItemName(e.target.value)}
                    placeholder="Item name" className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
                  <input type="number" min="1" value={itemQty} onChange={e => setItemQty(parseInt(e.target.value) || 1)}
                    className="w-14 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none font-mono text-center" />
                  <input type="number" step="0.01" min="0" value={itemPrice || ''}
                    onChange={e => setItemPrice(parseFloat(e.target.value) || 0)}
                    placeholder="Price" className="w-24 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono" />
                  <button type="button" onClick={handleAddItem}
                    className="bg-stone-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-900 transition">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {itemLines.length > 0 && (
                  <div className="space-y-1 bg-stone-50 rounded-lg p-2">
                    {itemLines.map((line, i) => (
                      <div key={i} className="flex justify-between items-center text-xs text-stone-700">
                        <span>{line.name} × {line.quantity}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{currency}{(line.price * line.quantity).toFixed(2)}</span>
                          <button type="button" onClick={() => setItemLines(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold text-stone-900 border-t border-stone-200 pt-1 mt-1">
                      <span>Total</span>
                      <span className="font-mono">{currency}{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
                <button type="button" onClick={() => setIsAdding(false)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-4 py-2 rounded-xl transition">
                  Cancel
                </button>
                <button type="submit"
                  className="bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Save Utang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
