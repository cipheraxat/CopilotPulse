import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CHART_COLORS } from '../../utilities/constants';

interface LineInfo {
  dataKey: string;
  color: string;
  name: string;
}

interface LineChartProps {
  data: Array<Record<string, unknown>>;
  lines: LineInfo[];
  height?: number;
  xKey?: string;
  formatValue?: (value: number) => string;
}

export function LineChartComponent({
  data,
  lines,
  height = 300,
  xKey = 'date',
  formatValue,
}: LineChartProps) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
          formatter={(value: number, name: string) => [
            formatValue ? formatValue(value) : value,
            name,
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: 'var(--vscode-foreground)' }}
        />
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            name={line.name}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
