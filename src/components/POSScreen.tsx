/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Scan, Trash2, Edit3, ArrowRight, Check, Play,
  Tag, CreditCard, DollarSign, Percent, Smartphone, Layers, ShoppingCart,
  Camera
} from 'lucide-react';
import { Product, Category, CartItem, HeldTransaction, PaymentSplit } from '../types';
import QRScannerModal from './QRScannerModal';

interface POSScreenProps {
  products: Product[];
  categories: Category[];
  heldTransactions: HeldTransaction[];
  currency: string;
  taxRate: number;
  serviceChargeRate: number;
  cashierName: string;
  cashierId: string;
  onRecordSale: (saleData: {
    items: any[];
    subtotal: number;
    taxTotal: number;
    serviceCharge: number;
    discountTotal: number;
    grandTotal: number;
    payments: PaymentSplit[];
    amountPaid: number;
    changeAmount: number;
    notes?: string;
  }) => Promise<any>;
  onHoldTransaction: (items: CartItem[], notes?: string) => void;
  onResumeTransaction: (heldId: string) => void;
  onShowReceipt: (order: any) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function POSScreen({
  products, categories, heldTransactions, currency, taxRate, serviceChargeRate,
  cashierName, cashierId, onRecordSale, onHoldTransaction, onResumeTransaction, onShowReceipt, showToast
}: POSScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customCartDiscount, setCustomCartDiscount] = useState<number>(0); // overall discount as %
  const [orderNotes, setOrderNotes] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Payment State
  const [isPaying, setIsPaying] = useState(false);
  const [splits, setSplits] = useState<PaymentSplit[]>([{ method: 'Cash', amount: 0 }]);
  const [cashReceived, setCashReceived] = useState<number>(0);

  // Filter products based on search or category
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.barcode.includes(searchTerm);
    const matchCat = selectedCatId === 'all' || p.categoryId === selectedCatId;
    return matchSearch && matchCat;
  });

  // Add item to cart helper
  const addToCart = (product: Product, selectedColor?: string, selectedSize?: string) => {
    if (product.stock <= 0) {
      showToast(`${product.name} is out of stock!`, 'error');
      return;
    }

    const color = selectedColor || (product.variants.color && product.variants.color[0]) || undefined;
    const size = selectedSize || (product.variants.size && product.variants.size[0]) || undefined;

    setCart(prev => {
      const existingIdx = prev.findIndex(item => 
        item.product.id === product.id && 
        item.selectedColor === color && 
        item.selectedSize === size
      );

      if (existingIdx !== -1) {
        const updatedQty = prev[existingIdx].quantity + 1;
        if (updatedQty > product.stock) {
          showToast(`Cannot exceed available stock (${product.stock} units).`, 'error');
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx].quantity = updatedQty;
        return updated;
      }

      return [...prev, {
        product,
        quantity: 1,
        selectedColor: color,
        selectedSize: size
      }];
    });
    showToast(`Added ${product.name} to transaction cart.`, 'success');
  };

  // Update quantity
  const updateQty = (idx: number, delta: number) => {
    setCart(prev => {
      const item = prev[idx];
      const nextQty = item.quantity + delta;
      if (nextQty <= 0) {
        const updated = [...prev];
        updated.splice(idx, 1);
        return updated;
      }
      if (nextQty > item.product.stock) {
        showToast(`Stock limit reached for ${item.product.name}.`, 'error');
        return prev;
      }
      const updated = [...prev];
      updated[idx].quantity = nextQty;
      return updated;
    });
  };

  // Update item level custom discount (percent)
  const updateItemDiscount = (idx: number, discountPercent: number) => {
    setCart(prev => {
      const updated = [...prev];
      updated[idx].customDiscount = Math.min(100, Math.max(0, discountPercent));
      return updated;
    });
  };

  // Barcode scanner gun handler — fires on Enter (sent automatically by scanner gun)
  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBarcode = barcodeInput.trim();
    if (!cleanBarcode) return;
    const matched = products.find(p => p.barcode === cleanBarcode || p.sku.toLowerCase() === cleanBarcode.toLowerCase());
    if (matched) {
      addToCart(matched);
    } else {
      showToast(`No product found for: "${cleanBarcode}"`, 'error');
    }
    setBarcodeInput('');
    barcodeRef.current?.focus();
  };

  // Real Camera QR / Barcode Scan Handler
  const handleCameraScanSuccess = (decodedText: string) => {
    const cleanBarcode = decodedText.trim();
    if (!cleanBarcode) return;

    const matched = products.find(p => p.barcode === cleanBarcode || p.sku.toLowerCase() === cleanBarcode.toLowerCase());
    if (matched) {
      addToCart(matched);
    } else {
      showToast(`No item matches Barcode/QR: "${cleanBarcode}"`, 'error');
    }
  };


  const getSubtotal = () => {
    return cart.reduce((sum, item) => {
      const basePrice = item.product.sellingPrice;
      const productDiscount = basePrice * (item.product.discountRate / 100);
      const customDiscount = basePrice * ((item.customDiscount || 0) / 100);
      const effectivePrice = Math.max(0, basePrice - productDiscount - customDiscount);
      return sum + (effectivePrice * item.quantity);
    }, 0);
  };

  const getSubtotalBeforeDiscount = () => {
    return cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  };

  const subtotal = getSubtotal();
  const rawSubtotalBeforeDiscount = getSubtotalBeforeDiscount();
  const overallDiscountApplied = rawSubtotalBeforeDiscount * (customCartDiscount / 100);
  const subtotalAfterOverallDiscount = Math.max(0, subtotal - overallDiscountApplied);

  const grandTotal = subtotalAfterOverallDiscount;

  // Split payment configuration
  const handleSplitMethodAmountChange = (splitIdx: number, value: number) => {
    setSplits(prev => {
      const updated = [...prev];
      updated[splitIdx].amount = Math.max(0, value);
      return updated;
    });
  };

  const addSplit = () => {
    setSplits(prev => [...prev, { method: 'Credit Card', amount: 0 }]);
  };

  const removeSplit = (idx: number) => {
    setSplits(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSplitMethodNameChange = (idx: number, method: any) => {
    setSplits(prev => {
      const updated = [...prev];
      updated[idx].method = method;
      return updated;
    });
  };

  const totalSplitPaid = splits.reduce((sum, s) => sum + s.amount, 0);
  const remainingToPay = Math.max(0, grandTotal - totalSplitPaid);

  // Submit Completed Sale
  const handleProcessPaymentSubmit = async () => {
    // Validate split payment
    if (splits.length === 1 && splits[0].method === 'Cash') {
      if (cashReceived < grandTotal) {
        showToast(`Insufficient cash received. Need at least ${currency}${grandTotal.toFixed(2)}`, 'error');
        return;
      }
      splits[0].amount = grandTotal;
    } else {
      if (Math.abs(totalSplitPaid - grandTotal) > 0.05) {
        showToast(`Split payments must sum exactly to the Grand Total of ${currency}${grandTotal.toFixed(2)}. Current total: ${currency}${totalSplitPaid.toFixed(2)}`, 'error');
        return;
      }
    }

    const finalPaid = splits[0].method === 'Cash' && splits.length === 1 ? cashReceived : grandTotal;
    const finalChange = Math.max(0, finalPaid - grandTotal);

    const itemsForPayload = cart.map(item => {
      const lineDisc = item.product.sellingPrice * (item.product.discountRate / 100) + item.product.sellingPrice * ((item.customDiscount || 0) / 100);
      const finalPrice = Math.max(0, item.product.sellingPrice - lineDisc);
      return {
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        sellingPrice: item.product.sellingPrice,
        cost: item.product.cost,
        taxPaid: finalPrice * (item.product.taxRate / 100) * item.quantity,
        discountApplied: lineDisc * item.quantity,
        variantInfo: [item.selectedColor, item.selectedSize].filter(Boolean).join(' / ') || 'Standard'
      };
    });

    try {
      const orderRes = await onRecordSale({
        items: itemsForPayload,
        subtotal: subtotalAfterOverallDiscount,
        taxTotal: 0,
        serviceCharge: 0,
        discountTotal: overallDiscountApplied + cart.reduce((sum, item) => sum + (item.product.sellingPrice * ((item.customDiscount || 0) / 100) * item.quantity), 0),
        grandTotal,
        payments: splits,
        amountPaid: finalPaid,
        changeAmount: finalChange,
        notes: orderNotes
      });

      if (orderRes) {
        setIsPaying(false);
        setCart([]);
        setCustomCartDiscount(0);
        setOrderNotes('');
        setSplits([{ method: 'Cash', amount: 0 }]);
        setCashReceived(0);
        onShowReceipt(orderRes);
      }
    } catch (err) {
      showToast('Error finalizing transaction.', 'error');
    }
  };

  // Hold active cart
  const handleHold = () => {
    if (cart.length === 0) {
      showToast('Cannot hold an empty transaction.', 'error');
      return;
    }
    onHoldTransaction(cart, orderNotes || 'POS Terminal Hold');
    setCart([]);
    setOrderNotes('');
  };

  const handleResume = (hold: HeldTransaction) => {
    onResumeTransaction(hold.id);
    setCart(hold.items);
    setOrderNotes(hold.notes || '');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      
      {/* LEFT: Product Catalog, Filters, Search & Simulation (8 Columns) */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        
        {/* Search, Category Bar & Scanning simulator */}
        <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
              <input 
                type="text" 
                placeholder="Search products by SKU, name, or barcode..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 shrink-0">
              <form onSubmit={handleBarcodeScan} className="flex gap-2 items-center">
                <div className="relative">
                  <Scan className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  <input 
                    ref={barcodeRef}
                    type="text" 
                    placeholder="Ready to scan..." 
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onBlur={(e) => { if (!(e.relatedTarget instanceof HTMLInputElement || e.relatedTarget instanceof HTMLSelectElement || e.relatedTarget instanceof HTMLTextAreaElement || e.relatedTarget instanceof HTMLButtonElement)) { setTimeout(() => barcodeRef.current?.focus(), 100); } }}
                    className="bg-amber-50 border-2 border-amber-300 rounded-xl pl-8 pr-3 py-2 text-xs w-[150px] focus:outline-none focus:border-amber-600 font-mono"
                  />
                </div>
              </form>

              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="bg-amber-800 text-amber-50 hover:bg-amber-900 rounded-xl px-3.5 py-2.5 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
              >
                <Camera className="w-3.5 h-3.5" /> Camera Scan
              </button>
            </div>
          </div>

          {/* Categories Horizontal Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button 
              onClick={() => setSelectedCatId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                selectedCatId === 'all' 
                ? 'bg-amber-800 text-white shadow-sm' 
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                  selectedCatId === cat.id 
                  ? 'bg-amber-800 text-white shadow-sm' 
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[500px] pr-1">
          {filteredProducts.map(p => {
            const hasDiscount = p.discountRate > 0;
            const finalPrice = Math.max(0, p.sellingPrice - (p.sellingPrice * (p.discountRate / 100)));
            const isLowStock = p.stock <= p.minStockAlert && p.stock > 0;
            const isOutOfStock = p.stock === 0;

            return (
              <div 
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`bg-white border border-stone-200 p-3 rounded-2xl flex flex-col justify-between transition-all duration-300 relative group select-none ${
                  isOutOfStock 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:shadow-md hover:border-amber-300 active:scale-95'
                }`}
              >
                {/* Image Placeholder or Actual link */}
                <div className="aspect-square w-full bg-stone-100 rounded-xl overflow-hidden relative">
                  {p.image ? (
                    <img 
                      src={p.image} 
                      alt={p.name}
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs font-semibold">No Image</div>
                  )}
                  {hasDiscount && (
                    <span className="absolute top-2 left-2 bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                      -{p.discountRate}% OFF
                    </span>
                  )}
                  {isOutOfStock ? (
                    <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center">
                      <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded">OUT OF STOCK</span>
                    </div>
                  ) : isLowStock ? (
                    <span className="absolute bottom-2 right-2 bg-amber-500 text-amber-950 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Low Stock ({p.stock})
                    </span>
                  ) : (
                    <span className="absolute bottom-2 right-2 bg-stone-900/80 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                      Qty: {p.stock}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="mt-2 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-amber-800 font-semibold uppercase">{p.brand}</span>
                    <h5 className="text-xs font-semibold text-stone-900 line-clamp-2 mt-0.5 group-hover:text-amber-900 transition">{p.name}</h5>
                  </div>
                  
                  <div className="mt-2 flex justify-between items-center">
                    <div className="flex flex-col">
                      {hasDiscount ? (
                        <>
                          <span className="text-[10px] text-stone-400 line-through">{currency}{p.sellingPrice.toFixed(2)}</span>
                          <span className="text-xs font-bold text-orange-700">{currency}{finalPrice.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-stone-900">{currency}{p.sellingPrice.toFixed(2)}</span>
                      )}
                    </div>
                    <span className="bg-stone-50 border border-stone-200 p-1 rounded-lg text-[10px] font-mono text-stone-500 group-hover:bg-amber-50 group-hover:text-amber-900 transition">
                      {p.sku}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-stone-400 bg-white border border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center">
              <Layers className="w-10 h-10 stroke-1 mb-2" />
              <p className="text-xs font-semibold">No catalog items matches the search.</p>
              <p className="text-[10px] mt-0.5">Try searching for other items or check categories filter.</p>
            </div>
          )}
        </div>

        {/* Resumable held transactions list */}
        {heldTransactions.length > 0 && (
          <div className="bg-amber-900/5 border border-amber-900/10 p-3.5 rounded-2xl">
            <h5 className="text-xs font-bold text-amber-950 flex items-center gap-1.5 mb-2">
              <Play className="w-3.5 h-3.5" /> Hold-Suspended Transactions ({heldTransactions.length})
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {heldTransactions.map(hold => (
                <div key={hold.id} className="bg-white p-2.5 rounded-xl border border-amber-900/15 flex justify-between items-center shadow-xs">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-900 truncate">Hold: {hold.notes}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      {hold.items.reduce((sum, item) => sum + item.quantity, 0)} items • {new Date(hold.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleResume(hold)}
                    className="bg-amber-800 text-white hover:bg-amber-900 font-semibold text-[10px] px-2.5 py-1 rounded-lg transition"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Transaction Cart & Pricing Summary (4 Columns) */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm flex flex-col h-[580px] justify-between relative">
          
          {/* Header */}
          <div className="p-4 border-b border-stone-100 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-stone-900">Current Cart</h4>
              <p className="text-[10px] text-stone-400">Terminal: {cashierName} (IP: 192.168.1.15)</p>
            </div>
            <button 
              onClick={() => { setCart([]); setOrderNotes(''); }}
              disabled={cart.length === 0}
              className="text-stone-400 hover:text-red-700 disabled:opacity-40 p-1.5 hover:bg-stone-50 rounded-lg transition"
              title="Void Active Cart"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Item Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {cart.map((item, index) => {
              const productDiscount = item.product.sellingPrice * (item.product.discountRate / 100);
              const customDisc = item.product.sellingPrice * ((item.customDiscount || 0) / 100);
              const linePrice = Math.max(0, item.product.sellingPrice - productDiscount - customDisc);

              return (
                <div key={`${item.product.id}-${item.selectedColor}-${item.selectedSize}`} className="p-2.5 bg-stone-50 border border-stone-150 rounded-xl flex flex-col gap-1.5">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-stone-900 truncate">{item.product.name}</h5>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        {item.selectedColor && `Color: ${item.selectedColor} `}
                        {item.selectedSize && `Size: ${item.selectedSize}`}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-stone-900 ml-2">{currency}{(linePrice * item.quantity).toFixed(2)}</span>
                  </div>

                  {/* Quantity and Custom Discount Row */}
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center border border-stone-200 bg-white rounded-lg">
                      <button 
                        onClick={() => updateQty(index, -1)}
                        className="px-2 py-1 text-stone-600 hover:bg-stone-100 rounded-l-lg"
                      >
                        -
                      </button>
                      <span className="px-3 text-xs font-semibold font-mono">{item.quantity}</span>
                      <button 
                        onClick={() => updateQty(index, 1)}
                        className="px-2 py-1 text-stone-600 hover:bg-stone-100 rounded-r-lg"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-stone-500 flex items-center gap-0.5"><Percent className="w-3 h-3 text-amber-700" /> Item Disc%:</span>
                      <input 
                        type="number" 
                        value={item.customDiscount || ''}
                        placeholder="0"
                        onChange={(e) => updateItemDiscount(index, parseInt(e.target.value) || 0)}
                        className="w-12 border border-stone-200 bg-white text-xs font-mono px-1 py-0.5 rounded text-center focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-stone-400 py-16 text-center space-y-3">
                <ShoppingCart className="w-12 h-12 stroke-1 text-stone-300 mx-auto" />
                <div>
                  <p className="text-xs font-semibold text-stone-700">Terminal order is currently empty</p>
                  <p className="text-[10px] mt-1 max-w-[200px] text-stone-400 mx-auto">Click catalog items, scan a barcode, or trigger the live camera scanner below.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 mx-auto"
                >
                  <Camera className="w-3.5 h-3.5" /> Open Scan Console
                </button>
              </div>
            )}
          </div>

          {/* Pricing Summary and Actions Section */}
          <div className="p-4 border-t border-stone-100 bg-stone-50/50 rounded-b-2xl space-y-3 shrink-0">
            {/* Notes & Discount controls */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Cart Discount%</label>
                <input 
                  type="number" 
                  value={customCartDiscount || ''}
                  placeholder="0% OFF"
                  onChange={(e) => setCustomCartDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Order Note</label>
                <input 
                  type="text" 
                  placeholder="Memo, seat, name..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Price lines */}
            <div className="space-y-1 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{currency}{subtotal.toFixed(2)}</span>
              </div>
              {customCartDiscount > 0 && (
                <div className="flex justify-between text-orange-700 font-medium">
                  <span>Cart Discount ({customCartDiscount}%)</span>
                  <span>-{currency}{overallDiscountApplied.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-900 font-bold text-sm border-t border-dashed border-stone-200 pt-1.5 mt-1.5">
                <span>Grand Total</span>
                <span className="text-amber-900 text-base">{currency}{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1.5">
              <button 
                onClick={handleHold}
                disabled={cart.length === 0}
                className="bg-stone-200 hover:bg-stone-300 disabled:opacity-40 text-stone-800 rounded-xl py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                Hold Order
              </button>
              <button 
                onClick={() => {
                  if (cart.length === 0) {
                    showToast('Cannot checkout an empty cart.', 'error');
                    return;
                  }
                  setSplits([{ method: 'Cash', amount: grandTotal }]);
                  setCashReceived(Math.ceil(grandTotal / 5) * 5);
                  setIsPaying(true);
                }}
                className="bg-amber-800 hover:bg-amber-900 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
              >
                Proceed to Pay <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PAYMENT SLIP MODAL OVERLAY */}
          {isPaying && (
            <div className="absolute inset-0 bg-stone-900/90 rounded-2xl p-4 flex flex-col justify-between animate-fade-in z-20">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-white">Payment Terminals</h4>
                    <p className="text-[10px] text-stone-400">Process split payment or immediate cash</p>
                  </div>
                  <button 
                    onClick={() => setIsPaying(false)}
                    className="text-stone-400 hover:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                <div className="text-center bg-stone-800/40 border border-stone-700/50 p-3 rounded-xl">
                  <span className="text-[10px] text-stone-400 uppercase font-bold">Total Bill Due</span>
                  <h3 className="text-2xl font-black text-amber-500 font-mono mt-0.5">
                    {currency}{grandTotal.toFixed(2)}
                  </h3>
                </div>

                {/* Multiple Payment Methods Split List */}
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {splits.map((split, idx) => (
                    <div key={idx} className="bg-stone-800/60 p-2.5 rounded-xl border border-stone-700 flex flex-col gap-2">
                      <div className="flex justify-between items-center gap-2">
                        <select 
                          value={split.method}
                          onChange={(e: any) => handleSplitMethodNameChange(idx, e.target.value)}
                          className="bg-stone-900 border border-stone-700 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none"
                        >
                          <option value="Cash">💵 Cash</option>
                          <option value="Credit Card">💳 Credit Card</option>
                          <option value="Debit Card">💳 Debit Card</option>
                          <option value="GCash">📱 GCash</option>
                          <option value="Maya">📱 Maya</option>
                          <option value="Bank Transfer">🏦 Bank Transfer</option>
                          <option value="QR Payment">🔳 QR Payment</option>
                        </select>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-stone-400 text-xs font-mono">{currency}</span>
                          <input 
                            type="number" 
                            value={split.amount || ''}
                            placeholder="Amount"
                            onChange={(e) => handleSplitMethodAmountChange(idx, parseFloat(e.target.value) || 0)}
                            className="bg-stone-900 border border-stone-700 text-stone-100 text-xs rounded px-2 py-1 w-24 text-right font-mono focus:outline-none"
                          />
                        </div>

                        {splits.length > 1 && (
                          <button 
                            onClick={() => removeSplit(idx)}
                            className="text-red-500 hover:text-red-400 text-xs px-1.5"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {splits.length === 1 && splits[0].method === 'Cash' && (
                    <div className="bg-stone-800/40 p-2.5 rounded-xl border border-stone-700/40 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-stone-400 uppercase">Cash Amount Received</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          value={cashReceived || ''}
                          onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                          className="flex-1 bg-stone-950 border border-stone-700 text-amber-400 font-bold font-mono px-3 py-1.5 rounded-lg text-sm focus:outline-none"
                        />
                        {/* Quick cash denomination buttons */}
                        <div className="flex gap-1">
                          {[50, 100, 500, 1000].map(val => (
                            <button 
                              key={val}
                              onClick={() => setCashReceived(prev => (prev || 0) + val)}
                              className="bg-stone-700 text-white hover:bg-stone-600 px-2 py-1 rounded text-[10px] font-semibold"
                            >
                              +{val}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {cashReceived >= grandTotal && (
                        <div className="flex justify-between items-center text-xs text-emerald-400 font-mono mt-1">
                          <span>Change Output:</span>
                          <span className="font-bold">{currency}{(cashReceived - grandTotal).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Split management and checks */}
                <div className="flex justify-between items-center text-xs pt-1 border-t border-stone-800">
                  <button 
                    onClick={addSplit}
                    className="text-amber-500 hover:text-amber-400 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    + Add Split Method
                  </button>

                  {splits.length > 1 && (
                    <div className="text-right text-[11px] font-mono">
                      <p className="text-stone-400">Paid: {currency}{totalSplitPaid.toFixed(2)}</p>
                      {remainingToPay > 0 ? (
                        <p className="text-red-400">Remaining: {currency}{remainingToPay.toFixed(2)}</p>
                      ) : (
                        <p className="text-emerald-400">Fully Allocated!</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm payment */}
              <button 
                onClick={handleProcessPaymentSubmit}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 mt-4"
              >
                <Check className="w-4 h-4" /> Finalize Terminal Transaction
              </button>
            </div>
          )}
        </div>
      </div>

      <QRScannerModal 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleCameraScanSuccess}
        products={products}
        showToast={showToast}
      />

      {/* Floating Action Button (FAB) for Barcode & QR Scanner */}
      <div className="fixed bottom-6 right-6 z-40 group">
        <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-600 to-amber-900 rounded-full blur-xs opacity-65 group-hover:opacity-100 transition duration-300 animate-pulse pointer-events-none"></div>
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="relative bg-amber-800 hover:bg-amber-900 text-white p-4 rounded-full shadow-2xl flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-amber-500"
          title="Instant camera scanner"
        >
          <Camera className="w-5 h-5 animate-bounce group-hover:animate-none text-white" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out text-xs font-black uppercase tracking-wider whitespace-nowrap text-amber-50">
            Scan Product
          </span>
        </button>
      </div>
    </div>
  );
}
