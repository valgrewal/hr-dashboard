'use client';

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { matchFields } from '@/lib/fieldMatcher';
import { cleanData, type CleaningReport } from '@/lib/cleaner';
import { analyze, type AnalysisResult } from '@/lib/analyzer';
import { Dashboard } from '@/components/Dashboard';

type Step = 'import' | 'dashboard';

export default function Home() {
  const [step, setStep] = useState<Step>('import');
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [report, setReport] = useState<CleaningReport | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];
    if (json.length > 0) {
      setRawData(json);
      setHeaders(Object.keys(json[0]));
      const matches = matchFields(Object.keys(json[0]));
      const map: Record<string, string> = {};
      for (const m of matches) { if (m.confidence > 0) map[m.category] = m.key; }
      setFieldMap(map);
    }
  }, []);

  const handlePaste = useCallback(() => {
    if (!pasteText.trim()) return;
    const lines = pasteText.trim().split('\n');
    const hdrs = lines[0].split('\t');
    const rows = lines.slice(1).map((line) => {
      const vals = line.split('\t');
      const obj: Record<string, string> = {};
      hdrs.forEach((h, i) => (obj[h.trim()] = (vals[i] || '').trim()));
      return obj;
    });
    setRawData(rows);
    setHeaders(hdrs.map((h) => h.trim()));
    const matches = matchFields(hdrs.map((h) => h.trim()));
    const map: Record<string, string> = {};
    for (const m of matches) { if (m.confidence > 0) map[m.category] = m.key; }
    setFieldMap(map);
  }, [pasteText]);

  const handleAnalyze = useCallback(() => {
    const result = cleanData(rawData);
    setReport(result.report);
    const analysisResult = analyze(result.data, fieldMap);
    setAnalysis(analysisResult);
    setStep('dashboard');
  }, [rawData, fieldMap]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>📊 组织数据看板</h1>
        <p>HR组织数据分析 · 自动清洗 · 智能看板 · 数据不上传服务器</p>
      </header>

      {step === 'import' && (
        <div className="stack">
          {/* File drop */}
          <div
            className={`dropzone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <div className="icon">📁</div>
            <div className="title">拖拽 Excel / CSV 文件到此处</div>
            <div className="sub">或点击选择文件 · 支持 .xlsx .xls .csv</div>
            <input id="fileInput" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          {/* Paste */}
          <div className="card paste-box">
            <h3>📋 粘贴表格数据</h3>
            <p className="hint">从 Excel / 飞书表格复制数据，粘贴到下方</p>
            <textarea
              placeholder={'姓名\t部门\t岗位\t入职日期\n张三\t技术部\t工程师\t2023-01-15\n李四\t市场部\t经理\t2022-06-01'}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <button className="btn btn-primary" style={{ marginTop: 12 }}
              onClick={handlePaste} disabled={!pasteText.trim()}>
              解析数据
            </button>
          </div>

          {/* Preview */}
          {rawData.length > 0 && (
            <div className="card">
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontWeight: 600 }}>已解析 {rawData.length} 条记录</h3>
                  <p style={{ color: 'var(--text3)', fontSize: 13 }}>共 {headers.length} 个字段</p>
                </div>
                <button className="btn btn-primary btn-lg" onClick={handleAnalyze}>
                  开始分析 →
                </button>
              </div>

              {Object.keys(fieldMap).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>自动识别字段：</p>
                  <div className="tags">
                    {Object.entries(fieldMap).map(([cat, col]) => (
                      <span key={cat} className="tag">{catLabels[cat] || cat}: {col}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="data-table">
                <table>
                  <thead><tr>{headers.slice(0, 8).map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {rawData.slice(0, 5).map((row, i) => (
                      <tr key={i}>{headers.slice(0, 8).map((h) => <td key={h}>{String(row[h] ?? '')}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
                {rawData.length > 5 && (
                  <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                    显示前 5 行，共 {rawData.length} 行
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'dashboard' && analysis && report && (
        <Dashboard analysis={analysis} report={report} onBack={() => setStep('import')} />
      )}
    </div>
  );
}

const catLabels: Record<string, string> = {
  name: '姓名', department: '部门', position: '岗位', level: '职级',
  hireDate: '入职日期', leaveDate: '离职日期', birthDate: '出生日期',
  gender: '性别', education: '学历', tenure: '司龄', salary: '薪资',
  performance: '绩效', status: '状态', manager: '上级', location: '地点',
  age: '年龄', type: '类型',
};
