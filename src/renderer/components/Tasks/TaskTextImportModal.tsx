import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { DBTaskRow } from '../../../shared/types';
import { useDispatch, useSelector } from 'react-redux';
import { setTasks } from '../../store/slices/tasksSlice';
import type { RootState } from '../../store';

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

  const withTimeout = <T,>(promise: Promise<T>, ms: number, message = 'Request timed out'): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms))
    ])
  }

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
      const savePromises: Array<Promise<unknown>> = []
      for (const t of rows) {
        if (!t.title.trim()) continue;
        const s = new Date(t.startDate);
        const e = new Date(t.endDate);
        if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) continue;
        const tagsArr = (t.tags || '')
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
        const payload = {
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
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        savePromises.push(
          withTimeout(window.electronAPI.dbCreateTask(payload), 7000).catch((e: any) => {
            console.error('Import save failed for a task', e?.message || e)
            return { success: false, message: e?.message || 'save failed' }
          })
        )
      }

      if (savePromises.length > 0) {
        await Promise.allSettled(savePromises)
      }

      const res = await withTimeout(window.electronAPI.dbGetTasks({ projectId: currentProjectId || 'default' }), 10000).catch(() => null)
      if (res && (res as any).success && (res as any).data) {
        const mapped = (res as any).data.map((row: DBTaskRow) => ({
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
          {/* left */}
          <div className="space-y-3">
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="タスクタイトル | 2025-09-01 | 2025-09-03 | medium | 2h | 担当A | tag1, tag2"
              className="w-full h-72 p-3 border rounded-md bg-white/60 dark:bg-neutral-800/60"
            />
            <div className="flex items-center gap-2">
              <button onClick={loadParsed} className="btn btn-primary">プレビュー</button>
              {error && <span className="text-red-500 text-sm">{error}</span>}
            </div>
          </div>

          {/* right */}
          <div className="space-y-2 max-h-80 overflow-auto pr-2">
            {parsedPreview.map((t, i) => (
              <div key={i} className="p-2 border rounded-md text-sm">
                <div className="font-medium">{t.title}</div>
                <div className="text-neutral-500">{t.startDate} → {t.endDate} / {t.priority} / {t.estimatedHours ?? 1}h</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn btn-glass">キャンセル</button>
            <button onClick={saveAll} className="btn btn-gradient">承認してタスク化</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskTextImportModal





