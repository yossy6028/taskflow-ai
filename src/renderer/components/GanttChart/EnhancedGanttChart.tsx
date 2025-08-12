import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Filter, 
  Download, 
  Calendar,
  Users,
  Flag,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List
} from 'lucide-react'

interface GanttTask {
  id: string
  name: string
  startDate: Date
  endDate: Date
  progress: number
  status: 'todo' | 'in_progress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignees: string[]
  dependencies?: string[]
  milestones?: Array<{ date: Date; label: string }>
}

interface EnhancedGanttChartProps {
  tasks: GanttTask[]
  onTaskClick?: (task: GanttTask) => void
  onTaskUpdate?: (task: GanttTask) => void
}

const EnhancedGanttChart: React.FC<EnhancedGanttChartProps> = ({ 
  tasks, 
  onTaskClick, 
  onTaskUpdate 
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)
  const [showMilestones, setShowMilestones] = useState(true)
  const [showDependencies, setShowDependencies] = useState(true)

  const margin = { top: 80, right: 40, bottom: 60, left: 200 }
  const innerWidth = dimensions.width - margin.left - margin.right
  const innerHeight = dimensions.height - margin.top - margin.bottom

  const statusColors = {
    todo: '#94a3b8',
    in_progress: '#0ea5e9',
    review: '#f59e0b',
    completed: '#22c55e'
  }

  const priorityGradients = {
    low: ['#e2e8f0', '#cbd5e1'],
    medium: ['#7dd3fc', '#38bdf8'],
    high: ['#fcd34d', '#fbbf24'],
    urgent: ['#fca5a5', '#f87171']
  }

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!svgRef.current || tasks.length === 0) return

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Define gradients for priority
    const defs = svg.append('defs')
    
    Object.entries(priorityGradients).forEach(([priority, colors]) => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${priority}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%')
      
      gradient.append('stop')
        .attr('offset', '0%')
        .style('stop-color', colors[0])
        .style('stop-opacity', 1)
      
      gradient.append('stop')
        .attr('offset', '100%')
        .style('stop-color', colors[1])
        .style('stop-opacity', 1)
    })

    // Add glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
    
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur')
    
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode')
      .attr('in', 'coloredBlur')
    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic')

    // Calculate date range
    const startDates = tasks.map(t => t.startDate)
    const endDates = tasks.map(t => t.endDate)
    const minDate = d3.min(startDates) || new Date()
    const maxDate = d3.max(endDates) || new Date()

    // Add padding to date range
    const datePadding = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    const extendedMinDate = new Date(minDate.getTime() - datePadding)
    const extendedMaxDate = new Date(maxDate.getTime() + datePadding)

    // Create scales
    const xScale = d3.scaleTime()
      .domain([extendedMinDate, extendedMaxDate])
      .range([0, innerWidth])

    const yScale = d3.scaleBand()
      .domain(tasks.map(t => t.id))
      .range([0, innerHeight])
      .padding(0.3)

    // Add grid lines
    const gridLines = g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)

    // Vertical grid lines (time)
    const timeInterval = viewMode === 'day' ? d3.timeDay : 
                        viewMode === 'week' ? d3.timeWeek : 
                        d3.timeMonth

    gridLines.selectAll('.vertical-grid')
      .data(timeInterval.range(extendedMinDate, extendedMaxDate))
      .enter()
      .append('line')
      .attr('class', 'vertical-grid')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')

    // Horizontal grid lines
    gridLines.selectAll('.horizontal-grid')
      .data(tasks)
      .enter()
      .append('line')
      .attr('class', 'horizontal-grid')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => (yScale(d.id) || 0) + yScale.bandwidth() / 2)
      .attr('y2', d => (yScale(d.id) || 0) + yScale.bandwidth() / 2)
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 0.5)

    // Add weekend highlighting
    const weekends = g.append('g')
      .attr('class', 'weekends')
      .attr('opacity', 0.03)

    const allDays = d3.timeDay.range(extendedMinDate, extendedMaxDate)
    const weekendDays = allDays.filter(d => d.getDay() === 0 || d.getDay() === 6)

    weekends.selectAll('.weekend')
      .data(weekendDays)
      .enter()
      .append('rect')
      .attr('class', 'weekend')
      .attr('x', d => xScale(d))
      .attr('y', 0)
      .attr('width', d => {
        const nextDay = d3.timeDay.offset(d, 1)
        return xScale(nextDay) - xScale(d)
      })
      .attr('height', innerHeight)
      .attr('fill', '#0ea5e9')

    // Add today line
    const today = new Date()
    if (today >= extendedMinDate && today <= extendedMaxDate) {
      g.append('line')
        .attr('class', 'today-line')
        .attr('x1', xScale(today))
        .attr('x2', xScale(today))
        .attr('y1', -20)
        .attr('y2', innerHeight + 20)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.8)

      g.append('text')
        .attr('x', xScale(today))
        .attr('y', -25)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ef4444')
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .text('今日')
    }

    // Draw dependencies
    if (showDependencies) {
      const dependencies = g.append('g')
        .attr('class', 'dependencies')

      tasks.forEach(task => {
        if (task.dependencies) {
          task.dependencies.forEach(depId => {
            const depTask = tasks.find(t => t.id === depId)
            if (depTask) {
              const startX = xScale(depTask.endDate)
              const startY = (yScale(depTask.id) || 0) + yScale.bandwidth() / 2
              const endX = xScale(task.startDate)
              const endY = (yScale(task.id) || 0) + yScale.bandwidth() / 2

              // Create curved path
              const midX = (startX + endX) / 2
              const path = `M ${startX} ${startY} 
                           C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`

              dependencies.append('path')
                .attr('d', path)
                .attr('stroke', '#cbd5e1')
                .attr('stroke-width', 2)
                .attr('fill', 'none')
                .attr('marker-end', 'url(#arrowhead)')
                .attr('opacity', 0.6)
            }
          })
        }
      })

      // Add arrowhead marker
      defs.append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#cbd5e1')
    }

    // Draw task bars
    const taskGroups = g.selectAll('.task-group')
      .data(tasks)
      .enter()
      .append('g')
      .attr('class', 'task-group')
      .attr('transform', d => `translate(0, ${yScale(d.id)})`)

    // Task background bar
    taskGroups.append('rect')
      .attr('class', 'task-bg')
      .attr('x', d => xScale(d.startDate))
      .attr('y', 0)
      .attr('width', d => xScale(d.endDate) - xScale(d.startDate))
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('fill', d => `url(#gradient-${d.priority})`)
      .attr('opacity', 0.2)

    // Task progress bar
    taskGroups.append('rect')
      .attr('class', 'task-progress')
      .attr('x', d => xScale(d.startDate))
      .attr('y', 0)
      .attr('width', d => (xScale(d.endDate) - xScale(d.startDate)) * (d.progress / 100))
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('fill', d => statusColors[d.status])
      .attr('opacity', 0.9)
      .attr('filter', d => d.id === hoveredTask ? 'url(#glow)' : 'none')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedTask(d.id)
        onTaskClick?.(d)
      })
      .on('mouseenter', (event, d) => setHoveredTask(d.id))
      .on('mouseleave', () => setHoveredTask(null))

    // Task name
    taskGroups.append('text')
      .attr('x', -10)
      .attr('y', yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', 12)
      .attr('font-weight', d => d.id === selectedTask ? 600 : 400)
      .text(d => d.name)
      .style('cursor', 'pointer')
      .on('click', (event, d) => onTaskClick?.(d))

    // Progress percentage
    taskGroups.append('text')
      .attr('x', d => xScale(d.startDate) + (xScale(d.endDate) - xScale(d.startDate)) / 2)
      .attr('y', yScale.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'white')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .text(d => `${d.progress}%`)
      .style('pointer-events', 'none')

    // Milestones
    if (showMilestones) {
      tasks.forEach(task => {
        if (task.milestones) {
          const milestoneGroup = g.append('g')
            .attr('class', 'milestones')

          task.milestones.forEach(milestone => {
            const x = xScale(milestone.date)
            const y = (yScale(task.id) || 0) + yScale.bandwidth() / 2

            milestoneGroup.append('circle')
              .attr('cx', x)
              .attr('cy', y)
              .attr('r', 5)
              .attr('fill', '#f59e0b')
              .attr('stroke', 'white')
              .attr('stroke-width', 2)

            milestoneGroup.append('text')
              .attr('x', x)
              .attr('y', y - 10)
              .attr('text-anchor', 'middle')
              .attr('font-size', 10)
              .attr('fill', '#f59e0b')
              .attr('font-weight', 600)
              .text(milestone.label)
          })
        }
      })
    }

    // X-axis (time)
    const xAxis = d3.axisBottom<Date>(xScale)
      .ticks(viewMode === 'day' ? d3.timeDay.every(1) as any :
              viewMode === 'week' ? d3.timeWeek.every(1) as any :
              d3.timeMonth.every(1) as any)
      .tickFormat(d3.timeFormat(viewMode === 'day' ? '%m/%d' :
                                viewMode === 'week' ? '%m/%d' :
                                '%b') as unknown as (d: Date, i: number) => string)

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#6b7280')

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .translateExtent([[-100, -100], [dimensions.width + 100, dimensions.height + 100]])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
        setZoomLevel(event.transform.k)
      })

    svg.call(zoom)

  }, [tasks, dimensions, viewMode, hoveredTask, selectedTask, showMilestones, showDependencies])

  const handleZoomIn = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current)
      svg.transition().duration(300).call(
        d3.zoom<SVGSVGElement, unknown>().scaleTo as any,
        zoomLevel * 1.2
      )
    }
  }

  const handleZoomOut = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current)
      svg.transition().duration(300).call(
        d3.zoom<SVGSVGElement, unknown>().scaleTo as any,
        zoomLevel * 0.8
      )
    }
  }

  const handleResetZoom = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current)
      svg.transition().duration(300).call(
        d3.zoom<SVGSVGElement, unknown>().scaleTo as any,
        1
      )
    }
  }

  return (
    <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-xl overflow-hidden">
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              ガントチャート
            </h3>
            
            {/* View Mode Selector */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'day' 
                    ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm' 
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                日
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'week' 
                    ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm' 
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                週
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'month' 
                    ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm' 
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                月
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Options */}
            <button
              onClick={() => setShowMilestones(!showMilestones)}
              className={`p-2 rounded-lg transition-colors ${
                showMilestones 
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
              title="マイルストーン表示"
            >
              <Flag size={18} />
            </button>
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className={`p-2 rounded-lg transition-colors ${
                showDependencies 
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
              title="依存関係表示"
            >
              <Grid3x3 size={18} />
            </button>
            
            <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-700 mx-1" />
            
            {/* Zoom Controls */}
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-neutral-600 dark:text-neutral-400"
              title="ズームアウト"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-neutral-600 dark:text-neutral-400"
              title="リセット"
            >
              <Maximize2 size={18} />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-neutral-600 dark:text-neutral-400"
              title="ズームイン"
            >
              <ZoomIn size={18} />
            </button>
            
            <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-700 mx-1" />
            
            <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-neutral-600 dark:text-neutral-400">
              <Filter size={18} />
            </button>
            <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-neutral-600 dark:text-neutral-400">
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-neutral-500 dark:text-neutral-400">ステータス:</span>
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-neutral-600 dark:text-neutral-400">
                  {status === 'todo' ? '未着手' :
                   status === 'in_progress' ? '進行中' :
                   status === 'review' ? 'レビュー' :
                   '完了'}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 dark:text-neutral-400">ズーム:</span>
            <span className="text-neutral-600 dark:text-neutral-400 font-medium">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="w-full h-[600px] pt-24">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full"
        />
      </div>
    </div>
  )
}

export default EnhancedGanttChart