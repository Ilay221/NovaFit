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
      <div className="p-8 text-center text-muted-foreground text-sm rounded-xl border bg-card">
        No weight entries yet. Log your weight to see progress!
      </div>
    );
  }

  const data = entries.map(e => ({
    date: e.date,
    weight: e.weightKg,
    label: format(parseISO(e.date), 'MMM d'),
  }));

  return (
    <div className="rounded-xl border bg-card p-4">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: 12,
            }}
          />
          <ReferenceLine y={targetWeight} stroke="hsl(var(--primary))" strokeDasharray="5 5" label={{ value: 'Goal', fill: 'hsl(var(--primary))', fontSize: 11 }} />
          <Line type="monotone" dataKey="weight" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
