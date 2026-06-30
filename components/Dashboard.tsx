'use client';

import dynamic from 'next/dynamic';
import type { AnalysisResult } from '@/lib/analyzer';
import type { CleaningReport } from '@/lib/cleaner';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface Props { analysis: AnalysisResult; report: CleaningReport; onBack: () => void; }

export function Dashboard({ analysis, report, onBack }: Props) {
  const { overview, talentStructure, turnover, orgEffectiveness } = analysis;

  return (
    <div className="stack">
      <div className="flex-between">
        <span className="back-link" onClick={onBack}>← 重新导入</span>
        <span style={{ color: 'var(--text3)', fontSize: 12 }}>清洗完成 · {report.validRows} 条有效数据</span>
      </div>

      {/* KPI Row 1 */}
      <div className="grid-4">
        <Kpi title="员工总数" value={overview.totalEmployees} unit="人" color="var(--primary)" />
        <Kpi title="部门数" value={overview.departmentCount} unit="个" color="var(--text2)" />
        <Kpi title="平均司龄" value={overview.avgTenure} unit="年" color="var(--success)" />
        <Kpi title="年度流失率" value={overview.turnoverRate} unit="%" color="var(--danger)" />
      </div>

      {/* KPI Row 2 */}
      <div className="grid-4">
        <Kpi title="平均年龄" value={overview.avgAge} unit="岁" color="var(--text2)" />
        <Kpi title="男性" value={overview.genderRatio.male} unit="人" color="var(--primary)" />
        <Kpi title="女性" value={overview.genderRatio.female} unit="人" color="#ff5e8a" />
        <Kpi title="总记录" value={report.totalRows} unit="条" color="var(--warning)" />
      </div>

      {/* Charts */}
      <div className="grid-2">
        <Chart title="部门人员分布"><ReactECharts option={barOpt(talentStructure.byDepartment, '#3370ff')} style={{ height: 300 }} /></Chart>
        <Chart title="学历构成"><ReactECharts option={pieOpt(talentStructure.byEducation)} style={{ height: 300 }} /></Chart>
      </div>

      <div className="grid-2">
        <Chart title="年龄分布"><ReactECharts option={barOpt(talentStructure.ageDistribution, '#34c759')} style={{ height: 260 }} /></Chart>
        <Chart title="司龄分布"><ReactECharts option={barOpt(talentStructure.tenureDistribution, '#ff9500')} style={{ height: 260 }} /></Chart>
      </div>

      <div className="grid-2">
        <Chart title="月度入职趋势"><ReactECharts option={lineOpt(turnover.monthlyHires, '#3370ff')} style={{ height: 300 }} /></Chart>
        <Chart title="月度离职趋势"><ReactECharts option={lineOpt(turnover.monthlyLeaves, '#ff3b30')} style={{ height: 300 }} /></Chart>
      </div>

      <div className="grid-2">
        <Chart title="星座分布"><ReactECharts option={barOpt(talentStructure.zodiacDistribution, '#af52de')} style={{ height: 280 }} /></Chart>
        <Chart title="性别比例"><ReactECharts option={pieOpt(talentStructure.byGender)} style={{ height: 280 }} /></Chart>
      </div>

      <div className="grid-2">
        <Chart title="职级分布"><ReactECharts option={barOpt(talentStructure.byLevel, '#646a73')} style={{ height: 260 }} /></Chart>
      </div>

      {turnover.voluntaryVsInvoluntary.length > 0 && (
        <div className="grid-2">
          <Chart title="离职类型分析"><ReactECharts option={pieOpt(turnover.voluntaryVsInvoluntary)} style={{ height: 260 }} /></Chart>
          <Chart title="各部门离职分布"><ReactECharts option={barOpt(turnover.turnoverByDept, '#ff3b30')} style={{ height: 260 }} /></Chart>
        </div>
      )}

      {/* Cleaning Report */}
      <div className="card">
        <h3 style={{ fontWeight: 600, marginBottom: 12 }}>🧹 数据清洗报告</h3>
        <div className="grid-4" style={{ marginBottom: 12 }}>
          <div><span style={{ color: 'var(--text3)', fontSize: 12 }}>总行数</span><p style={{ fontWeight: 600, fontSize: 18 }}>{report.totalRows}</p></div>
          <div><span style={{ color: 'var(--text3)', fontSize: 12 }}>有效行</span><p style={{ fontWeight: 600, fontSize: 18 }}>{report.validRows}</p></div>
          <div><span style={{ color: 'var(--text3)', fontSize: 12 }}>字段数</span><p style={{ fontWeight: 600, fontSize: 18 }}>{report.columns.length}</p></div>
          <div><span style={{ color: 'var(--text3)', fontSize: 12 }}>问题数</span><p style={{ fontWeight: 600, fontSize: 18, color: 'var(--danger)' }}>{report.issues.length}</p></div>
        </div>
        {report.issues.length > 0 && (
          <div className="data-table" style={{ maxHeight: 200, overflow: 'auto' }}>
            <table>
              <thead><tr><th>行</th><th>列</th><th>原值</th><th>处理</th></tr></thead>
              <tbody>
                {report.issues.slice(0, 30).map((iss, i) => (
                  <tr key={i}>
                    <td>{iss.row}</td><td>{iss.column}</td>
                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(iss.original)}</td>
                    <td style={{ color: 'var(--warning)' }}>{iss.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ title, value, unit, color }: { title: string; value: number; unit: string; color: string }) {
  return (
    <div className="card">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        <span className="kpi-unit">{unit}</span>
      </div>
    </div>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="chart-title">{title}</div>
      {children}
    </div>
  );
}

// ECharts helpers
function barOpt(data: { name: string; value: number }[], color: string) {
  return {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 10, right: 20, top: 10, bottom: 30, containLabel: true },
    xAxis: { type: 'category' as const, data: data.map((d) => d.name), axisLabel: { fontSize: 11, rotate: data.length > 6 ? 30 : 0 } },
    yAxis: { type: 'value' as const, axisLabel: { fontSize: 11 } },
    series: [{ type: 'bar' as const, data: data.map((d) => d.value), itemStyle: { color, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 40 }],
  };
}

function pieOpt(data: { name: string; value: number }[]) {
  const colors = ['#3370ff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#ff5e8a', '#5ac8fa', '#ffd60a'];
  return {
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie' as const, radius: ['40%', '70%'], center: ['50%', '45%'],
      data: data.map((d, i) => ({ ...d, itemStyle: { color: colors[i % colors.length] } })),
      label: { fontSize: 11 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' } },
    }],
  };
}

function lineOpt(data: { name: string; value: number }[], color: string) {
  return {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 10, right: 20, top: 10, bottom: 30, containLabel: true },
    xAxis: { type: 'category' as const, data: data.map((d) => d.name), axisLabel: { fontSize: 11, rotate: data.length > 8 ? 45 : 0 } },
    yAxis: { type: 'value' as const, axisLabel: { fontSize: 11 } },
    series: [{
      type: 'line' as const, data: data.map((d) => d.value),
      itemStyle: { color }, lineStyle: { color, width: 2 },
      areaStyle: { color: color + '20' }, smooth: true,
    }],
  };
}
