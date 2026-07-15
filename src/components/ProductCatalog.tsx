/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Edit, Archive, Check, X, Filter, Sparkles, Tag, 
  FolderPlus, DollarSign, PackageOpen, LayoutGrid, Search 
} from 'lucide-react';
import { Product, Category, Supplier } from '../types';

interface ProductCatalogProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  currency: string;
  onAddProduct: (prod: any) => Promise<any>;
  onUpdateProduct: (id: string, prod: any) => Promise<any>;
  onDeleteProduct: (id: string) => Promise<any>;
  onAddCategory: (cat: any) => Promise<any>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function ProductCatalog({
  products, categories, suppliers, currency, onAddProduct, onUpdateProduct, onDeleteProduct, onAddCategory, showToast
}: ProductCatalogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Product Form State
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [cost, setCost] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStockAlert, setMinStockAlert] = useState(5);
  const [taxRate, setTaxRate] = useState(12);
  const [discountRate, setDiscountRate] = useState(0);
  const [warranty, setWarranty] = useState('N/A');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isDigital, setIsDigital] = useState(false);
  const [isEssential, setIsEssential] = useState(false);

  // Variant States
  const [variantColorString, setVariantColorString] = useState('');
  const [variantSizeString, setVariantSizeString] = useState('');

  // Category Add Modal
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Search & Filter
  const [catFilter, setCatFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(p => {
    const matchCat = catFilter === 'all' || p.categoryId === catFilter;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleOpenAdd = () => {
    setEditId(null);
    setSku(`SKU-${Date.now().toString().slice(-6)}`);
    setBarcode(Math.floor(100000000000 + Math.random() * 900000000000).toString());
    setName('');
    setDescription('');
    setCategoryId(categories[0]?.id || '');
    setBrand('');
    setSupplierId(suppliers[0]?.id || '');
    setCost(10);
    setSellingPrice(25);
    setWholesalePrice(18);
    setStock(20);
    setMinStockAlert(5);
    setTaxRate(12);
    setDiscountRate(0);
    setWarranty('N/A');
    setImageUrl('');
    setImagePreview('');
    setVariantColorString('Rustic Terracotta, Sand Cream');
    setVariantSizeString('Standard');
    setIsDigital(false);
    setIsEssential(false);
    setIsEditing(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditId(p.id);
    setSku(p.sku);
    setBarcode(p.barcode);
    setName(p.name);
    setDescription(p.description || '');
    setCategoryId(p.categoryId);
    setBrand(p.brand);
    setSupplierId(p.supplierId);
    setCost(p.cost);
    setSellingPrice(p.sellingPrice);
    setWholesalePrice(p.wholesalePrice);
    setStock(p.stock);
    setMinStockAlert(p.minStockAlert);
    setTaxRate(p.taxRate);
    setDiscountRate(p.discountRate);
    setWarranty(p.warranty || 'N/A');
    setImageUrl(p.image);
    setImagePreview(p.image);
    setVariantColorString(p.variants.color?.join(', ') || '');
    setVariantSizeString(p.variants.size?.join(', ') || '');
    setIsDigital(p.isDigital || false);
    setIsEssential(p.isEssential || false);
    setIsEditing(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !barcode) {
      showToast('Please provide Product Name, SKU and Barcode.', 'error');
      return;
    }

    const payload = {
      sku,
      barcode,
      name,
      description,
      categoryId,
      brand,
      supplierId,
      cost: parseFloat(cost.toString()) || 0,
      sellingPrice: parseFloat(sellingPrice.toString()) || 0,
      wholesalePrice: parseFloat(wholesalePrice.toString()) || 0,
      stock: parseInt(stock.toString()) || 0,
      minStockAlert: parseInt(minStockAlert.toString()) || 0,
      taxRate: parseFloat(taxRate.toString()) || 0,
      discountRate: parseFloat(discountRate.toString()) || 0,
      warranty,
      image: imageUrl,
      variants: {
        color: variantColorString ? variantColorString.split(',').map(s => s.trim()).filter(Boolean) : [],
        size: variantSizeString ? variantSizeString.split(',').map(s => s.trim()).filter(Boolean) : []
      },
      isDigital,
      isEssential
    };

    try {
      let result;
      if (editId) {
        result = await onUpdateProduct(editId, payload);
        if (result) showToast(`Successfully updated product: ${name}`, 'success');
      } else {
        result = await onAddProduct(payload);
        if (result) showToast(`Successfully created new product: ${name}`, 'success');
      }
      if (result) setIsEditing(false);
    } catch (err) {
      showToast('Error saving product records.', 'error');
    }
  };

  const handleArchive = async (p: Product) => {
    if (window.confirm(`Delete "${p.name}"? This cannot be undone.`)) {
      try {
        await onDeleteProduct(p.id);
        showToast(`${p.name} has been deleted.`, 'success');
      } catch (err) {
        showToast('Error deleting product.', 'error');
      }
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      await onAddCategory({ name: newCatName, description: newCatDesc });
      showToast(`Category "${newCatName}" created successfully!`, 'success');
      setNewCatName('');
      setNewCatDesc('');
      setIsAddingCategory(false);
    } catch (err) {
      showToast('Error creating category.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upper Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-stone-200 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input 
              type="text" 
              placeholder="Filter products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2 text-xs w-[220px] focus:outline-none focus:ring-1 focus:ring-amber-800"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select 
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <FolderPlus className="w-4 h-4" /> Add Category
          </button>
          <button 
            onClick={handleOpenAdd}
            className="bg-amber-800 hover:bg-amber-900 text-white rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> New Product SKU
          </button>
        </div>
      </div>

      {/* Primary Products Bento Grid List */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50/70 border-b border-stone-200 text-[10px] uppercase font-bold text-stone-500">
              <tr>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">SKU & Barcode</th>
                <th className="py-3 px-4">Collection</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">In Stock</th>
                <th className="py-3 px-4 text-center">Variants</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.map(p => {
                const categoryName = categories.find(c => c.id === p.categoryId)?.name || 'General';
                const isLowStock = p.stock <= p.minStockAlert && p.stock > 0;
                const isOutOfStock = p.stock === 0;

                return (
                  <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img 
                            src={p.image} 
                            alt={p.name} 
                            className="w-10 h-10 object-cover rounded-lg border border-stone-150 shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 rounded-lg border border-stone-150 shrink-0 bg-stone-100 flex items-center justify-center text-stone-400 text-[10px] font-bold${p.image ? ' hidden' : ''}`}>
                          IMG
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-stone-900 truncate max-w-[200px]">{p.name}</h5>
                            {p.isEssential && (
                              <span className="shrink-0 bg-amber-100 text-amber-900 border border-amber-200 text-[9px] px-1 py-0.5 rounded-xs font-semibold flex items-center gap-0.5">
                                ★ Essential
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-amber-800 font-semibold">{p.brand}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-stone-500">
                      <p>SKU: <span className="text-stone-900 font-medium">{p.sku}</span></p>
                      <p className="mt-0.5">BC: {p.barcode}</p>
                    </td>
                    <td className="py-3.5 px-4 text-stone-700">
                      <span className="bg-stone-100 px-2 py-0.5 rounded text-[10px] font-medium">{categoryName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-stone-500">
                      {currency}{p.cost.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-stone-900 font-mono">
                      {currency}{p.sellingPrice.toFixed(2)}
                      {p.discountRate > 0 && (
                        <p className="text-[9px] text-orange-600 font-bold">-{p.discountRate}% Off</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isOutOfStock ? (
                        <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-[10px]">OOS (0)</span>
                      ) : isLowStock ? (
                        <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">Low ({p.stock})</span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] font-mono">{p.stock}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-wrap gap-0.5 justify-center max-w-[120px] mx-auto">
                        {p.variants.color?.map(col => (
                          <span key={col} className="text-[8px] bg-stone-100 text-stone-600 px-1 py-0.2 rounded-sm truncate max-w-[50px]">{col}</span>
                        ))}
                        {p.variants.size?.map(sz => (
                          <span key={sz} className="text-[8px] bg-stone-150 text-stone-800 px-1 py-0.2 rounded-sm">{sz}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 text-stone-500 hover:text-amber-800 hover:bg-stone-100 rounded transition"
                          title="Edit product"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleArchive(p)}
                          className="p-1 text-stone-400 hover:text-red-700 hover:bg-stone-100 rounded transition"
                          title="Archive SKU"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-stone-400">
                    <div className="flex flex-col items-center justify-center">
                      <PackageOpen className="w-12 h-12 stroke-1 mb-2 text-stone-300" />
                      <p className="text-xs font-semibold">No product entries available.</p>
                      <p className="text-[10px]">Try clearing searches or add new single-origin products.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE & EDIT OVERLAY DRAWER FORM */}
      {isEditing && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-2xl w-full overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-800" />
                {editId ? `Update Core SKU: ${sku}` : 'Add New Artisanal SKU'}
              </h4>
              <button onClick={() => setIsEditing(false)} className="text-stone-400 hover:text-stone-950 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Row 1: Name & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Product Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Single-Origin Gesha Honey"
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Brand / Manufacturer</label>
                  <input 
                    type="text" 
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Andean Highlands"
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: SKU, Barcode, Image Link */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">SKU Reference</label>
                  <input 
                    type="text" 
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Barcode (EAN-13)</label>
                  <input 
                    type="text" 
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Product Image</label>
                  <label className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-500 cursor-pointer hover:bg-stone-100 transition text-center">
                    {imagePreview ? 'Change Image' : 'Upload PNG / JPEG'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const img = new Image();
                        const objectUrl = URL.createObjectURL(file);
                        img.onload = () => {
                          URL.revokeObjectURL(objectUrl);
                          const MAX = 600;
                          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                          const canvas = document.createElement('canvas');
                          canvas.width = Math.round(img.width * scale);
                          canvas.height = Math.round(img.height * scale);
                          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                          const result = canvas.toDataURL('image/jpeg', 0.75);
                          setImageUrl(result);
                          setImagePreview(result);
                        };
                        img.src = objectUrl;
                      }}
                    />
                  </label>
                  {imagePreview && (
                    <img src={imagePreview} alt="preview" className="mt-1 w-full h-16 object-cover rounded-lg border border-stone-200" />
                  )}
                </div>
              </div>

              {/* Row 3: Category, Supplier, Warranty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Product Category</label>
                  <select 
                    value={categoryId} 
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Active Supplier</label>
                  <select 
                    value={supplierId} 
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Warranty Coverage</label>
                  <input 
                    type="text" 
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    placeholder="e.g. 1 Year Guarantee"
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Cost, Selling Price, Wholesale */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-stone-100 pt-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Cost Price ({currency})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={cost || ''}
                    onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Retail Selling Price ({currency})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={sellingPrice || ''}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Wholesale Price ({currency})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={wholesalePrice || ''}
                    onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 5: Stock levels, Taxes & Discounts */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Starting Stock</label>
                  <input 
                    type="number" 
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Min Alert Limit</label>
                  <input 
                    type="number" 
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 0)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Tax Rate (VAT%)</label>
                  <input 
                    type="number" 
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Campaign Discount%</label>
                  <input 
                    type="number" 
                    value={discountRate}
                    onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 5.5: Essential tracking toggle */}
              <div className="flex items-center gap-2 py-2.5 bg-amber-50/50 border border-amber-150/60 px-3 rounded-xl">
                <input 
                  type="checkbox" 
                  id="isEssential" 
                  checked={isEssential}
                  onChange={(e) => setIsEssential(e.target.checked)}
                  className="rounded border-stone-300 text-amber-800 focus:ring-amber-800 cursor-pointer w-4 h-4"
                />
                <label htmlFor="isEssential" className="text-xs font-bold text-stone-800 cursor-pointer flex flex-wrap items-center gap-1 select-none">
                  ⭐ Mark as Essential Priority Item
                  <span className="text-[10px] font-normal text-stone-500">
                    (Automatically triggers priority low-stock summary reports to the Inventory Manager when stock drops)
                  </span>
                </label>
              </div>

              {/* Row 6: Variants Configuration */}
              <div className="border-t border-stone-100 pt-3 space-y-2">
                <h5 className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Product Variants (Comma Separated list)</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Color Options</label>
                    <input 
                      type="text" 
                      value={variantColorString}
                      onChange={(e) => setVariantColorString(e.target.value)}
                      placeholder="Rustic Terracotta, Sand Cream, Sand Beige"
                      className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Size Options</label>
                    <input 
                      type="text" 
                      value={variantSizeString}
                      onChange={(e) => setVariantSizeString(e.target.value)}
                      placeholder="250g, 500g, 1kg"
                      className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">SKU Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell clients about this collection piece..."
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none h-16 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl px-4 py-2 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-amber-800 hover:bg-amber-900 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition flex items-center gap-1"
                >
                  <Check className="w-4 h-4" /> Save SKU Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL DIALOG */}
      {isAddingCategory && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-800" /> Create Specialty Category
              </h4>
              <button onClick={() => setIsAddingCategory(false)} className="text-stone-400 hover:text-stone-950 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-4 space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Category Name</label>
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Handcrafted Leatherwear"
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Brief Description</label>
                <textarea 
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Collection detailing..."
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button 
                  type="button" 
                  onClick={() => setIsAddingCategory(false)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg px-3 py-1.5 text-xs transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-amber-800 hover:bg-amber-900 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
