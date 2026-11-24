import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { AlertTriangle, CheckCircle2, Clock, DollarSign, Package, ShoppingCart, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface DashboardData {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    pendingOrders: number;
    completedOrders: number;
  };
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    totalAmount: number;
    shippingRecipient: string;
    createdAt: string;
  }>;
  lowStockAlerts: Array<{
    id: number;
    name: string;
    sku: string;
    stock: number;
    price: number;
  }>;
  bestSellingProducts: Array<{
    productId: number | null;
    name: string;
    unitsSold: number;
    revenue: number;
  }>;
  salesChart: Array<{
    day: string;
    revenue: number;
    orders: number;
  }>;
}

export function AdminOverviewPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>('/admin/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => showToast(extractApiError(err, 'Failed to load dashboard'), 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-[#18181B] animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-xl bg-[#18181B] animate-pulse" />
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Revenue', value: formatCurrency(data.kpis.totalRevenue), icon: DollarSign, accent: 'text-[#06B6D4]' },
    { label: 'Total Orders', value: String(data.kpis.totalOrders), icon: ShoppingCart, accent: 'text-[#8B5CF6]' },
    { label: 'Customers', value: String(data.kpis.totalCustomers), icon: Users, accent: 'text-[#06B6D4]' },
    { label: 'Active Products', value: String(data.kpis.totalProducts), icon: Package, accent: 'text-[#8B5CF6]' },
    { label: 'Pending Orders', value: String(data.kpis.pendingOrders), icon: Clock, accent: 'text-amber-400' },
    { label: 'Delivered Orders', value: String(data.kpis.completedOrders), icon: CheckCircle2, accent: 'text-emerald-400' },
  ];

  const chartData = {
    labels: data.salesChart.length > 0 ? data.salesChart.map((d) => d.day) : ['Today'],
    datasets: [
      {
        label: 'Revenue (USD)',
        data: data.salesChart.length > 0 ? data.salesChart.map((d) => d.revenue) : [0],
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.14)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#FAFAFA]">Operations Overview</h1>
        <p className="text-xs text-[#A1A1AA] mt-1">Real-time store revenue, fulfillment queue, and inventory health.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-[#27272A] bg-[#111114] p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-xs text-[#A1A1AA]">{card.label}</p>
                <p className="text-2xl font-semibold font-mono tabular-nums text-[#FAFAFA] mt-1.5">
                  {card.value}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#18181B] border border-[#27272A]">
                <Icon className={`w-5 h-5 ${card.accent}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sales Analytics & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">14-Day Revenue Trend</h2>
            <Link to="/admin/reports" className="text-xs text-[#8B5CF6] hover:underline">
              Full Reports →
            </Link>
          </div>
          <div className="h-64">
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  x: {
                    grid: { color: '#27272A' },
                    ticks: { color: '#A1A1AA', font: { size: 11 } },
                  },
                  y: {
                    grid: { color: '#27272A' },
                    ticks: { color: '#A1A1AA', font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="lg:col-span-4 rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#FAFAFA] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Low-Stock Alerts (≤ 10)</span>
            </h2>
            <Link to="/admin/inventory" className="text-xs text-[#06B6D4] hover:underline">
              Manage
            </Link>
          </div>
          {data.lowStockAlerts.length === 0 ? (
            <p className="text-xs text-[#A1A1AA] py-4">All active products are well stocked.</p>
          ) : (
            <ul className="divide-y divide-[#27272A]">
              {data.lowStockAlerts.map((item) => (
                <li key={item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-[#FAFAFA] truncate">{item.name}</p>
                    <p className="font-mono text-[#A1A1AA]">{item.sku}</p>
                  </div>
                  <span
                    className={`font-mono tabular-nums font-semibold shrink-0 ${
                      item.stock <= 3 ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {item.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Orders & Best Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-xl border border-[#27272A] bg-[#111114] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A]">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs text-[#8B5CF6] hover:underline">
              View All →
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="p-6 text-xs text-[#A1A1AA]">No orders recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#27272A] text-[#A1A1AA] bg-[#18181B]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Recipient</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#18181B]/60">
                      <td className="px-4 py-3 font-mono text-[#FAFAFA]">
                        <div>{o.orderNumber}</div>
                        <div className="text-[11px] text-[#A1A1AA]">{formatDate(o.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-[#FAFAFA]">{o.shippingRecipient}</td>
                      <td className="px-4 py-3 text-[#06B6D4] font-medium">{o.status}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-[#FAFAFA]">
                        {formatCurrency(o.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-xl border border-[#27272A] bg-[#111114] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#27272A]">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Best-Selling Products</h2>
          </div>
          {data.bestSellingProducts.length === 0 ? (
            <p className="p-6 text-xs text-[#A1A1AA]">Sales leaderboard will populate as orders are placed.</p>
          ) : (
            <ul className="divide-y divide-[#27272A] px-6">
              {data.bestSellingProducts.map((item, idx) => (
                <li key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-[#FAFAFA] truncate">{item.name}</p>
                    <p className="text-[#A1A1AA] tabular-nums">{item.unitsSold} units sold</p>
                  </div>
                  <span className="font-mono tabular-nums text-[#FAFAFA] font-semibold">
                    {formatCurrency(item.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
