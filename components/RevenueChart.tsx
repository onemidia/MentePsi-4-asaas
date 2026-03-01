'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function RevenueChart() {
  const data = [
    { name: "Jan", total: 0 },
    { name: "Fev", total: 0 },
    { name: "Mar", total: 0 },
    { name: "Abr", total: 0 },
    { name: "Mai", total: 0 },
    { name: "Jun", total: 0 },
  ]

  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Visão Geral</CardTitle>
        <CardDescription>Faturamento mensal.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[350px] w-full min-w-0 min-h-[350px]">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${value}`}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px' }}
                formatter={(value: number | undefined) => [formatBRL(value || 0), "Faturamento"]}
              />
              <Bar dataKey="total" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}