/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, X } from 'lucide-react';
import { Product } from '../types';
import BarcodeScanner from './BarcodeScanner';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  products: Product[];
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  products,
  showToast
}: QRScannerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 p-1.5 rounded-lg border border-amber-200 text-amber-950">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900">QR & Barcode Scan Interface</h4>
              <p className="text-[10px] text-stone-500">Scan hardware items or use simulator panels to build active sales orders</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 font-bold p-1.5 hover:bg-stone-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content - Rendering our Reusable BarcodeScanner Component! */}
        <div className="p-5 flex-1 overflow-y-auto">
          <BarcodeScanner 
            isActive={isOpen}
            onScanSuccess={onScanSuccess}
            products={products}
            showToast={showToast}
          />
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="bg-stone-900 hover:bg-stone-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs"
          >
            Done Scanning
          </button>
        </div>

      </div>
    </div>
  );
}
