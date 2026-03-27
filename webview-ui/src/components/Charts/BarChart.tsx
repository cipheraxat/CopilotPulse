import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS } from '../../utilities/constants';

interface BarChartProps {
  data: Array<{ date: string; value: number; label?: string }>;
  color?: string;
  height?: number;
  xKey?: string;
  yKey?: string;
  formatValue?: (value: number) => string;
}

export function BarChartComponent({
  data,
  color = CHART_COLORS.primary,
  height = 300,
  xKey = 'date',
  yKey = 'value',
  formatValue,
}: BarChartProps) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--vscode-widget-border, #333)" />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--vscode-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: 'var(--vscode-widget-border, #333)' }}
        />
        <YAxis
          tick={{ fill: 'var(--vscode-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatValue}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--vscode-editorWidget-background, #252526)',
            border: '1px solid var(--vscode-widget-border, #454545)',
            borderRadius: 6,
            color: 'var(--vscode-foreground)',
            fontSize: 12,
          }}
          formatter={(value: number) => [formatValue ? formatValue(value) : value]}
        />
        <Bar dataKey={yKey} fill={color} radius={[3, 3, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
