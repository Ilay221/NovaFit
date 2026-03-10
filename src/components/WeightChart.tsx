import { WeightEntry } from '@/lib/types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Scale } from 'lucide-react';

interface WeightChartProps {
  entries: WeightEntry[];
  targetWeight: number;
}

export default function WeightChart({ entries, targetWeight }: WeightChartProps) {
  if (entries.length === 0) {
    return (
      <div className="nova-card p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 mx-auto flex items-center justify-center mb-3">
          <Scale className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">אין רשומות משקל עדיין</p>
        <p className="text-xs text-muted-foreground mt-1">שקול את עצמך כדי לראות התקדמות</p>
      </div>
    );
  }

  const data = entries.map(e => ({
    date: e.date,
    weight: e.weightKg,
    label: format(parseISO(e.date), 'MMM d'),
  }));

  return (
    <div className="nova-card p-5" dir="ltr">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              fontSize: 12,
              boxShadow: '0 4px 20px hsl(0 0% 0% / 0.06)',
            }}
          />
          <ReferenceLine y={targetWeight} stroke="hsl(var(--primary))" strokeDasharray="6 4" strokeOpacity={0.5} label={{ value: 'יעד', fill: 'hsl(var(--primary))', fontSize: 11, fontWeight: 600 }} />
          <Line type="monotone" dataKey="weight" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3.5, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 5, fill: 'hsl(var(--primary))' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
