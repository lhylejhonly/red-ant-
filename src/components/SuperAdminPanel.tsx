/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShoppingCart, Package, Users, Search, Filter, ChevronDown, ChevronUp,
  MoreVertical, Check, X, Trash2, Edit, Archive, RefreshCw, Calendar,
  DollarSign, CreditCard, FileText, Eye, Copy
} from 'lucide-react';
import { Order, Product, User, Category, Supplier } from '../types';

interface SuperAdminPanelProps {
  orders: Order[];
  products: Product[];
  users: User[];
  categories: Category[];
  suppliers: Supplier[];
  currency: string;
  onUpdateOrderStatus: (orderId: string, status: string, refundReason?: string) => Promise<void>;
  onAddProduct: (prod: any) => Promise<any>;
  onUpdateProduct: (id: string, prod: any) => Promise<any>;
  onDeleteProduct: (id: string) => Promise<any>;
  onAddCategory: (cat: any) => Promise<any>;
  onUpdateUser: (id: string, user: any) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

type TabType = 'orders' | 'products' | 'users';

export default function SuperAdminPanel({
  orders, products, users, categories, suppliers, currency,
  onUpdateOrderStatus, onAddProduct, onUpdateProduct, onDeleteProduct,
  onAddCategory, onUpdateUser, onDeleteUser, showToast
}: SuperAdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Order action modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderActions, setShowOrderActions] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  
  // Product editing states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editStock, setEditStock] = useState(0);
  
  // User editing states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserRole, setEditUserRole] = useState('');
  
  // Filtered data
  const filteredOrders = orders.filter(o => {
    const matchSearch = o.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.cashierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVoidOrder = async (orderId: string) => {
    await onUpdateOrderStatus(orderId, 'Voided');
    setShowOrderActions(false);
    setSelectedOrder(null);
  };

  const handleRefundOrder = async (orderId: string) => {
    if (!refundReason.trim()) {
      showToast('Refund reason is required.', 'error');
      return;
    }
    await onUpdateOrderStatus(orderId, 'Refunded', refundReason);
    setShowOrderActions(false);
    setSelectedOrder(null);
    setRefundReason('');
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    await onUpdateProduct(productId, { stock: newStock });
    setEditingProduct(null);
  };

  const handleUpdateUserRole = async (userId: string, role: string) => {
    await onUpdateUser(userId, { role });
    setEditingUser(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard.', 'success');
  };

  const tabs = [
    { id: 'orders', label: 'Orders', icon: ShoppingCart, count: orders.length },
    { id: 'products', label: 'Products', icon: Package, count: products.length },
    { id: 'users', label: 'Users', icon: Users, count: users.length }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Super Admin Panel</h2>
          <p className="text-sm text-stone-500 mt-1">Comprehensive management of orders, products, and users</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-600">
          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-semibold rounded-lg">Super Admin Access</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                isActive 
                  ? 'bg-white text-amber-800 shadow-sm' 
                  : 'text-stone-600 hover:bg-stone-200/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-amber-100 text-amber-900' : 'bg-stone-200 text-stone-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search orders by receipt or cashier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-stone-200 rounded-xl pl-9 pr-4 py-2 text-xs w-full sm:w-[280px] focus:outline-none focus:ring-1 focus:ring-amber-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Refunded">Refunded</option>
                <option value="Voided">Voided</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50/70 border-b border-stone-200 text-[10px] uppercase font-bold text-stone-500">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                        {order.receiptNumber}
                      </td>
                      <td className="py-3.5 px-4 text-stone-500">
                        {new Date(order.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-stone-700">{order.cashierName}</td>
                      <td className="py-3.5 px-4 text-stone-600">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-stone-900 font-mono">
                        {currency}{order.grandTotal.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                          order.status === 'Refunded' ? 'bg-orange-50 text-orange-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderActions(true);
                            }}
                            className="p-1 text-stone-500 hover:text-amber-800 hover:bg-stone-100 rounded transition"
                            title="View actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => copyToClipboard(order.receiptNumber)}
                            className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition"
                            title="Copy receipt number"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-stone-400">
                        <ShoppingCart className="w-12 h-12 stroke-1 mb-2 mx-auto text-stone-300" />
                        <p className="text-xs font-semibold">No orders found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-stone-200 rounded-xl pl-9 pr-4 py-2 text-xs w-full focus:outline-none focus:ring-1 focus:ring-amber-800"
              />
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50/70 border-b border-stone-200 text-[10px] uppercase font-bold text-stone-500">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Stock</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredProducts.map(product => {
                    const categoryName = categories.find(c => c.id === product.categoryId)?.name || 'General';
                    const isLowStock = product.stock <= product.minStockAlert && product.stock > 0;
                    const isOutOfStock = product.stock === 0;
                    
                    return (
                      <tr key={product.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-8 h-8 object-cover rounded border border-stone-150 shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                              />
                            ) : null}
                            <div className={`w-8 h-8 rounded border border-stone-150 shrink-0 bg-stone-100 flex items-center justify-center text-stone-400 text-[9px] font-bold${product.image ? ' hidden' : ''}`}>
                              IMG
                            </div>
                            <span className="font-semibold text-stone-900 truncate max-w-[180px]">
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-stone-500">{product.sku}</td>
                        <td className="py-3.5 px-4 text-stone-700">{categoryName}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {isOutOfStock ? (
                            <span className="text-red-700">0</span>
                          ) : isLowStock ? (
                            <span className="text-amber-800">{product.stock}</span>
                          ) : (
                            <span className="text-stone-900">{product.stock}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-stone-900 font-mono">
                          {currency}{product.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isOutOfStock ? (
                            <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-[10px]">OOS</span>
                          ) : isLowStock ? (
                            <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">LOW</span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">OK</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setEditStock(product.stock);
                              }}
                              className="p-1 text-stone-500 hover:text-amber-800 hover:bg-stone-100 rounded transition"
                              title="Adjust stock"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${product.name}"? This cannot be undone.`)) {
                                  onDeleteProduct(product.id);
                                }
                              }}
                              className="p-1 text-stone-400 hover:text-red-700 hover:bg-stone-100 rounded transition"
                              title="Archive product"
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
                      <td colSpan={7} className="text-center py-16 text-stone-400">
                        <Package className="w-12 h-12 stroke-1 mb-2 mx-auto text-stone-300" />
                        <p className="text-xs font-semibold">No products found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-stone-200 rounded-xl pl-9 pr-4 py-2 text-xs w-full focus:outline-none focus:ring-1 focus:ring-amber-800"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50/70 border-b border-stone-200 text-[10px] uppercase font-bold text-stone-500">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">2FA</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-stone-900">{user.name}</td>
                      <td className="py-3.5 px-4 text-stone-500">{user.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {user.is2FAEnabled ? (
                          <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                            Enabled
                          </span>
                        ) : (
                          <span className="bg-stone-100 text-stone-600 font-semibold px-2 py-0.5 rounded text-[10px]">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setEditUserRole(user.role);
                            }}
                            className="p-1 text-stone-500 hover:text-amber-800 hover:bg-stone-100 rounded transition"
                            title="Edit user role"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete user ${user.name}?`)) {
                                onDeleteUser(user.id);
                              }
                            }}
                            className="p-1 text-stone-400 hover:text-red-700 hover:bg-stone-100 rounded transition"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-stone-400">
                        <Users className="w-12 h-12 stroke-1 mb-2 mx-auto text-stone-300" />
                        <p className="text-xs font-semibold">No users found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Order Actions Modal */}
      {showOrderActions && selectedOrder && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h4 className="text-base font-bold text-stone-900">Order Actions: {selectedOrder.receiptNumber}</h4>
              <button
                onClick={() => setShowOrderActions(false)}
                className="text-stone-400 hover:text-stone-950 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="text-stone-600">Current Status: 
                  <span className={`ml-2 font-bold ${
                    selectedOrder.status === 'Completed' ? 'text-emerald-700' :
                    selectedOrder.status === 'Refunded' ? 'text-orange-700' : 'text-red-700'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </p>
                <p className="text-stone-600 mt-1">Total: 
                  <span className="ml-2 font-bold text-stone-900">{currency}{selectedOrder.grandTotal.toFixed(2)}</span>
                </p>
              </div>

              {selectedOrder.status === 'Completed' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Refund Reason</label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Reason for refund..."
                      className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none w-full h-20 resize-none mt-1"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleVoidOrder(selectedOrder.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 rounded-xl text-xs transition"
                    >
                      Void Order
                    </button>
                    <button
                      onClick={() => handleRefundOrder(selectedOrder.id)}
                      disabled={!refundReason.trim()}
                      className="flex-1 bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold py-2 rounded-xl text-xs transition disabled:opacity-50"
                    >
                      Process Refund
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h4 className="text-base font-bold text-stone-900">Adjust Stock: {editingProduct.name}</h4>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-stone-400 hover:text-stone-950 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase">Current Stock</label>
                <p className="text-stone-400 mt-1">Min Alert: {editingProduct.minStockAlert}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase">New Stock Level</label>
                <input
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono w-full mt-1"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-2 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStock(editingProduct.id, editStock)}
                  className="flex-1 bg-amber-800 hover:bg-amber-900 text-white font-semibold py-2 rounded-xl text-xs transition"
                >
                  Update Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Role Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h4 className="text-base font-bold text-stone-900">Edit Role: {editingUser.name}</h4>
              <button
                onClick={() => setEditingUser(null)}
                className="text-stone-400 hover:text-stone-950 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase">User Role</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none w-full mt-1"
                >
                  <option>Super Admin</option>
                  <option>Admin</option>
                  <option>Cashier</option>
                  <option>Inventory Manager</option>
                  <option>Accountant</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-2 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateUserRole(editingUser.id, editUserRole)}
                  className="flex-1 bg-amber-800 hover:bg-amber-900 text-white font-semibold py-2 rounded-xl text-xs transition"
                >
                  Save Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}