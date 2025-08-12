import React from 'react'

export type DependencyAnalysis = {
  optimizedOrder: string[]
  criticalPath: string[]
  parallelizable: string[][]
  bottlenecks: string[]
  recommendations: string[]
  [key: string]: unknown
}

type Props = {
  isOpen: boolean
  onClose: () => void
  analysis: DependencyAnalysis | null
  isLoading: boolean
  error: string | null
}

const Pill: React.FC<{ label: string; className?: string }> = ({ label, className }) => (
  <span className={`inline-block text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 ${className ?? ''}`}>
    {label}
  </span>
)

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-2">{title}</h4>
    {children}
  </div>
)

const DependencyAnalysisPanel: React.FC<Props> = ({ isOpen, onClose, analysis, isLoading, error }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6">
      <div className="w-full md:max-w-3xl bg-white dark:bg-neutral-900 rounded-t-2xl md:rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="font-semibold">依存関係分析</h3>
          <button onClick={onClose} className="px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">閉じる</button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading && (
            <div className="text-sm text-neutral-600 dark:text-neutral-300">分析中です…</div>
          )}
          {error && (
            <div className="text-sm text-error-600 dark:text-error-400">{error}</div>
          )}
          {!isLoading && !error && analysis && (
            <div className="space-y-4">
              <Section title="最適順序">
                <div className="flex flex-wrap gap-2">
                  {analysis.optimizedOrder?.map((t, i) => (
                    <Pill key={`${t}-${i}`} label={t} className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300" />
                  ))}
                </div>
              </Section>

              <Section title="クリティカルパス">
                <div className="flex flex-wrap gap-2">
                  {analysis.criticalPath?.map((t, i) => (
                    <Pill key={`${t}-${i}`} label={t} className="bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300" />
                  ))}
                </div>
              </Section>

              <Section title="並行実行グループ">
                <div className="space-y-2">
                  {analysis.parallelizable?.map((group, gi) => (
                    <div key={gi} className="flex flex-wrap gap-2">
                      {group.map((t, i) => (
                        <Pill key={`${gi}-${t}-${i}`} label={t} className="bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300" />
                      ))}
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="ボトルネック">
                <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                  {analysis.bottlenecks?.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </Section>

              <Section title="推奨事項">
                <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                  {analysis.recommendations?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DependencyAnalysisPanel







