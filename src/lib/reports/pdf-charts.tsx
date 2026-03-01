import React from 'react';
import { View, Svg, Rect, Line, Text as SvgText } from '@react-pdf/renderer';
import { styles } from './pdf-styles';

interface BarChartProps {
  data: Array<{ label: string; value: number; percentage: number }>;
  title: string;
}

export function PDFBarChart({ data, title }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.percentage), 1);
  const chartWidth = 220;
  const barHeight = 12;
  const gap = 4;
  const chartHeight = data.length * (barHeight + gap) + 20;

  return (
    <View style={styles.breakdownCard}>
      <View style={styles.breakdownTitle}>
        <SvgText>{title}</SvgText>
      </View>
      <Svg width={chartWidth} height={chartHeight}>
        {data.slice(0, 6).map((item, i) => {
          const y = i * (barHeight + gap);
          const barWidth = (item.percentage / maxValue) * (chartWidth - 80);
          return (
            <React.Fragment key={item.label}>
              <SvgText
                x={0}
                y={y + barHeight - 2}
                style={{ fontSize: 7 }}
              >
                {item.label}
              </SvgText>
              <Rect
                x={60}
                y={y}
                width={Math.max(barWidth, 2)}
                height={barHeight}
                fill="#2563eb"
                rx={2}
              />
              <SvgText
                x={chartWidth - 15}
                y={y + barHeight - 2}
                style={{ fontSize: 7, textAnchor: 'end' }}
              >
                {item.percentage}%
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

interface SpendLineChartProps {
  data: Array<{ date: string; spend: number; clicks: number }>;
}

export function PDFSpendChart({ data }: SpendLineChartProps) {
  if (data.length < 2) return null;

  const chartWidth = 480;
  const chartHeight = 120;
  const padding = { top: 10, right: 10, bottom: 25, left: 40 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const maxSpend = Math.max(...data.map(d => d.spend), 1);
  const maxClicks = Math.max(...data.map(d => d.clicks), 1);

  const spendPoints = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * innerW;
    const y = padding.top + innerH - (d.spend / maxSpend) * innerH;
    return `${x},${y}`;
  }).join(' ');

  const clickPoints = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * innerW;
    const y = padding.top + innerH - (d.clicks / maxClicks) * innerH;
    return `${x},${y}`;
  }).join(' ');

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const y = padding.top + innerH * (1 - pct);
    return { y, label: `$${Math.round(maxSpend * pct)}` };
  });

  return (
    <View style={styles.chartContainer}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <React.Fragment key={i}>
            <Line
              x1={padding.left}
              y1={line.y}
              x2={chartWidth - padding.right}
              y2={line.y}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <SvgText
              x={padding.left - 5}
              y={line.y + 3}
              style={{ fontSize: 6, textAnchor: 'end' }}
            >
              {line.label}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Spend line */}
        <Svg>
          {data.slice(0, -1).map((d, i) => {
            const x1 = padding.left + (i / (data.length - 1)) * innerW;
            const y1 = padding.top + innerH - (d.spend / maxSpend) * innerH;
            const x2 = padding.left + ((i + 1) / (data.length - 1)) * innerW;
            const y2 = padding.top + innerH - (data[i + 1].spend / maxSpend) * innerH;
            return (
              <Line
                key={`spend-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#2563eb" strokeWidth={1.5}
              />
            );
          })}
        </Svg>

        {/* Clicks line */}
        <Svg>
          {data.slice(0, -1).map((d, i) => {
            const x1 = padding.left + (i / (data.length - 1)) * innerW;
            const y1 = padding.top + innerH - (d.clicks / maxClicks) * innerH;
            const x2 = padding.left + ((i + 1) / (data.length - 1)) * innerW;
            const y2 = padding.top + innerH - (data[i + 1].clicks / maxClicks) * innerH;
            return (
              <Line
                key={`clicks-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#f59e0b" strokeWidth={1.5}
              />
            );
          })}
        </Svg>

        {/* X axis labels */}
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i, arr) => {
          const origIdx = data.indexOf(d);
          const x = padding.left + (origIdx / (data.length - 1)) * innerW;
          return (
            <SvgText
              key={i}
              x={x}
              y={chartHeight - 5}
              style={{ fontSize: 6, textAnchor: 'middle' }}
            >
              {d.date.slice(5)}
            </SvgText>
          );
        })}

        {/* Legend */}
        <Rect x={chartWidth - 100} y={5} width={8} height={8} fill="#2563eb" rx={1} />
        <SvgText x={chartWidth - 88} y={12} style={{ fontSize: 7 }}>Gasto</SvgText>
        <Rect x={chartWidth - 55} y={5} width={8} height={8} fill="#f59e0b" rx={1} />
        <SvgText x={chartWidth - 43} y={12} style={{ fontSize: 7 }}>Clics</SvgText>
      </Svg>
    </View>
  );
}
