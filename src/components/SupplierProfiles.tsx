/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Truck, Mail, Phone, MapPin, DollarSign, FileText, Check, Download, Edit, X
} from 'lucide-react';
import { Supplier } from '../types';

interface SupplierProfilesProps {
  suppliers: Supplier[];
  currency: string;
  onAddSupplier: (supData: any) => Promise<any>;
  onUpdateSupplier?: (id: string, supData: any) => Promise<any>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function SupplierProfiles({ suppliers, currency, onAddSupplier, onUpdateSupplier, showToast }: SupplierProfilesProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);

  // Add form
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [startingBalance, setStartingBalance] = useState(0);

  // Edit form mirrors add form (reuse same state, prefilled)
  const openEdit = (sup: Supplier) => {
    setName(sup.name);
    setContactName(sup.contactName);
    setEmail(sup.email);
    setPhone(sup.phone);
    setAddress(sup.address);
    setStartingBalance(sup.outstandingBalance);
    setIsEditingSupplier(true);
  };

  // Payment recording state
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentRef, setPaymentRef] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactName) { showToast('Supplier name and contact are required.', 'error'); return; }
    try {
      await onAddSupplier({ name, contactName, email, phone, address, outstandingBalance: startingBalance });
      showToast(`"${name}" registered successfully.`, 'success');
      setName(''); setContactName(''); setEmail(''); setPhone(''); setAddress(''); setStartingBalance(0);
      setIsAddingSupplier(false);
    } catch {
      showToast('Error registering supplier.', 'error');
    }
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !onUpdateSupplier) return;
    try {
      await onUpdateSupplier(selectedSupplier.id, { name, contactName, email, phone, address, outstandingBalance: startingBalance });
      showToast(`"${name}" updated successfully.`, 'success');
      setIsEditingSupplier(false);
    } catch {
      showToast('Error updating supplier.', 'error');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !onUpdateSupplier) return;
    const amount = typeof paymentAmount === 'number' ? paymentAmount : 0;
    if (amount <= 0) { showToast('Enter a valid payment amount.', 'error'); return; }

    const ref = paymentRef || `PAY-${Date.now().toString().slice(-6)}`;
    const newBalance = Math.max(0, selectedSupplier.outstandingBalance - amount);
    const newHistory = [
      { date: new Date().toISOString().split('T')[0], amount, reference: ref },
      ...(selectedSupplier.paymentHistory || [])
    ];

    try {
      await onUpdateSupplier(selectedSupplier.id, {
        outstandingBalance: newBalance,
        paymentHistory: newHistory
      });
      showToast(`Payment of ${currency}${amount} recorded. New balance: ${currency}${newBalance.toFixed(2)}`, 'success');
      setPaymentAmount('');
      setPaymentRef('');
      setIsRecordingPayment(false);
    } catch {
      showToast('Error recording payment.', 'error');
    }
  };

  const supplierForm = (onSubmit: (e: React.FormEvent) => Promise<void>, submitLabel: string, onCancel: () => void) => (
    <form onSubmit={onSubmit} className="p-4 space-y-3">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-stone-500 uppercase">Company Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kyoto Kilns"
          className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" required />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-stone-500 uppercase">Key Contact</label>
        <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="e.g. Koji Takahashi"
          className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-stone-500 uppercase">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="koji@kilns.jp"
            className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-stone-500 uppercase">Phone</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+81 3-5555"
            className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-stone-500 uppercase">Outstanding Balance ({currency})</label>
        <input type="number" value={startingBalance} onChange={e => setStartingBalance(parseFloat(e.target.value) || 0)}
          className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-stone-500 uppercase">Address</label>
        <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Shigaraki District, Japan"
          className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl py-2 text-xs font-semibold transition">
          Cancel
        </button>
        <button type="submit"
          className="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1">
          <Check className="w-3.5 h-3.5" /> {submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">

      {/* LEFT: Supplier list */}
      <div className="lg:col-span-4 bg-white border border-stone-200 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-stone-100 pb-2">
          <div className="flex items-center gap-1.5">
            <Truck className="w-5 h-5 text-amber-800" />
            <h4 className="text-sm font-bold text-stone-900">Partner Suppliers</h4>
          </div>
          <button onClick={() => { setName(''); setContactName(''); setEmail(''); setPhone(''); setAddress(''); setStartingBalance(0); setIsAddingSupplier(true); }}
            className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl transition">
            + Add
          </button>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {suppliers.map(sup => (
            <div
              key={sup.id}
              onClick={() => setSelectedSupplierId(sup.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                selectedSupplierId === sup.id
                  ? 'bg-amber-50 border-amber-300 shadow-xs'
                  : 'bg-stone-50 border-stone-200 hover:bg-stone-100/60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-stone-900 truncate">{sup.name}</h5>
                  <p className="text-[10px] text-stone-500 mt-0.5">{sup.contactName}</p>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <span className={`text-xs font-mono font-bold ${sup.outstandingBalance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {currency}{sup.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[9px] text-stone-400 mt-0.5">balance due</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[9px] text-stone-400 leading-tight border-t border-stone-100 pt-3">
          {suppliers.length} registered supplier{suppliers.length !== 1 ? 's' : ''}. Click to view profile.
        </p>
      </div>

      {/* RIGHT: Supplier detail */}
      <div className="lg:col-span-8 space-y-5">
        {selectedSupplier ? (
          <>
            <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-5">
              <div className="flex justify-between items-start border-b border-stone-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-stone-900">{selectedSupplier.name}</h3>
                  <p className="text-xs text-stone-500 mt-0.5">ID: {selectedSupplier.id}</p>
                </div>
                <button
                  onClick={() => openEdit(selectedSupplier)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-amber-800 bg-stone-100 hover:bg-amber-50 border border-stone-200 px-3 py-1.5 rounded-xl transition"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs text-stone-700">
                <div>
                  <span className="text-[10px] text-stone-400 font-bold uppercase block mb-1">Contact</span>
                  <p className="font-semibold">{selectedSupplier.contactName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-bold uppercase block mb-1">Outstanding Balance</span>
                  <p className={`font-bold font-mono text-sm ${selectedSupplier.outstandingBalance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {currency}{selectedSupplier.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-bold uppercase block mb-1">Email</span>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-stone-400" /> {selectedSupplier.email || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-bold uppercase block mb-1">Phone</span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-stone-400" /> {selectedSupplier.phone || '—'}</span>
                </div>
                <div className="col-span-2 border-t border-stone-100 pt-3">
                  <span className="text-[10px] text-stone-400 font-bold uppercase block mb-1">Address</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-stone-400 shrink-0" /> {selectedSupplier.address || '—'}</span>
                </div>
              </div>

              {/* Record Payment inline */}
              {!isRecordingPayment ? (
                <button
                  onClick={() => setIsRecordingPayment(true)}
                  disabled={selectedSupplier.outstandingBalance <= 0}
                  className="w-full bg-amber-800 hover:bg-amber-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Record Payment
                </button>
              ) : (
                <form onSubmit={handleRecordPayment} className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-stone-900">Record Payment to {selectedSupplier.name}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Amount ({currency})</label>
                      <input type="number" step="0.01" min="0.01" value={paymentAmount}
                        onChange={e => setPaymentAmount(parseFloat(e.target.value) || '')}
                        className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono" required />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Reference #</label>
                      <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)}
                        placeholder={`PAY-${Date.now().toString().slice(-6)}`}
                        className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsRecordingPayment(false)}
                      className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl py-1.5 text-xs font-semibold transition">
                      Cancel
                    </button>
                    <button type="submit"
                      className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1.5 rounded-xl text-xs transition flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Confirm Payment
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Payment history & docs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm space-y-3">
                <h5 className="text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-amber-800" /> Payment History
                </h5>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                  {(selectedSupplier.paymentHistory?.length ?? 0) > 0 ? selectedSupplier.paymentHistory.map((pay, i) => (
                    <div key={i} className="bg-stone-50 p-2 rounded-lg border border-stone-150 text-[10px] flex justify-between">
                      <div>
                        <p className="font-bold text-stone-900">{pay.reference}</p>
                        <p className="text-stone-400">{pay.date}</p>
                      </div>
                      <span className="font-bold font-mono text-emerald-700">{currency}{pay.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )) : (
                    <p className="text-[10px] text-stone-400 italic py-4 text-center">No payments recorded.</p>
                  )}
                </div>
              </div>

              <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm space-y-3">
                <h5 className="text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-800" /> Documents
                </h5>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                  {(selectedSupplier.documents?.length ?? 0) > 0 ? selectedSupplier.documents.map((doc, i) => (
                    <div key={i} className="bg-stone-50 p-2 rounded-lg border border-stone-150 text-[10px] flex justify-between items-center">
                      <span className="font-medium text-stone-800 truncate max-w-[150px]">{doc.name}</span>
                      <button onClick={() => showToast(`Downloading ${doc.name}...`, 'success')}
                        className="p-1 text-stone-400 hover:text-amber-800">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )) : (
                    <p className="text-[10px] text-stone-400 italic py-4 text-center">No documents on file.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-stone-50 border border-stone-200 py-16 text-center text-stone-400 rounded-2xl flex flex-col items-center justify-center">
            <Truck className="w-12 h-12 stroke-1 text-stone-300 mb-2" />
            <p className="text-xs font-semibold">Select a supplier from the left panel.</p>
          </div>
        )}
      </div>

      {/* ADD SUPPLIER MODAL */}
      {isAddingSupplier && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-800" /> New Supplier
              </h4>
              <button onClick={() => setIsAddingSupplier(false)} className="text-stone-400 hover:text-stone-950"><X className="w-4 h-4" /></button>
            </div>
            {supplierForm(handleCreateSupplier, 'Register Supplier', () => setIsAddingSupplier(false))}
          </div>
        </div>
      )}

      {/* EDIT SUPPLIER MODAL */}
      {isEditingSupplier && selectedSupplier && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <Edit className="w-4 h-4 text-amber-800" /> Edit — {selectedSupplier.name}
              </h4>
              <button onClick={() => setIsEditingSupplier(false)} className="text-stone-400 hover:text-stone-950"><X className="w-4 h-4" /></button>
            </div>
            {supplierForm(handleUpdateSupplier, 'Save Changes', () => setIsEditingSupplier(false))}
          </div>
        </div>
      )}
    </div>
  );
}
