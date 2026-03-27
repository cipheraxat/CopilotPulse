import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { CHART_COLORS } from '../../utilities/constants';

const COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.error,
  '#4ec9b0',
  '#d16969',
  '#b5cea8',
  '#9cdcfe',
  '#ce9178',
];

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  formatValue?: (value: number) => string;
}

export function DonutChart({
  data,
  height = 300,
  innerRadius = 60,
  outerRadius = 100,
  formatValue,
}: DonutChartProps) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
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
        <Legend
          wrapperStyle={{ fontSize: 11, color: 'var(--vscode-foreground)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
