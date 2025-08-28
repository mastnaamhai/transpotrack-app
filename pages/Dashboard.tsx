
import React from 'react';
import { useTransport } from '../context/TransportContext';
import { TruckIcon, DocumentTextIcon, BookOpenIcon } from '../components/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => (
  <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
    <div className={`p-3 rounded-full mr-4 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-base text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

export const Dashboard = () => {
  const { invoices, lorryReceipts } = useTransport();

  const totalUnpaidAmount = invoices
    .filter(inv => inv.status !== 'Paid')
    .reduce((acc, inv) => acc + (inv.totalAmount - inv.amountPaid), 0);
    
  const recentActivity = [
    ...lorryReceipts.slice(-3).map(lr => ({ type: 'LR Created', desc: lr.lrNumber, date: new Date(lr.date) })),
    ...invoices.slice(-3).map(inv => ({ type: 'Invoice Generated', desc: inv.invoiceNumber, date: new Date(inv.date) }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  
  const monthlyData = invoices.reduce((acc, invoice) => {
      const month = new Date(invoice.date).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!acc[month]) {
          acc[month] = { name: month, Revenue: 0 };
      }
      acc[month].Revenue += invoice.totalAmount;
      return acc;
  }, {} as Record<string, { name: string, Revenue: number }> );
  
  const chartData = Object.values(monthlyData).reverse();


  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total Lorry Receipts" 
          value={lorryReceipts.length} 
          icon={<TruckIcon className="w-6 h-6 text-white"/>} 
          color="bg-blue-500"
        />
        <StatCard 
          title="Total Invoices" 
          value={invoices.length} 
          icon={<DocumentTextIcon className="w-6 h-6 text-white"/>} 
          color="bg-green-500"
        />
        <StatCard 
          title="Outstanding Amount" 
          value={`₹${totalUnpaidAmount.toLocaleString()}`} 
          icon={<BookOpenIcon className="w-6 h-6 text-white"/>} 
          color="bg-red-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Monthly Revenue</h2>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="Revenue" fill="#1976D2" />
                </BarChart>
            </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Activity</h2>
          <ul className="space-y-4">
            {recentActivity.map((activity, index) => (
                <li key={index} className="flex items-start">
                    <div className="w-3 h-3 bg-brand-secondary rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                    <div>
                        <p className="font-medium text-gray-800">{activity.type}: {activity.desc}</p>
                        <p className="text-sm text-gray-500">{activity.date.toLocaleDateString()}</p>
                    </div>
                </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};