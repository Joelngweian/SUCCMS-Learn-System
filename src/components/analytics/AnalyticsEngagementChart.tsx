import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CourseMetric } from "./lecturerAnalyticsTypes";

type AnalyticsEngagementChartProps = {
  data: CourseMetric[];
};

export default function AnalyticsEngagementChart({
  data,
}: AnalyticsEngagementChartProps) {
  return (
    <div className="h-[220px] sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ left: -18, right: 6, top: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="code"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tick={{ fontSize: 11 }}
          />
          <Tooltip />
          <Bar dataKey="forumPosts" fill="#10b981" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
