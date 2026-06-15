import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "./lecturerAnalyticsTypes";

type AnalyticsProgressChartProps = {
  data: TrendPoint[];
};

export default function AnalyticsProgressChart({
  data,
}: AnalyticsProgressChartProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ left: 0, right: 12, top: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            domain={[0, 100]}
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="engagement"
            stroke="#2563eb"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="submissions"
            stroke="#16a34a"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="averageScore"
            stroke="#9333ea"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
