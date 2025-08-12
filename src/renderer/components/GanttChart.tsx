import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import * as d3 from 'd3';
import { format } from 'date-fns';

const GanttChart: React.FC = React.memo(() => {
  const tasks = useSelector((state: RootState) => state.tasks.tasks);
  const currentProjectId = useSelector((state: RootState) => state.projects.currentProjectId);
  const currentProject = useSelector((state: RootState) => state.projects.projects.find(p => p.id === state.projects.currentProjectId));
  
  // 現在のプロジェクトのタスクのみフィルタリング
  const projectTasks = tasks.filter(task => task.projectId === currentProjectId);
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // メモ化された日付範囲の計算
  const dateRange = useMemo(() => {
    if (projectTasks.length === 0) return { minDate: new Date(), maxDate: new Date() };
    
    const startDates = projectTasks.map(t => new Date(t.startDate));
    const endDates = projectTasks.map(t => new Date(t.endDate));
    return {
      minDate: new Date(Math.min(...startDates.map(d => d.getTime()))),
      maxDate: new Date(Math.max(...endDates.map(d => d.getTime())))
    };
  }, [projectTasks]);

  // チャートのサイズを計算
  const calculateDimensions = useCallback(() => {
    if (!chartRef.current) return;
    const margin = { top: 50, right: 50, bottom: 50, left: 150 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = Math.max(400, projectTasks.length * 40);
    setDimensions({ width, height });
  }, [projectTasks.length]);

  // 初期化とリサイズの処理
  useEffect(() => {
    calculateDimensions();
    const handleResize = () => calculateDimensions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateDimensions]);

  // チャートの描画または更新
  const updateChart = useCallback(() => {
    if (!chartRef.current || projectTasks.length === 0 || dimensions.width === 0) return;

    const margin = { top: 50, right: 50, bottom: 50, left: 150 };
    const { width, height } = dimensions;

    // 既存のSVGがあるか確認
    let svg = svgRef.current;
    if (!svg) {
      // 初回描画
      d3.select(chartRef.current).selectAll('*').remove();
      svg = d3.select(chartRef.current)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
      
      svgRef.current = svg;
    } else {
      // サイズ更新
      svg
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    }

    // 既存のグループを削除して再作成（更新処理）
    svg.selectAll('g').remove();
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // スケールの作成
    const xScale = d3.scaleTime()
      .domain([dateRange.minDate, dateRange.maxDate])
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain(projectTasks.map((_, i) => i.toString()))
      .range([0, height])
      .padding(0.2);

    // X軸の追加
    const xAxis = d3.axisBottom(xScale);
    
    // viewModeに応じてティック数を調整
    switch (viewMode) {
      case 'day':
        xAxis.ticks(d3.timeDay.every(1)).tickFormat(d => format(d as Date, 'MM/dd'));
        break;
      case 'week':
        xAxis.ticks(d3.timeWeek.every(1)).tickFormat(d => format(d as Date, 'MM/dd'));
        break;
      case 'month':
        xAxis.ticks(d3.timeMonth.every(1)).tickFormat(d => format(d as Date, 'yyyy/MM'));
        break;
    }

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);

    // タスクラベルの追加
    g.append('g')
      .attr('class', 'y-axis')
      .selectAll('text')
      .data(projectTasks)
      .enter()
      .append('text')
      .attr('x', -10)
      .attr('y', (_, i) => (yScale(i.toString()) || 0) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('alignment-baseline', 'middle')
      .style('font-size', '12px')
      .style('cursor', 'pointer')
      .text(d => d.title.slice(0, 20) + (d.title.length > 20 ? '...' : ''))
      .on('click', (event, d) => {
        console.log('Task clicked:', d);
      });

    // グリッドラインの追加
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3.axisBottom(xScale)
          .tickSize(-height)
          .tickFormat(() => '')
      )
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3);

    // タスクバーのグループ
    const taskBars = g.selectAll('.task-bar')
      .data(projectTasks)
      .enter()
      .append('g')
      .attr('class', 'task-bar')
      .style('cursor', 'pointer');

    // 背景バー
    taskBars.append('rect')
      .attr('x', d => xScale(new Date(d.startDate)))
      .attr('y', (_, i) => yScale(i.toString()) || 0)
      .attr('width', d => Math.max(0, xScale(new Date(d.endDate)) - xScale(new Date(d.startDate))))
      .attr('height', yScale.bandwidth())
      .attr('rx', 4)
      .attr('fill', '#e5e7eb')
      .attr('opacity', 0.5);

    // 進捗バー
    taskBars.append('rect')
      .attr('x', d => xScale(new Date(d.startDate)))
      .attr('y', (_, i) => yScale(i.toString()) || 0)
      .attr('width', d => {
        const totalWidth = Math.max(0, xScale(new Date(d.endDate)) - xScale(new Date(d.startDate)));
        return totalWidth * (d.progress / 100);
      })
      .attr('height', yScale.bandwidth())
      .attr('rx', 4)
      .attr('fill', d => {
        switch (d.priority) {
          case 'high': return '#ef4444';
          case 'medium': return '#f59e0b';
          case 'low': return '#10b981';
          default: return '#3b82f6';
        }
      })
      .attr('opacity', 0.8)
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.8);
      });

    // 進捗率テキスト
    taskBars.append('text')
      .attr('x', d => {
        const barStart = xScale(new Date(d.startDate));
        const barWidth = Math.max(0, xScale(new Date(d.endDate)) - xScale(new Date(d.startDate)));
        return barStart + barWidth / 2;
      })
      .attr('y', (_, i) => (yScale(i.toString()) || 0) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .style('fill', 'white')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => `${d.progress}%`);

    // ツールチップ
    taskBars.append('title')
      .text(d => `${d.title}
進捗: ${d.progress}%
優先度: ${d.priority === 'high' ? '高' : d.priority === 'medium' ? '中' : '低'}
期間: ${format(new Date(d.startDate), 'yyyy/MM/dd')} - ${format(new Date(d.endDate), 'yyyy/MM/dd')}
${d.description ? `説明: ${d.description}` : ''}`);

    // 今日の線
    const today = new Date();
    if (today >= dateRange.minDate && today <= dateRange.maxDate) {
      const todayGroup = g.append('g').attr('class', 'today-marker');
      
      todayGroup.append('line')
        .attr('x1', xScale(today))
        .attr('x2', xScale(today))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.7);

      todayGroup.append('text')
        .attr('x', xScale(today))
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ef4444')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text('今日');
    }

    // 依存関係の線（もしあれば）
    projectTasks.forEach((task, i) => {
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          const depIndex = projectTasks.findIndex(t => t.id === depId);
          if (depIndex !== -1) {
            const depTask = projectTasks[depIndex];
            const startX = xScale(new Date(depTask.endDate));
            const startY = (yScale(depIndex.toString()) || 0) + yScale.bandwidth() / 2;
            const endX = xScale(new Date(task.startDate));
            const endY = (yScale(i.toString()) || 0) + yScale.bandwidth() / 2;

            // 依存関係の矢印
            g.append('path')
              .attr('d', `M ${startX} ${startY} L ${endX} ${endY}`)
              .attr('stroke', '#9ca3af')
              .attr('stroke-width', 1)
              .attr('fill', 'none')
              .attr('marker-end', 'url(#arrowhead)')
              .attr('opacity', 0.5);
          }
        });
      }
    });

    // 矢印のマーカー定義
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 7)
      .attr('refX', 9)
      .attr('refY', 3.5)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3.5, 0 7')
      .attr('fill', '#9ca3af');

  }, [projectTasks, viewMode, dateRange, dimensions]);

  // チャートの更新
  useEffect(() => {
    updateChart();
  }, [updateChart]);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">ガントチャート <span className="ml-2 text-sm text-gray-500">{currentProject?.name || ''}</span></h2>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button 
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'day' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                日表示
              </button>
              <button 
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'week' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                週表示
              </button>
              <button 
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'month' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                月表示
              </button>
            </div>
            <div className="text-sm text-gray-500">
              タスク数: {projectTasks.length}
            </div>
          </div>
        </div>
      </div>

      {/* チャート本体 */}
      <div className="flex-1 overflow-auto p-6">
        {projectTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-2">タスクがありません</p>
              <p className="text-sm">AIとの対話でタスクを生成してください</p>
            </div>
          </div>
        ) : (
          <div 
            ref={chartRef} 
            className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            style={{ minHeight: '400px' }}
          />
        )}
      </div>
    </div>
  );
});

GanttChart.displayName = 'GanttChart';

export default GanttChart;