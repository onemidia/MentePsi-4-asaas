'use client'

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface RevenueChartProps {
  data: any[]
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-[300px] w-full min-w-0 min-h-[300px]">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `R$ ${value}`} />
          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
          <RechartsTooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: any, name: string | undefined) => [
              (name === 'faturamento' || name === 'despesas') ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : value,
              (name || '') === 'faturamento' ? 'Faturamento' : (name || '') === 'despesas' ? 'Despesas' : (name || '') === 'consultas' ? 'Consultas Realizadas' : name
            ]}
          />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
          <Bar yAxisId="left" dataKey="faturamento" name="Faturamento (R$)" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar yAxisId="left" dataKey="despesas" name="Despesas (R$)" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
          <Line yAxisId="right" type="monotone" dataKey="consultas" name="Consultas Realizadas" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}