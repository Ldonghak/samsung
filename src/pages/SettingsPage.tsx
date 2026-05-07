import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Settings } from '../types';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, exportData, importData } = useApp();
  const [s, setS] = useState<Settings>({ ...settings });
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = () => { updateSettings(s); alert('설정이 저장되었습니다.'); };

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `samsung-trader-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = importData(ev.target?.result as string);
      setImportMsg(ok ? '✅ 데이터를 성공적으로 가져왔습니다.' : '❌ 올바르지 않은 파일입니다.');
      if (ok) setS({ ...settings });
      setTimeout(() => setImportMsg(''), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">⚙️ 설정</h1>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">📊 매매 신호 임계값</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-muted block mb-1">우선주 매수 추천 기준 (%)</label>
            <input type="number" value={s.buyPreferredThreshold} onChange={e => setS({ ...s, buyPreferredThreshold: +e.target.value })} className="w-full" />
            <p className="text-xs text-slate-muted mt-1">괴리율이 이 값 이상이면 우선주 매수 추천</p>
          </div>
          <div>
            <label className="text-sm text-slate-muted block mb-1">보통주 매수 추천 기준 (%)</label>
            <input type="number" value={s.buyCommonThreshold} onChange={e => setS({ ...s, buyCommonThreshold: +e.target.value })} className="w-full" />
            <p className="text-xs text-slate-muted mt-1">괴리율이 이 값 이하이면 보통주 매수 추천</p>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">💰 거래 비용 설정</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-muted block mb-1">매매 수수료 (%)</label>
            <input type="number" step="0.001" value={s.commissionRate} onChange={e => setS({ ...s, commissionRate: +e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="text-sm text-slate-muted block mb-1">거래세 - 매도 (%)</label>
            <input type="number" step="0.01" value={s.taxRate} onChange={e => setS({ ...s, taxRate: +e.target.value })} className="w-full" />
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">🔔 알림 설정</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={s.alertEnabled} onChange={e => setS({ ...s, alertEnabled: e.target.checked })} className="w-4 h-4 accent-cyan-500" />
            <span className="text-sm">브라우저 푸시 알림</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={s.signalAlertEnabled} onChange={e => setS({ ...s, signalAlertEnabled: e.target.checked })} className="w-4 h-4 accent-cyan-500" />
            <span className="text-sm">매매 신호 발생 시 알림</span>
          </label>
        </div>
      </div>

      <button className="btn-primary w-full mb-6 py-3 text-base" onClick={handleSave}>설정 저장</button>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">💾 데이터 관리</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-secondary flex-1" onClick={handleExport}>📥 내보내기 (JSON)</button>
          <button className="btn-secondary flex-1" onClick={() => fileRef.current?.click()}>📤 가져오기 (JSON)</button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
        {importMsg && <p className="text-sm mt-3 text-center">{importMsg}</p>}
      </div>

      <div className="card bg-signal-warning/5 border-signal-warning/20">
        <h2 className="text-lg font-semibold mb-2 text-signal-warning">⚠️ 면책 조항</h2>
        <p className="text-sm text-slate-muted leading-relaxed">
          본 서비스는 삼성전자 보통주-우선주 괴리율 정보를 제공하며, 실제 매매를 자동으로 수행하지 않습니다.
          제공되는 데이터 및 매매 신호는 참고용이며, 투자 판단에 대한 모든 책임은 사용자에게 있습니다.
          주가 데이터는 실시간이 아닌 지연 데이터일 수 있습니다.
        </p>
      </div>
    </div>
  );
};
