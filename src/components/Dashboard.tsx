/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, 
  Package, AlertTriangle, ArrowRight, Activity, BarChart3, RefreshCw 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { Order, Product, Category } from '../types';
import { useAnalytics } from '../hooks/useAnalytics';
import { useChartData } from '../hooks/useChartData';
import { AnimatedCounter } from './AnimatedCounter';
import { SkeletonCard, SkeletonChart, SkeletonTable } from './SkeletonLoaders';

interface DashboardProps {
  analytics: any;
  products: Product[];
  currency: string;
  onNavigate: (view: string) => void;
  userRole?: string;
  auditLogs?: any[];
  onRefresh?: () => void;
}

type TimeRange = 'today' | 'week' | 'month' | 'year';

const COLORS = ['#8B5A2B', '#CD853F', '#D2B48C', '#DEB887', '#F5F5DC', '#A0522D'];

export default function Dashboard({ analytics, products, currency, onNavigate, userRole, auditLogs = [], onRefresh }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const { metrics, isLoading, refetch, orders } = useAnalytics();
  
  const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Admin';
  
  const categories: Category[] = useMemo(() => [
    { id: 'cat_1', name: 'Coffee & Beverages' },
    { id: 'cat_2', name: 'Stoneware & Tableware' },
    { id: 'cat_3', name: 'Linen & Apparel' },
    { id: 'cat_4', name: 'Brewing Accessories' },
    { id: 'cat_5', name: 'Delicacies & Chocolate' }
  ], []);
  
  const days = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
  const { salesTrend, topProducts, categoryBreakdown, paymentBreakdown } = useChartData(orders, products, [], categories, days);

  const lowStockItems = products.filter(p => p.stock <= p.minStockAlert && p.stock > 0);
  const outOfStockItems = products.filter(p => p.stock === 0);
  const recentTransactions = orders.slice(0, 10);
  
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><SkeletonChart /></div>
          <SkeletonChart />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonTable />
          <div className="lg:col-span-2"><SkeletonTable /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {isSuperAdmin ? (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">Dashboard Overview</h2>
              <p className="text-sm text-stone-500 mt-1">Real-time analytics and performance metrics</p>
            </div>
            <button 
              onClick={() => { refetch(); onRefresh?.(); }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold transition"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
          {/* Upper Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div id="card-today-sales" className="bg-gradient-to-br from-amber-50 to-orange-100/50 border border-amber-200/60 p-5 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-amber-800">Today's Sales</p>
              <h3 className="text-2xl font-bold text-amber-950 mt-1">
                {currency}<AnimatedCounter value={metrics.todaySales} decimals={2} />
              </h3>
            </div>
            <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-800">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-800/80">
            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold ${
              metrics.todayGrowth >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
            }`}>
              {metrics.todayGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {metrics.todayGrowth >= 0 ? '+' : ''}{metrics.todayGrowth.toFixed(1)}%
            </span>
            <span>vs. yesterday</span>
          </div>
        </div>

        <div id="card-today-profit" className="bg-gradient-to-br from-stone-50 to-stone-150/50 border border-stone-200/60 p-5 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-stone-700">Today's Net Profit</p>
              <h3 className="text-2xl font-bold text-stone-900 mt-1">
                {currency}<AnimatedCounter value={metrics.todayProfit} decimals={2} />
              </h3>
            </div>
            <div className="bg-stone-500/10 p-2.5 rounded-xl text-stone-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-stone-600">
            <span className="text-stone-700 font-semibold bg-stone-100 px-1.5 py-0.5 rounded">
              Margin {metrics.profitMargin.toFixed(1)}%
            </span>
            <span>profit margin</span>
          </div>
        </div>

        <div id="card-monthly-revenue" className="bg-gradient-to-br from-amber-900/5 to-amber-900/10 border border-amber-900/10 p-5 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-amber-900/80">Monthly Revenue</p>
              <h3 className="text-2xl font-bold text-amber-950 mt-1">
                {metrics.totalTransactions} Orders
              </h3>
            </div>
            <div className="bg-amber-900/10 p-2.5 rounded-xl text-amber-900">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-3 text-xs text-amber-900/70">
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Total Revenue:</span>
              <span className="text-stone-900 font-bold">{currency}{metrics.monthlySales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Avg Order:</span>
              <span className="text-stone-900 font-semibold">{currency}{metrics.avgOrderValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div id="card-inventory-val" className="bg-gradient-to-br from-orange-50 to-orange-100/30 border border-orange-200/60 p-5 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-orange-800">Inventory Status</p>
              <h3 className="text-2xl font-bold text-orange-950 mt-1">
                {metrics.totalSKUs} SKUs
              </h3>
            </div>
            <div className="bg-orange-500/10 p-2.5 rounded-xl text-orange-800">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-3 text-xs text-orange-800/80">
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Total Value:</span>
              <span className="text-stone-900 font-bold">{currency}{metrics.inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Low Stock:</span>
              <span className="text-amber-700 font-semibold">{metrics.lowStockCount} items</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Out of Stock:</span>
              <span className="text-red-700 font-semibold">{metrics.outOfStockCount} items</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div id="dashboard-sales-chart" className="lg:col-span-2 bg-white border border-stone-200 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-base font-semibold text-stone-900">Performance Trend</h4>
              <p className="text-xs text-stone-500">Sales and profit analysis</p>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="text-xs border border-stone-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">This Year</option>
              </select>
              <div className="flex items-center gap-3 text-xs ml-2">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-700 rounded-full"></span> Sales</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-stone-500 rounded-full"></span> Profit</span>
              </div>
            </div>
          </div>
          <div className="h-[280px] w-full">
            {salesTrend.length > 0 && salesTrend.some(d => d.sales > 0 || d.profit > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5A2B" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8B5A2B" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#78716c" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#78716c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                  <XAxis dataKey="date" tick={{ fill: '#78716c', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#78716c', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(value: any) => [`${currency}${parseFloat(value).toLocaleString()}`, '']}
                  />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#8B5A2B" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#78716c" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-stone-400 text-center">
                <Activity className="w-12 h-12 stroke-1 mb-3" />
                <p className="text-sm font-medium">No sales data for this period</p>
                <p className="text-xs mt-1">Complete orders to see performance trends</p>
              </div>
            )}
          </div>
        </div>

        <div id="dashboard-category-chart" className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-base font-semibold text-stone-900">Category Sales</h4>
            <p className="text-xs text-stone-500">Revenue by category</p>
          </div>
          <div className="h-[180px] relative flex justify-center items-center my-2">
            {categoryBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`${currency}${parseFloat(value).toLocaleString()}`, 'Share']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xs text-stone-500 font-medium">Grand Total</span>
                  <span className="text-base font-bold text-stone-900">
                    {currency}{categoryBreakdown.reduce((sum, item) => sum + item.value, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-stone-400 text-center">
                <BarChart3 className="w-10 h-10 stroke-1 mb-2" />
                <p className="text-xs font-medium">No sales data available</p>
                <p className="text-[10px]">Complete orders to see category breakdown</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
            {categoryBreakdown.map((item, index) => (
              <div key={item.name} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="text-stone-700 font-medium truncate">{item.name}</span>
                </div>
                <span className="text-stone-900 font-semibold shrink-0">{currency}{item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Notifications/Alerts vs Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Alerts Panel */}
        <div id="dashboard-stock-alerts" className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
              <h4 className="text-base font-semibold text-stone-900">Stock Alerts</h4>
            </div>
            <span className="text-xs bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full font-semibold">
              {lowStockItems.length + outOfStockItems.length} Warnings
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {outOfStockItems.map(p => (
              <div key={p.id} className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 transition-all hover:shadow-sm">
                <span className="p-1 bg-red-100 text-red-800 rounded-lg text-xs font-bold mt-0.5 shrink-0">OOS</span>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-semibold text-red-950 truncate">{p.name}</h5>
                  <p className="text-[11px] text-red-700 mt-0.5">SKU: {p.sku} • Stock: <span className="font-bold">0</span></p>
                </div>
                <button 
                  onClick={() => onNavigate('Inventory')}
                  className="text-xs font-semibold text-red-800 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                >
                  Restock <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}

            {lowStockItems.map(p => (
              <div key={p.id} className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5 transition-all hover:shadow-sm">
                <span className="p-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold mt-0.5 shrink-0">LOW</span>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-semibold text-amber-950 truncate">{p.name}</h5>
                  <p className="text-[11px] text-amber-700 mt-0.5">SKU: {p.sku} • Stock: <span className="font-bold">{p.stock}</span> (Limit: {p.minStockAlert})</p>
                </div>
                <button 
                  onClick={() => onNavigate('Inventory')}
                  className="text-xs font-semibold text-amber-800 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                >
                  Adjust <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}

            {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-stone-400 text-center py-10">
                <Package className="w-10 h-10 stroke-1 mb-2" />
                <p className="text-xs font-medium">All items are perfectly in stock.</p>
                <p className="text-[10px]">Stock limits and thresholds look clean.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div id="dashboard-recent-transactions" className="lg:col-span-2 bg-white border border-stone-200 p-5 rounded-2xl shadow-sm flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-800" />
              <h4 className="text-base font-semibold text-stone-900">Recent Terminal Sales</h4>
            </div>
            <button 
              onClick={() => onNavigate('Accounting')}
              className="text-xs text-amber-800 font-semibold hover:underline inline-flex items-center gap-0.5"
            >
              All Receipts <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead>
                <tr className="border-b border-stone-100 text-[10px] uppercase font-bold text-stone-500">
                  <th className="py-2.5">Receipt #</th>
                  <th className="py-2.5">Date & Time</th>
                  <th className="py-2.5">Cashier</th>
                  <th className="py-2.5 text-right">Subtotal</th>
                  <th className="py-2.5 text-right">Grand Total</th>
                  <th className="py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {recentTransactions.slice(0, 7).map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-2.5 font-semibold text-stone-900">{order.receiptNumber}</td>
                    <td className="py-2.5 text-stone-500">
                      {new Date(order.timestamp).toLocaleString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </td>
                    <td className="py-2.5 text-stone-700">{order.cashierName}</td>
                    <td className="py-2.5 text-right font-medium text-stone-500">{currency}{order.subtotal.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-semibold text-stone-900">{currency}{order.grandTotal.toFixed(2)}</td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                        order.status === 'Refunded' ? 'bg-orange-50 text-orange-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-stone-400">
                      No terminal sales generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-[600px] text-center">
          <Package className="w-16 h-16 text-stone-300 mb-4" />
          <h3 className="text-xl font-bold text-stone-900 mb-2">Access Restricted</h3>
          <p className="text-sm text-stone-500 max-w-md">
            Dashboard analytics are only accessible to Super Admin and Admin roles.
            <br />Please contact your system administrator for access.
          </p>
        </div>
      )}
    </div>
  );
}
