import React, { useState, useMemo } from 'react';
import { 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { TrendingUp, Car, TreePine, Factory, Calendar, Award } from "lucide-react";

export default function Charts({ retirements = [] }) {
  const [activeChart, setActiveChart] = useState('bar');
  const [timeframe, setTimeframe] = useState('all');

  // Enhanced data processing with time filtering
  const processedData = useMemo(() => {
    let filteredRetirements = retirements;
    
    if (timeframe !== 'all' && retirements.length > 0) {
      const now = new Date();
      const cutoff = new Date();
      
      switch (timeframe) {
        case '30d':
          cutoff.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoff.setDate(now.getDate() - 90);
          break;
        case '1y':
          cutoff.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filteredRetirements = retirements.filter(r => 
        new Date(r.timestamp || r.date || Date.now()) >= cutoff
      );
    }

    // Aggregate by owner
    const byOwner = filteredRetirements.reduce((acc, r) => {
      acc[r.owner] = (acc[r.owner] || 0) + r.qtyKg;
      return acc;
    }, {});

    // Create main dataset
    const ownerData = Object.entries(byOwner)
      .map(([owner, qtyKg]) => ({
        owner: owner.length > 15 ? owner.substring(0, 15) + '...' : owner,
        fullOwner: owner,
        qtyKg,
        carsOffRoad: Math.round(qtyKg / 200),
        trees: Math.round(qtyKg / 20),
        co2Equivalent: Math.round(qtyKg * 2.2) // Assuming H₂ to CO₂ conversion
      }))
      .sort((a, b) => b.qtyKg - a.qtyKg)
      .slice(0, 10); // Top 10 for readability

    // Time series data (if timestamps available)
    const timeSeriesData = filteredRetirements
      .filter(r => r.timestamp || r.date)
      .sort((a, b) => new Date(a.timestamp || a.date) - new Date(b.timestamp || b.date))
      .reduce((acc, r) => {
        const date = new Date(r.timestamp || r.date).toLocaleDateString();
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.cumulative += r.qtyKg;
          existing.daily += r.qtyKg;
        } else {
          const prevCumulative = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
          acc.push({
            date,
            daily: r.qtyKg,
            cumulative: prevCumulative + r.qtyKg
          });
        }
        return acc;
      }, []);

    // Summary statistics
    const totalRetired = filteredRetirements.reduce((sum, r) => sum + r.qtyKg, 0);
    const totalOwners = Object.keys(byOwner).length;
    const avgPerOwner = totalOwners > 0 ? totalRetired / totalOwners : 0;

    return {
      ownerData,
      timeSeriesData,
      summary: {
        totalRetired,
        totalOwners,
        avgPerOwner,
        totalCarsOffRoad: Math.round(totalRetired / 200),
        totalTrees: Math.round(totalRetired / 20),
        totalCO2: Math.round(totalRetired * 2.2)
      }
    };
  }, [retirements, timeframe]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`Owner: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${entry.value}${entry.name.includes('kg') ? ' kg' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue" }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600 mt-1`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  if (!retirements.length) {
    return (
      <div className="p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-center">
        <Factory className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No Data Available</h3>
        <p className="text-gray-500">Start retiring carbon credits to see your impact dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 rounded-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            Impact Dashboard
          </h2>
          <p className="text-gray-600 mt-1">Environmental impact of retired carbon credits</p>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="1y">Last Year</option>
            <option value="90d">Last 90 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Award}
          title="Total Retired"
          value={`${formatNumber(processedData.summary.totalRetired)} kg`}
          subtitle="Hydrogen carbon credits"
          color="green"
        />
        <StatCard
          icon={Car}
          title="Cars Off Road"
          value={formatNumber(processedData.summary.totalCarsOffRoad)}
          subtitle="Equivalent impact"
          color="blue"
        />
        <StatCard
          icon={TreePine}
          title="Trees Saved"
          value={formatNumber(processedData.summary.totalTrees)}
          subtitle="Environmental benefit"
          color="emerald"
        />
        <StatCard
          icon={Factory}
          title="Active Participants"
          value={processedData.summary.totalOwners}
          subtitle="Contributing owners"
          color="purple"
        />
      </div>

      {/* Chart Controls */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          { key: 'bar', label: 'Bar Chart', icon: '📊' },
          { key: 'area', label: 'Area Chart', icon: '📈' },
          { key: 'pie', label: 'Distribution', icon: '🥧' }
        ].map((chart) => (
          <button
            key={chart.key}
            onClick={() => setActiveChart(chart.key)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeChart === chart.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {chart.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {activeChart === 'bar' && (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={processedData.ownerData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="owner" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="qtyKg" name="Retired (kg)" fill="#0088FE" radius={[4, 4, 0, 0]} />
              <Bar dataKey="carsOffRoad" name="Cars off road (est.)" fill="#00C49F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="trees" name="Trees saved (est.)" fill="#FFBB28" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'area' && processedData.timeSeriesData.length > 0 && (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={processedData.timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0088FE" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelStyle={{ color: '#374151' }}
                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#0088FE"
                fillOpacity={1}
                fill="url(#colorCumulative)"
                name="Cumulative Retired (kg)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="daily"
                stroke="#00C49F"
                strokeWidth={2}
                name="Daily Retired (kg)"
                dot={{ fill: '#00C49F', strokeWidth: 2, r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeChart === 'area' && processedData.timeSeriesData.length === 0 && (
          <div className="flex items-center justify-center h-80 text-gray-500">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No time series data available</p>
              <p className="text-sm">Add timestamp data to see trends over time</p>
            </div>
          </div>
        )}

        {activeChart === 'pie' && (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={processedData.ownerData}
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                paddingAngle={2}
                dataKey="qtyKg"
                nameKey="fullOwner"
              >
                {processedData.ownerData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} kg`, 'Retired']}
                labelFormatter={(label) => `Owner: ${label}`}
                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Impact Calculations */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TreePine className="h-5 w-5 text-green-600" />
          Environmental Impact Calculator
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Car className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">
              {formatNumber(processedData.summary.totalCarsOffRoad)}
            </div>
            <div className="text-sm text-blue-600 font-medium">Cars Off Road</div>
            <div className="text-xs text-gray-600 mt-1">Based on 200kg H₂ per car annually</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <TreePine className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">
              {formatNumber(processedData.summary.totalTrees)}
            </div>
            <div className="text-sm text-green-600 font-medium">Trees Saved</div>
            <div className="text-xs text-gray-600 mt-1">Based on 20kg H₂ absorption per tree</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Factory className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-700">
              {formatNumber(processedData.summary.totalCO2)}
            </div>
            <div className="text-sm text-purple-600 font-medium">kg CO₂ Equivalent</div>
            <div className="text-xs text-gray-600 mt-1">Estimated carbon impact reduction</div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      {processedData.ownerData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            Top Performers
          </h4>
          <div className="space-y-3">
            {processedData.ownerData.slice(0, 5).map((owner, index) => (
              <div key={owner.fullOwner} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{owner.fullOwner}</div>
                    <div className="text-sm text-gray-600">{owner.carsOffRoad} cars • {owner.trees} trees</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900">{formatNumber(owner.qtyKg)}</div>
                  <div className="text-sm text-gray-600">kg retired</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-center text-xs text-gray-500 bg-white rounded-lg p-4 border border-gray-200">
        <p>
          <strong>Note:</strong> Impact calculations are estimates for demonstration purposes. 
          Conversion factors: 1 car ≈ 200 kg H₂ annually, 1 tree ≈ 20 kg H₂ absorption capacity, 
          CO₂ equivalent based on hydrogen's carbon reduction potential.
        </p>
      </div>
    </div>
  );
}