import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import { formatCurrency } from '../utils/format';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface ReportsData {
  series: {
    daily: Array<{ label: string; revenue: number; orders: number }>;
    monthly: Array<{ label: string; revenue: number; orders: number }>;
    yearly: Array<{ label: string; revenue: number; orders: number }>;
  };
  productPerformance: Array<{ name: string; units: number; revenue: number }>;
  customerStatistics: {
    totalCustomers: number;
    activeCustomers: number;
    purchasingCustomers: number;
    avgOrderValue: number;
  };
}

export function AdminReportsPage() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ReportsData>(`/admin/reports?period=${period}`)
      .then((res) => setReports(res.data))
      .catch((err) => showToast(extractApiError(err, 'Failed to load reports'), 'error'))
      .finally(() => setLoading(false));
  }, [period, showToast]);

  if (loading || !reports) {
    return <div className="h-80 rounded-xl bg-[#18181B] animate-pulse" />;
  }

  const activeSeries = reports.series[period];

  const chartData = {
    labels: activeSeries.length > 0 ? activeSeries.map((r) => r.label) : ['No Data'],
    datasets: [
      {
        label: 'Revenue (USD)',
        data: activeSeries.length > 0 ? activeSeries.map((r) => r.revenue) : [0],
        backgroundColor: '#8B5CF6',
        borderRadius: 6,
      },
      {
        label: 'Orders',
        data: activeSeries.length > 0 ? activeSeries.map((r) => r.orders) : [0],
        backgroundColor: '#06B6D4',
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#FAFAFA]">Sales & Performance Reports</h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Daily, monthly, and yearly revenue breakdown alongside product and customer metrics.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-[#27272A] bg-[#111114] p-1 self-start">
          {(['daily', 'monthly', 'yearly'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                period === p ? 'bg-[#8B5CF6] text-white' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#27272A] bg-[#111114] p-4">
          <p className="text-xs text-[#A1A1AA]">Total Customers</p>
          <p className="text-xl font-mono font-semibold tabular-nums mt-1">
            {reports.customerStatistics.totalCustomers}
          </p>
        </div>
        <div className="rounded-xl border border-[#27272A] bg-[#111114] p-4">
          <p className="text-xs text-[#A1A1AA]">Active Accounts</p>
          <p className="text-xl font-mono font-semibold tabular-nums mt-1">
            {reports.customerStatistics.activeCustomers}
          </p>
        </div>
        <div className="rounded-xl border border-[#27272A] bg-[#111114] p-4">
          <p className="text-xs text-[#A1A1AA]">Purchasing Customers</p>
          <p className="text-xl font-mono font-semibold tabular-nums mt-1">
            {reports.customerStatistics.purchasingCustomers}
          </p>
        </div>
        <div className="rounded-xl border border-[#27272A] bg-[#111114] p-4">
          <p className="text-xs text-[#A1A1AA]">Average Order Value</p>
          <p className="text-xl font-mono font-semibold tabular-nums mt-1 text-[#06B6D4]">
            {formatCurrency(reports.customerStatistics.avgOrderValue)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[#FAFAFA] capitalize">{period} Revenue & Volume</h2>
        <div className="h-72">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { labels: { color: '#A1A1AA' } },
              },
              scales: {
                x: { grid: { color: '#27272A' }, ticks: { color: '#A1A1AA' } },
                y: { grid: { color: '#27272A' }, ticks: { color: '#A1A1AA' } },
              },
            }}
          />
        </div>
      </div>

      {/* Product Performance */}
      <div className="rounded-xl border border-[#27272A] bg-[#111114] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#27272A]">
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Product Revenue Performance</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#27272A] bg-[#18181B] text-[#A1A1AA]">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium text-right">Units Sold</th>
              <th className="px-4 py-3 font-medium text-right">Gross Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A]">
            {reports.productPerformance.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-[#A1A1AA]">
                  No completed sales data recorded yet.
                </td>
              </tr>
            ) : (
              reports.productPerformance.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#18181B]/60">
                  <td className="px-4 py-3 font-medium text-[#FAFAFA]">{item.name}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{item.units}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[#06B6D4]">
                    {formatCurrency(item.revenue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
