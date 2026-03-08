import { WeightEntry } from '@/lib/types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';

interface WeightChartProps {
  entries: WeightEntry[];
  targetWeight: number;
}

export default function WeightChart({ entries, targetWeight }: WeightChartProps) {
  if (entries.length === 0) {
    return (
      <div className="nova-card p-10 text-center">
        <div className="text-3xl mb-3">📊</div>
        <p className="text-sm text-muted-foreground">No weight entries yet</p>
        <p className="text-xs text-muted-foreground mt-1">Log your weight to see progress!</p>
      </div>
    );
  }

  const data = entries.map(e => ({
    date: e.date,
    weight: e.weightKg,
    label: format(parseISO(e.date), 'MMM d'),
  }));

  return (
    <div className="nova-card p-5">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '16px',
              fontSize: 12,
              boxShadow: '0 8px 32px hsl(0 0% 0% / 0.08)',
            }}
          />
          <ReferenceLine y={targetWeight} stroke="hsl(var(--primary))" strokeDasharray="6 4" strokeOpacity={0.6} label={{ value: 'Goal', fill: 'hsl(var(--primary))', fontSize: 11, fontWeight: 600 }} />
          <Line type="monotone" dataKey="weight" stroke="hsl(var(--foreground))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 6, fill: 'hsl(var(--primary))' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
