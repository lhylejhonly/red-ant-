/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Printer, Mail, MessageSquare, X, CheckCircle2, QrCode } from 'lucide-react';
import { Order, SystemSettings } from '../types';

interface ReceiptModalProps {
  order: Order;
  settings: SystemSettings;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function ReceiptModal({ order, settings, onClose, showToast }: ReceiptModalProps) {
  const [emailInput, setEmailInput] = useState('');
  const [smsInput, setSmsInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);

  const handlePrint = () => {
    const printContent = document.getElementById('thermal-receipt-container');
    if (!printContent) return;
    const printWindow = window.open('', '', 'height=700,width=420');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Receipt ${order.receiptNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 11px; color: #000; width: 300px; padding: 12px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .flex { display: flex; justify-content: space-between; }
        .dashed { border-bottom: 1px dashed #000; margin: 8px 0; }
        .small { font-size: 9px; }
        .large { font-size: 13px; }
        .indent { padding-left: 8px; }
        img { display: none; }
        svg { display: none; }
      </style>
      </head><body>${printContent.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    showToast('Receipt sent to printer.', 'success');
    onClose();
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setIsSendingEmail(true);
    setTimeout(() => {
      showToast(`Receipt TR-${order.receiptNumber} successfully emailed to: ${emailInput}`, 'success');
      setIsSendingEmail(false);
      setEmailInput('');
    }, 800);
  };

  const handleSendSMS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsInput) return;
    setIsSendingSMS(true);
    setTimeout(() => {
      showToast(`Receipt details sent via SMS gateway to: ${smsInput}`, 'success');
      setIsSendingSMS(false);
      setSmsInput('');
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-lg w-full flex flex-col md:flex-row overflow-hidden max-h-[90vh]">

        {/* NOTE: receipt modal intentionally does NOT auto-dismiss. Close happens only from user actions (X / Skip / Print / etc.). */}

        
        {/* LEFT: Live Interactive Form Controls */}
        <div className="p-6 md:w-1/2 flex flex-col justify-between border-b md:border-b-0 md:border-r border-stone-150 bg-stone-50">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sale Finalized
              </span>
              <button onClick={onClose} className="text-stone-400 hover:text-stone-950 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-stone-900">Transaction Complete</h3>
            <p className="text-xs text-stone-500 mt-1">Receipt generated for {order.receiptNumber}. Print or send details to the customer.</p>

            {/* Email Form */}
            <form onSubmit={handleSendEmail} className="mt-5 space-y-2">
              <label className="text-[10px] font-bold text-stone-600 uppercase tracking-wider block">Email Receipt</label>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="customer@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs flex-1 focus:outline-none"
                />
                <button 
                  type="submit" 
                  disabled={isSendingEmail || !emailInput}
                  className="bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 rounded-lg p-2 transition shrink-0"
                >
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* SMS Form */}
            <form onSubmit={handleSendSMS} className="mt-4 space-y-2">
              <label className="text-[10px] font-bold text-stone-600 uppercase tracking-wider block">SMS Receipt</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="+63 917 123 4567"
                  value={smsInput}
                  onChange={(e) => setSmsInput(e.target.value)}
                  className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs flex-1 focus:outline-none"
                />
                <button 
                  type="submit" 
                  disabled={isSendingSMS || !smsInput}
                  className="bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 rounded-lg p-2 transition shrink-0"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-200/60 space-y-2.5">
            <button 
              onClick={handlePrint}
              className="w-full bg-amber-800 hover:bg-amber-900 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </button>
            <button 
              onClick={onClose}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold py-2.5 rounded-xl text-xs transition"
            >
              Skip & New Transaction
            </button>
          </div>
        </div>

        {/* RIGHT: High-Fidelity Thermal Receipt Simulation Rendering (Scrollable) */}
        <div className="md:w-1/2 p-6 overflow-y-auto bg-stone-100 max-h-[85vh] md:max-h-none flex justify-center">
          
          <div 
            id="thermal-receipt-container" 
            className="bg-white border border-stone-200 shadow-md p-5 rounded-md w-full max-w-[290px] text-stone-800 font-mono text-[10px] select-all leading-normal"
          >
            {/* Header branding */}
            <div className="text-center space-y-1">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-tight">{settings.companyName}</h4>
              <p className="text-[9px] text-stone-500 leading-tight">{settings.address}</p>
              <p className="text-[9px] text-stone-500">{settings.phone}</p>
            </div>

            {/* Separator */}
            <div className="border-b border-dashed border-stone-300 my-3"></div>

            {/* Meta details */}
            <div className="space-y-0.5 text-[9px] text-stone-600">
              <div className="flex justify-between">
                <span>Receipt:</span>
                <span className="font-bold text-stone-900">{order.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date/Time:</span>
                <span>{new Date(order.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{order.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Register:</span>
                <span>Terminal #01 (Main)</span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-b border-dashed border-stone-300 my-3"></div>

            {/* Items table header */}
            <div className="flex justify-between font-bold text-stone-900 mb-1">
              <span>Item Description</span>
              <span className="text-right">Total</span>
            </div>

            {/* Line items details */}
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="font-bold text-stone-900 truncate max-w-[170px]">{item.name}</span>
                    <span>{settings.currency}{(item.sellingPrice * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-stone-500 pl-1.5">
                    <span>
                      {item.quantity} x {settings.currency}{item.sellingPrice.toFixed(2)}
                      {item.variantInfo && ` (${item.variantInfo})`}
                    </span>
                    {item.discountApplied > 0 && (
                      <span className="text-orange-700">-Disc: {settings.currency}{item.discountApplied.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Separator */}
            <div className="border-b border-dashed border-stone-300 my-3"></div>

            {/* Pricing Summary Block */}
            <div className="space-y-1 font-mono text-[9px] text-stone-700">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{settings.currency}{order.subtotal.toFixed(2)}</span>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-orange-700">
                  <span>Discount Applied</span>
                  <span>-{settings.currency}{order.discountTotal.toFixed(2)}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between font-bold text-stone-900 text-xs border-t border-dashed border-stone-300 pt-1.5 mt-1">
                <span>GRAND TOTAL</span>
                <span>{settings.currency}{order.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-b border-dashed border-stone-300 my-3"></div>

            {/* Payments list details */}
            <div className="space-y-1 font-mono text-[9px] text-stone-600">
              <span className="font-bold text-stone-900">Payment Breakdown:</span>
              {order.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between pl-1">
                  <span>• {p.method}</span>
                  <span>{settings.currency}{p.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between mt-1 text-stone-700">
                <span>Total Tendered:</span>
                <span>{settings.currency}{order.amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-900 font-bold">
                <span>Change Returned:</span>
                <span>{settings.currency}{order.changeAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-b border-dashed border-stone-300 my-3"></div>

            {/* Footer barcode visual and message */}
            <div className="text-center space-y-2 mt-4">
              <p className="text-[8px] text-stone-500 leading-tight">{settings.receiptFooter}</p>
              
              {/* Fake barcode block */}
              <div className="flex flex-col items-center pt-2">
                <div className="flex items-center justify-center gap-0.5 bg-stone-900 h-7 w-4/5">
                  {/* Styled bars for EAN-13 */}
                  <div className="w-[1px] h-full bg-white"></div>
                  <div className="w-[2px] h-full bg-white"></div>
                  <div className="w-[1px] h-full bg-white"></div>
                  <div className="w-[3px] h-full bg-white"></div>
                  <div className="w-[1px] h-full bg-white"></div>
                  <div className="w-[2px] h-full bg-white"></div>
                  <div className="w-[2px] h-full bg-white"></div>
                  <div className="w-[1px] h-full bg-white"></div>
                </div>
                <span className="text-[8px] font-mono mt-1 text-stone-500 tracking-wider">EAN-13: 7423981109012</span>
              </div>

              {/* QR Code link representation */}
              <div className="flex flex-col items-center pt-2">
                <QrCode className="w-12 h-12 stroke-1 text-stone-700" />
                <span className="text-[7px] text-stone-400 mt-0.5">Scan to verify VAT/e-Receipt</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
