'use client';
import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Legend, AreaChart, Area, ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts';

const AXIS = { stroke: '#4B5B7A', fontSize: 10, tickLine: false } as const;
const gridProps = { stroke: '#1C2942', strokeDasharray: '3 6' };
const TOOLTIP = {
  contentStyle: { background: '#0D1526', border: '1px solid #1C2942', borderRadius: 8, fontSize: 11, color: '#E6EDF7' },
  labelStyle: { color: '#A8B6D0', fontSize: 11 },
} as const;

export function LineTrend({ data, xKey = 'name', series, height = 220 }: { data: Record<string, unknown>[]; xKey?: string; series: { key: string; label: string; colour?: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} {...AXIS} />
        <YAxis {...AXIS} />
        <Tooltip {...TOOLTIP} />
        <Legend wrapperStyle={{ fontSize: 10, color: '#A8B6D0' }} />
        {series.map((s, i) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.colour ?? ['#10B981', '#E8C15C', '#60A5FA', '#FB923C'][i % 4]} strokeWidth={2} dot={false} connectNulls />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarCompare({ data, xKey = 'name', yKey = 'value', colour = '#10B981', height = 220, horizontal = false, label }: { data: Record<string, unknown>[]; xKey?: string; yKey?: string; colour?: string; height?: number; horizontal?: boolean; label?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 6, right: 12, left: horizontal ? 60 : -18, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        {horizontal ? <XAxis type="number" {...AXIS} /> : <XAxis dataKey={xKey} {...AXIS} interval={0} angle={data.length > 8 ? -25 : 0} textAnchor={data.length > 8 ? 'end' : 'middle'} height={data.length > 8 ? 50 : 24} />}
        {horizontal ? <YAxis type="category" dataKey={xKey} {...AXIS} width={110} /> : <YAxis {...AXIS} />}
        <Tooltip {...TOOLTIP} />
        <Bar dataKey={yKey} name={label ?? yKey} fill={colour} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FingerprintRadar({ data, series, height = 300 }: { data: { axis: string; [k: string]: number | string }[]; series: { key: string; label: string; colour: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#1C2942" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: '#8695B4', fontSize: 9 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#4B5B7A', fontSize: 9 }} />
        {series.map((s) => <Radar key={s.key} name={s.label} dataKey={s.key} stroke={s.colour} fill={s.colour} fillOpacity={0.18} />)}
        <Legend wrapperStyle={{ fontSize: 10, color: '#A8B6D0' }} />
        <Tooltip {...TOOLTIP} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function AreaTrend({ data, xKey = 'name', series, height = 220 }: { data: Record<string, unknown>[]; xKey?: string; series: { key: string; label: string; colour?: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.colour ?? ['#10B981', '#E8C15C'][i % 2]} stopOpacity={0.5} />
              <stop offset="100%" stopColor={s.colour ?? ['#10B981', '#E8C15C'][i % 2]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} {...AXIS} />
        <YAxis {...AXIS} />
        <Tooltip {...TOOLTIP} />
        {series.map((s, i) => <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.colour ?? ['#10B981', '#E8C15C'][i % 2]} fill={`url(#grad-${s.key})`} strokeWidth={2} />)}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ScatterPlot({ data, xKey, yKey, height = 260, xLabel, yLabel }: { data: Record<string, unknown>[]; xKey: string; yKey: string; height?: number; xLabel?: string; yLabel?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 12, left: -14, bottom: 4 }}>
        <CartesianGrid {...gridProps} />
        <XAxis type="number" dataKey={xKey} name={xLabel ?? xKey} {...AXIS} />
        <YAxis type="number" dataKey={yKey} name={yLabel ?? yKey} {...AXIS} />
        <ZAxis range={[40, 40]} />
        <Tooltip {...TOOLTIP} />
        <Scatter data={data} fill="#34D399" fillOpacity={0.75} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function DivergingBars({ data, height = 240 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 50, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis type="number" {...AXIS} />
        <YAxis type="category" dataKey="name" {...AXIS} width={100} />
        <ReferenceLine x={0} stroke="#4B5B7A" />
        <Tooltip {...TOOLTIP} />
        <Bar dataKey="value" fill="#34D399" radius={[3, 3, 3, 3]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
