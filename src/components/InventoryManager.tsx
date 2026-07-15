/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowLeftRight, FileSpreadsheet, PlusCircle, MinusCircle, 
  Check, Calendar, Activity, RefreshCw, MapPin, ShieldAlert,
  Send, Eye, Inbox, Mail
} from 'lucide-react';
import { Product, Supplier, SentEmail } from '../types';

interface InventoryManagerProps {
  products: Product[];
  suppliers: Supplier[];
  currency: string;
  onUpdateStock: (id: string, newStock: number, reason: string) => Promise<any>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  sentEmails?: SentEmail[];
  onTriggerTestEmail?: () => Promise<any>;
}

export default function InventoryManager({
  products, 
  suppliers, 
  currency, 
  onUpdateStock, 
  showToast, 
  sentEmails = [], 
  onTriggerTestEmail
}: InventoryManagerProps) {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('Restocking');

  // Stock Transfer Simulation State
  const [transferProductId, setTransferProductId] = useState(products[0]?.id || '');
  const [transferQty, setTransferQty] = useState(5);
  const [targetBranch, setTargetBranch] = useState('Cebu Port Outlet');
  
  const [adjustments, setAdjustments] = useState<Array<{
    id: string;
    productName: string;
    sku: string;
    qty: number;
    type: 'Stock In' | 'Stock Out' | 'Transfer';
    reason: string;
    timestamp: string;
  }>>([]);

  const [activeTab, setActiveTab] = useState<'control' | 'emails'>('control');
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [isTestSending, setIsTestSending] = useState(false);

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const delta = adjustType === 'in' ? adjustQty : -adjustQty;
    const finalStock = Math.max(0, prod.stock + delta);

    try {
      await onUpdateStock(selectedProductId, finalStock, `${adjustType === 'in' ? 'Stock In' : 'Stock Out'} - Reason: ${adjustReason}`);
      
      const newAdj = {
        id: `adj_${Date.now()}`,
        productName: prod.name,
        sku: prod.sku,
        qty: delta,
        type: (adjustType === 'in' ? 'Stock In' : 'Stock Out') as 'Stock In' | 'Stock Out',
        reason: adjustReason,
        timestamp: new Date().toISOString()
      };

      setAdjustments(prev => [newAdj, ...prev]);
      showToast(`Adjusted ${prod.name} stock to ${finalStock} units.`, 'success');
      setAdjustQty(1);
    } catch (err) {
      showToast('Failed to log stock adjustment.', 'error');
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === transferProductId);
    if (!prod) return;

    if (prod.stock < transferQty) {
      showToast('Insufficient warehouse stock available for this branch transfer request.', 'error');
      return;
    }

    const finalStock = prod.stock - transferQty;

    try {
      await onUpdateStock(transferProductId, finalStock, `Stock Transfer dispatched to ${targetBranch}`);
      
      const newAdj = {
        id: `adj_${Date.now()}`,
        productName: prod.name,
        sku: prod.sku,
        qty: -transferQty,
        type: 'Transfer' as 'Transfer',
        reason: `Dispatched transfer to ${targetBranch}`,
        timestamp: new Date().toISOString()
      };

      setAdjustments(prev => [newAdj, ...prev]);
      showToast(`Transferred ${transferQty} units of ${prod.name} to ${targetBranch}.`, 'success');
      setTransferQty(5);
    } catch (err) {
      showToast('Error handling stock transfers.', 'error');
    }
  };

  // Filter products for expiry monitoring (e.g. coffee, chocolate, syrup)
  const expiringProducts = products.filter(p => p.expirationDate);

  // Modular Stock Controls and Audits Tab Render
  const renderControlView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        
        {/* LEFT: Fast Stock Adjustments & Transfer Panel (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Rapid Stock In / Out Adjustment Form */}
          <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-2">
              <div>
                <h4 className="text-sm font-bold text-stone-900">Inventory Adjustment</h4>
                <p className="text-[10px] text-stone-500">Record rapid shelf changes, damaged goods, or direct restocks</p>
              </div>
              <Activity className="w-4 h-4 text-amber-800" />
            </div>

            <form onSubmit={handleAdjustStockSubmit} className="space-y-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Select Product</label>
                <select 
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>[{p.sku}] {p.name} (In stock: {p.stock})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Adjustment Mode</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-lg">
                    <button 
                      type="button"
                      onClick={() => setAdjustType('in')}
                      className={`py-1 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1 ${
                        adjustType === 'in' ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-600'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Stock In
                    </button>
                    <button 
                      type="button"
                      onClick={() => setAdjustType('out')}
                      className={`py-1 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1 ${
                        adjustType === 'out' ? 'bg-white text-red-800 shadow-xs' : 'text-stone-600'
                      }`}
                    >
                      <MinusCircle className="w-3.5 h-3.5" /> Stock Out
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Adjustment Qty</label>
                  <input 
                    type="number" 
                    min="1"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(parseInt(e.target.value) || 1)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none font-mono font-bold text-stone-900"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Adjustment Reason</label>
                <select 
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none"
                >
                  {adjustType === 'in' ? (
                    <>
                      <option value="Restocking">📦 New Supplier Purchase Restock</option>
                      <option value="Returned Order">↩️ Customer Return Stock Restorations</option>
                      <option value="Count Audit">📊 Inventory Cycle Count Correction</option>
                    </>
                  ) : (
                    <>
                      <option value="Damaged Goods">⚠️ Damaged Shelf item / Expiration Disposal</option>
                      <option value="Internal Use">☕ Employee testing / Tasting sessions</option>
                      <option value="Shrinkage">🔍 Missing units / Store theft shrinkage</option>
                    </>
                  )}
                </select>
              </div>

              <button 
                type="submit"
                className="w-full bg-stone-900 hover:bg-amber-950 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" /> Log Inventory Adjustment
              </button>
            </form>
          </div>

          {/* Branch Stock Transfer Simulation */}
          <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-2">
              <div>
                <h4 className="text-sm font-bold text-stone-900">Branch Stock Transfer</h4>
                <p className="text-[10px] text-stone-500">Coordinate and dispatch warehouse inventory to target outlets</p>
              </div>
              <ArrowLeftRight className="w-4 h-4 text-amber-800" />
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Transfer Item</label>
                <select 
                  value={transferProductId}
                  onChange={(e) => setTransferProductId(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>[{p.sku}] {p.name} (Stock: {p.stock})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Transfer Qty</label>
                  <input 
                    type="number" 
                    min="1"
                    value={transferQty}
                    onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Target Branch</label>
                  <select 
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="Cebu Port Outlet">📍 Cebu Port Outlet</option>
                    <option value="Davao Atrium Cafe">📍 Davao Atrium Cafe</option>
                    <option value="QC North Annex">📍 QC North Annex</option>
                    <option value="Manila South Dock">📍 Manila South Dock Area</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-amber-800 hover:bg-amber-900 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> Dispatch Branch Transfer
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT: Expiry Monitoring & Historical Audits (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Expiry Date Monitoring Card */}
          <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center border-b border-stone-100 pb-2.5 mb-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-5 h-5 text-amber-800" />
                <h4 className="text-sm font-bold text-stone-900">Perishables & Expiry Monitoring</h4>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                Expiry Log
              </span>
            </div>

            <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
              {expiringProducts.map(p => {
                const daysLeft = Math.ceil((new Date(p.expirationDate!).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                const isUrgent = daysLeft < 90;

                return (
                  <div key={p.id} className={`p-2.5 rounded-xl border flex justify-between items-center ${
                    isUrgent ? 'bg-red-50 border-red-100 text-red-950' : 'bg-stone-50 border-stone-200 text-stone-850'
                  }`}>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{p.name}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">SKU: {p.sku} • Supplier Batch Record</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold font-mono">{p.expirationDate}</p>
                      <p className={`text-[9px] font-semibold mt-0.5 ${isUrgent ? 'text-red-700 font-bold' : 'text-stone-500'}`}>
                        {daysLeft > 0 ? `${daysLeft} Days left` : 'Expired! Dispose'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time Inventory Adjustments Audit log */}
          <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
            <div className="flex justify-between items-center border-b border-stone-100 pb-2 mb-3">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-5 h-5 text-amber-800" />
                <h4 className="text-sm font-bold text-stone-900">Adjustment History Audit Trail</h4>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {adjustments.map(adj => {
                const isNegative = adj.qty < 0;

                return (
                  <div key={adj.id} className="p-3 bg-stone-50 hover:bg-stone-100/60 border border-stone-150 rounded-xl flex justify-between items-center transition-all">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block w-2 h-2 rounded-full ${isNegative ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                        <h5 className="text-xs font-bold text-stone-900 truncate">{adj.productName}</h5>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5">SKU: {adj.sku} • Reason: <span className="font-medium text-stone-700">{adj.reason}</span></p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className={`text-xs font-black font-mono ${isNegative ? 'text-red-700' : 'text-emerald-700'}`}>
                        {isNegative ? '' : '+'}{adj.qty} Units
                      </span>
                      <p className="text-[9px] text-stone-400 mt-0.5">
                        {new Date(adj.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    );
  };

  // Modular Outbox Tab Render
  const renderEmailsView = () => {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h4 className="text-sm font-black text-stone-900">Automated Notification System (Email Outbox)</h4>
            <p className="text-xs text-stone-500 mt-1">
              Simulates real-time notification alerts sent to Marcus Vance (<span className="font-semibold text-stone-700">marcus@terracotta.com</span>) when Essential Items drop below limit.
            </p>
          </div>
          
          <button
            onClick={async () => {
              if (onTriggerTestEmail) {
                setIsTestSending(true);
                try {
                  await onTriggerTestEmail();
                } finally {
                  setIsTestSending(false);
                }
              }
            }}
            disabled={isTestSending}
            className="bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
          >
            <Send className="w-3.5 h-3.5" /> 
            {isTestSending ? 'Dispatching...' : 'Trigger Simulated Low Stock Alert'}
          </button>
        </div>

        {/* Outbox List */}
        {sentEmails.length === 0 ? (
          <div className="text-center py-12 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
            <Inbox className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-xs font-bold text-stone-700">No priority emails have been dispatched yet</p>
            <p className="text-[11px] text-stone-500 mt-1">Simulated emails will be listed here when an essential item's stock level falls at or below its threshold.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-[10px] font-bold uppercase tracking-wider border-b border-stone-200 font-sans">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Recipient (Manager)</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {sentEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-stone-50/50 transition">
                    <td className="py-3.5 px-4 font-bold text-stone-900">
                      <span className="text-red-700 mr-1.5">⚠️</span> {email.subject}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">
                      <p className="font-semibold text-stone-800">{email.recipientName}</p>
                      <p className="text-[10px] text-stone-400 font-mono">{email.to}</p>
                    </td>
                    <td className="py-3.5 px-4 text-stone-500 font-mono">
                      {new Date(email.timestamp).toLocaleString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-amber-50 text-amber-800 border border-amber-100 text-[9px] px-2 py-0.5 rounded-full font-bold">
                        {email.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedEmail(email)}
                        className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-1.5 px-3 rounded-lg text-[11px] transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Navigation Tabs & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
        <div>
          <h3 className="text-base font-extrabold text-stone-900">Inventory & Email Control Center</h3>
          <p className="text-[11px] text-stone-500 mt-0.5">Manage real-time counts, transfer warehouse items, and monitor priority stock notifications</p>
        </div>
        
        <div className="flex bg-stone-200/60 p-1 rounded-xl shrink-0 font-sans">
          <button
            onClick={() => setActiveTab('control')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'control' 
                ? 'bg-white text-stone-900 shadow-xs' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            📋 Stock Controls & Logs
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'emails' 
                ? 'bg-white text-stone-900 shadow-xs' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            ✉️ System Email Outbox
            {sentEmails.length > 0 && (
              <span className="bg-amber-800 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                {sentEmails.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'control' ? renderControlView() : renderEmailsView()}

      {/* EMAIL INSPECT MODAL DIALOG */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-100">
                  <Mail className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Email Dispatch Inspector</h4>
                  <p className="text-[9px] text-stone-400">Review exact HTML payload transmitted to recipient</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmail(null)}
                className="text-stone-400 hover:text-stone-700 font-bold text-lg"
              >
                &times;
              </button>
            </div>
            
            {/* Email Headers Info */}
            <div className="bg-stone-100/50 p-4 border-b border-stone-200 text-xs text-stone-700 space-y-1 font-sans shrink-0">
              <p><strong>From:</strong> Automated Replenishment Dispatcher &lt;replenishment@terracottapos.com&gt;</p>
              <p><strong>To:</strong> {selectedEmail.recipientName} &lt;{selectedEmail.to}&gt; ({selectedEmail.recipientRole})</p>
              <p><strong>Subject:</strong> <span className="font-bold text-stone-900">{selectedEmail.subject}</span></p>
              <p><strong>Date:</strong> {new Date(selectedEmail.timestamp).toString()}</p>
            </div>

            {/* Simulated HTML Email Frame */}
            <div className="flex-1 overflow-y-auto p-6 bg-stone-200/40">
              <div className="bg-white rounded-xl shadow-xs border border-stone-150 p-2 overflow-hidden mx-auto max-w-[600px]">
                <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedEmail(null)}
                className="bg-stone-900 hover:bg-stone-800 text-white rounded-xl px-4 py-2 text-xs font-semibold transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
