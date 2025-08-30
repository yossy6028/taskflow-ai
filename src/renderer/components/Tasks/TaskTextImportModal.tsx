import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { DBTaskRow } from '../../../shared/types';
import { useDispatch, useSelector } from 'react-redux';
import { setTasks, Task as ReduxTask } from '../../store/slices/tasksSlice';
import { RootState } from '../../store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type PendingTask = {
  title: string;
  description: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  tags?: string; // comma separated
};

function toISODate(year: number, md: string): string | null {
  const [m, d] = md.split('/').map((v) => Number(v));
  if (!m || !d) return null;
  const dt = new Date(Date.UTC(year, m - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function parseTasksFromText(input: string): PendingTask[] {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const year = new Date().getFullYear();
  const tasks: PendingTask[] = [];
  for (const line of lines) {
    // Skip phase headers
    if (/^\*\*?\s*Phase/i.test(line)) continue;
    // Match bullet lines with dates in parentheses
    // e.g. * タスク1：タイトル (8/20-8/30) or (9/9) or **タスク...** (...)
    const m = line.match(/^[*-]\s*(?:\*\*)?[^()]*?：?\s*([^()]+?)\s*\(([^)]+)\)/);
    if (m) {
      const title = m[1].trim();
      const datePart = m[2].trim();
      let startDate = '';
      let endDate = '';
      const range = datePart.match(/^(\d{1,2}\/\d{1,2})\s*-\s*(\d{1,2}\/\d{1,2})$/);
      const single = datePart.match(/^(\d{1,2}\/\d{1,2})$/);
      if (range) {
        const s = toISODate(year, range[1] as string);
        const e = toISODate(year, range[2] as string);
        startDate = s ?? '';
        endDate = e ?? '';
      } else if (single) {
        const s = toISODate(year, single[1] as string);
        startDate = s ?? '';
        endDate = s ?? '';
      }
      tasks.push({
        title,
        description: '',
        startDate: startDate || new Date().toISOString().slice(0, 10),
        endDate: endDate || new Date().toISOString().slice(0, 10),
        estimatedHours: 2,
        priority: 'medium',
        assignee: '',
        tags: '',
      });
    }
  }
  return tasks;
}

const TaskTextImportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const currentProjectId = useSelector((state: RootState) => state.projects.currentProjectId);
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<PendingTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parsedPreview = useMemo(() => parseTasksFromText(raw), [raw]);

  if (!isOpen) return null;

  const loadParsed = () => {
    const t = parseTasksFromText(raw);
    if (t.length === 0) {
      setError('取り込めるタスクが見つかりませんでした。書式をご確認ください。');
      return;
    }
    setError(null);
    setRows(t);
  };

  const saveAll = async () => {
    try {
      for (const t of rows) {
        if (!t.title.trim()) continue;
        const s = new Date(t.startDate);
        const e = new Date(t.endDate);
        if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) continue;
        const tagsArr = (t.tags || '')
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
        await window.electronAPI.dbCreateTask({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          projectId: currentProjectId || 'default',
          title: t.title,
          description: t.description,
          estimatedHours: t.estimatedHours ?? 1,
          startDate: s.toISOString(),
          endDate: e.toISOString(),
          priority: t.priority,
          progress: 0,
          dependencies: [],
          tags: tagsArr,
          // 取り込み承認後は進行中へ
          status: 'in-progress',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      const res = await window.electronAPI.dbGetTasks({ projectId: currentProjectId || 'default' });
      if (res.success && res.data) {
        const mapped: ReduxTask[] = res.data.map((row: DBTaskRow) => ({
          id: row.id,
          projectId: (row as any).project_id || 'default',
          title: row.title,
          description: row.description ?? '',
          startDate: new Date(row.start_date),
          endDate: new Date(row.end_date),
          progress: row.progress,
          priority: row.priority,
          dependencies: row.dependencies ?? [],
          status: row.status,
          estimatedHours: row.estimated_hours ?? 0,
          actualHours: row.actual_hours ?? undefined,
          assignee: row.assignee ?? undefined,
          tags: row.tags ?? [],
        }));
        dispatch(setTasks(mapped));
      }
      onClose();
    } catch (e) {
      console.error('Import save failed', e);
      setError('保存時にエラーが発生しました');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-5xl bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-lg font-semibold">テキスト計画を取り込み</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          <div className="space-y-2">
            <label className="text-sm text-neutral-600 dark:text-neutral-300">テキスト（貼り付け）</label>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="w-full h-64 p-3 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              placeholder="箇条書きのタスクと日付（例: * タスク1：... (8/20-8/30)）を貼り付けてください"
            />
            <button onClick={loadParsed} className="btn btn-gradient">取り込む</button>
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
            <div className="text-xs text-neutral-500">
              先読みプレビュー（自動解析）
              <ul className="list-disc list-inside">
                {parsedPreview.slice(0, 5).map((t, i) => (
                  <li key={i}>{t.title} ({t.startDate} - {t.endDate})</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">編集・微調整</h4>
              <button
                onClick={() => setRows((prev) => ([...prev, {
                  title: '', description: '', startDate: new Date().toISOString().slice(0,10), endDate: new Date().toISOString().slice(0,10), estimatedHours: 1, priority: 'medium', assignee: '', tags: ''
                }]))}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                ＋ タスク追加
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-3">
              {rows.map((t, i) => (
                <div key={i} className="p-3 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input className="px-3 py-2 rounded border bg-white dark:bg-neutral-900" placeholder="タイトル" value={t.title} onChange={(e) => setRows(prev => prev.map((pt, idx) => idx===i?{...pt, title: e.target.value}:pt))} />
                    <input className="px-3 py-2 rounded border bg-white dark:bg-neutral-900" placeholder="担当" value={t.assignee ?? ''} onChange={(e) => setRows(prev => prev.map((pt, idx) => idx===i?{...pt, assignee: e.target.value}:pt))} />
                    <textarea className="sm:col-span-2 px-3 py-2 rounded border bg-white dark:bg-neutral-900" placeholder="説明" value={t.description} onChange={(e) => setRows(prev => prev.map((pt, idx) => idx===i?{...pt, description: e.target.value}:pt))} />
                    <label className="flex items-center gap-2"><span className="w-16 text-sm">開始日</span><input type="date" className="flex-1 px-3 py-2 rounded border bg-white dark:bg-neutral-900" value={t.startDate} onChange={(e)=>setRows(prev=>prev.map((pt,idx)=>idx===i?{...pt, startDate: e.target.value}:pt))} /></label>
                    <label className="flex items-center gap-2"><span className="w-16 text-sm">終了日</span><input type="date" className="flex-1 px-3 py-2 rounded border bg-white dark:bg-neutral-900" value={t.endDate} onChange={(e)=>setRows(prev=>prev.map((pt,idx)=>idx===i?{...pt, endDate: e.target.value}:pt))} /></label>
                    <label className="flex items-center gap-2"><span className="w-16 text-sm">工数</span><input type="number" min={0} step={0.5} className="flex-1 px-3 py-2 rounded border bg-white dark:bg-neutral-900" value={t.estimatedHours} onChange={(e)=>setRows(prev=>prev.map((pt,idx)=>idx===i?{...pt, estimatedHours: Number(e.target.value) || 0}:pt))} /></label>
                    <label className="flex items-center gap-2"><span className="w-16 text-sm">優先度</span><select className="flex-1 px-3 py-2 rounded border bg-white dark:bg-neutral-900" value={t.priority} onChange={(e)=>setRows(prev=>prev.map((pt,idx)=>idx===i?{...pt, priority: e.target.value as PendingTask['priority']}:pt))}>
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select></label>
                    <input className="sm:col-span-2 px-3 py-2 rounded border bg-white dark:bg-neutral-900" placeholder="タグ (comma, separated)" value={t.tags ?? ''} onChange={(e)=>setRows(prev=>prev.map((pt,idx)=>idx===i?{...pt, tags: e.target.value}:pt))} />
                  </div>
                  <div className="flex justify-end mt-2">
                    <button className="text-sm text-red-600 hover:text-red-700" onClick={()=>setRows(prev=>prev.filter((_,idx)=>idx!==i))}>このタスクを削除</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="btn btn-glass">キャンセル</button>
              <button onClick={saveAll} className="btn btn-gradient">承認してタスク化</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskTextImportModal;




