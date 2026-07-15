import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Order, Product, Expense } from '../types';

interface AnalyticsData {
  orders: Order[];
  products: Product[];
  expenses: Expense[];
}

export const useAnalytics = () => {
  const { data, isLoading, refetch } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const [orders, products, expenses] = await Promise.all([
        fetch('/api/orders').then(r => r.json()),
        fetch('/api/products').then(r => r.json()),
        fetch('/api/expenses').then(r => r.json())
      ]);
      return { orders, products, expenses };
    },
    refetchInterval: 5000,
    staleTime: 2000
  });

  const metrics = useMemo(() => {
    if (!data) return {
      todaySales: 0, yesterdaySales: 0, todayProfit: 0, yesterdayProfit: 0,
      monthlySales: 0, monthlyProfit: 0, totalTransactions: 0, avgOrderValue: 0,
      inventoryValue: 0, totalSKUs: 0, lowStockCount: 0, outOfStockCount: 0,
      todayGrowth: 0, profitMargin: 0
    };

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const completedOrders = data.orders.filter(o => o.status === 'Completed');
    
    const todayOrders = completedOrders.filter(o => o.timestamp.startsWith(todayStr));
    const todaySales = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const todayCost = todayOrders.reduce((sum, o) => 
      sum + o.items.reduce((itemSum, item) => itemSum + (item.cost * item.quantity), 0), 0);
    const todayExpenses = data.expenses.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0);
    const todayProfit = todaySales - todayCost - todayExpenses;

    const yesterdayOrders = completedOrders.filter(o => o.timestamp.startsWith(yesterdayStr));
    const yesterdaySales = yesterdayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const yesterdayCost = yesterdayOrders.reduce((sum, o) => 
      sum + o.items.reduce((itemSum, item) => itemSum + (item.cost * item.quantity), 0), 0);
    const yesterdayExpenses = data.expenses.filter(e => e.date === yesterdayStr).reduce((sum, e) => sum + e.amount, 0);
    const yesterdayProfit = yesterdaySales - yesterdayCost - yesterdayExpenses;

    const monthlySales = completedOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const monthlyCost = completedOrders.reduce((sum, o) => 
      sum + o.items.reduce((itemSum, item) => itemSum + (item.cost * item.quantity), 0), 0);
    const monthlyExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    const monthlyProfit = monthlySales - monthlyCost - monthlyExpenses;

    const inventoryValue = data.products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const totalSKUs = data.products.length;
    const lowStockCount = data.products.filter(p => p.stock > 0 && p.stock <= p.minStockAlert).length;
    const outOfStockCount = data.products.filter(p => p.stock === 0).length;

    const todayGrowth = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;
    const profitMargin = todaySales > 0 ? (todayProfit / todaySales) * 100 : 0;

    return {
      todaySales, yesterdaySales, todayProfit, yesterdayProfit,
      monthlySales, monthlyProfit, totalTransactions: completedOrders.length,
      avgOrderValue: completedOrders.length > 0 ? monthlySales / completedOrders.length : 0,
      inventoryValue, totalSKUs, lowStockCount, outOfStockCount, todayGrowth, profitMargin
    };
  }, [data]);

  return { metrics, isLoading, refetch, orders: data?.orders || [], products: data?.products || [], expenses: data?.expenses || [] };
};
