import { useMemo } from 'react';
import { Order, Product, Expense, Category } from '../types';

export const useChartData = (orders: Order[], products: Product[], expenses: Expense[], categories: Category[], days: number = 15) => {
  const salesTrend = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = orders.filter(o => o.status === 'Completed' && o.timestamp.startsWith(dateStr));
      const sales = dayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
      const cost = dayOrders.reduce((sum, o) => sum + o.items.reduce((s, item) => s + (item.cost * item.quantity), 0), 0);
      const dayExpenses = expenses.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.amount, 0);
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: Math.round(sales * 100) / 100,
        profit: Math.round((sales - cost - dayExpenses) * 100) / 100,
        expenses: Math.round(dayExpenses * 100) / 100
      });
    }
    
    return data;
  }, [orders, expenses, days]);

  const topProducts = useMemo(() => {
    const productMap: { [key: string]: { name: string; qty: number; sales: number } } = {};
    
    orders.filter(o => o.status === 'Completed').forEach(o => {
      o.items.forEach(item => {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { name: item.name, qty: 0, sales: 0 };
        }
        productMap[item.productId].qty += item.quantity;
        productMap[item.productId].sales += item.sellingPrice * item.quantity;
      });
    });
    
    return Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [orders]);

  const categoryBreakdown = useMemo(() => {
    const catMap: { [key: string]: number } = {};
    
    orders.filter(o => o.status === 'Completed').forEach(o => {
      o.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const category = product ? categories.find(c => c.id === product.categoryId) : null;
        const catName = category?.name || 'General';
        catMap[catName] = (catMap[catName] || 0) + (item.sellingPrice * item.quantity);
      });
    });
    
    return Object.entries(catMap).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [orders, products, categories]);

  const paymentBreakdown = useMemo(() => {
    const paymentMap: { [key: string]: number } = {};
    
    orders.filter(o => o.status === 'Completed').forEach(o => {
      o.payments.forEach(p => {
        paymentMap[p.method] = (paymentMap[p.method] || 0) + p.amount;
      });
    });
    
    return Object.entries(paymentMap).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [orders]);

  return { salesTrend, topProducts, categoryBreakdown, paymentBreakdown };
};
