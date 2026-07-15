/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Sparkles } from 'lucide-react';
import { Product } from '../types';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  products: Product[];
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  isActive: boolean;
}

export default function BarcodeScanner({
  onScanSuccess,
  products,
  showToast,
  isActive
}: BarcodeScannerProps) {
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'html5qr-scanner';

  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(950, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {}
  };

  useEffect(() => {
    if (!isActive) return;

    const scanner = new Html5Qrcode(scannerDivId);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => {
        playBeepSound();
        onScanSuccess(decodedText.trim());
      },
      () => {}
    ).catch((err) => {
      setCameraError('Camera access denied or unavailable. Use the simulator below.');
    });

    return () => {
      scanner.isScanning && scanner.stop().catch(() => {});
    };
  }, [isActive, facingMode]);

  return (
    <div className="space-y-4">
      {/* Camera Preview */}
      <div className="relative bg-stone-950 aspect-square rounded-2xl overflow-hidden border border-stone-200 shadow-md">
        <div id={scannerDivId} className="w-full h-full" />

        {/* Targeting Overlay */}
        {isActive && !cameraError && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            <div className="w-[65%] h-[65%] border-2 border-dashed border-amber-500/50 rounded-2xl relative animate-pulse">
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-amber-400"></div>
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-amber-400"></div>
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-amber-400"></div>
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-amber-400"></div>
            </div>
            <div className="absolute w-full h-[2.5px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-bounce top-1/3"></div>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/95 z-20 p-6 text-center">
            <p className="text-xs text-stone-300">{cameraError}</p>
          </div>
        )}
      </div>

      {/* Camera Flip */}
      {isActive && (
        <div className="flex justify-between items-center bg-stone-50 p-2.5 rounded-xl border border-stone-200">
          <span className="text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1">
            <Camera className="w-3.5 h-3.5" /> Lens
          </span>
          <button
            type="button"
            onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
            className="text-[10px] bg-white border border-stone-200 hover:bg-stone-100 font-semibold px-2 py-1 rounded transition"
          >
            Switch to {facingMode === 'environment' ? 'Front' : 'Back'} Cam
          </button>
        </div>
      )}

      {/* Simulator Sandbox */}
      <div className="bg-stone-50/60 border border-stone-200 rounded-xl p-3 space-y-2">
        <div className="flex justify-between items-center">
          <h5 className="text-[10px] font-black text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-800" /> Sim-Scanner Sandbox
          </h5>
          <span className="text-[8px] bg-stone-200 text-stone-600 px-1.5 rounded-md font-bold">Simulator</span>
        </div>
        <p className="text-[10px] text-stone-500">Tap any item to simulate a barcode scan.</p>
        <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => {
                playBeepSound();
                onScanSuccess(p.barcode);
                showToast(`Simulated scan: [${p.sku}]`, 'success');
              }}
              className="bg-white hover:bg-amber-50 border border-stone-150 rounded-lg p-2 text-left transition flex flex-col hover:border-amber-300"
            >
              <span className="text-[10px] font-bold text-stone-800 truncate">{p.name}</span>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[9px] text-amber-800 font-mono font-bold">{p.barcode}</span>
                <span className="text-[8px] bg-stone-100 text-stone-500 px-1 rounded">Stock: {p.stock}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
