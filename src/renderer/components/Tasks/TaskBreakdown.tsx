import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../store'
import { updateTask as updateReduxTask } from '../../store/slices/tasksSlice'
import { setTodosForTask, toggleTodoComplete, addTodo, updateTodo, deleteTodo, clearTodosForTask, reorderTodos, Todo } from '../../store/slices/todosSlice'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  ListTodo,
  CheckCircle2,
  Circle,
  GripVertical
} from 'lucide-react'

interface TaskBreakdownProps {
  taskId: string
  taskTitle: string
  onGenerateTodos?: () => void
}

const TaskBreakdown: React.FC<TaskBreakdownProps> = ({ taskId, taskTitle, onGenerateTodos }) => {
  const dispatch = useDispatch()
  const todos = useSelector((state: RootState) => 
    state.todos.todos.filter(todo => todo.taskId === taskId)
      .sort((a, b) => a.order - b.order)
  )
  
  const [isExpanded, setIsExpanded] = useState(true) // デフォルトで展開
  const [isGenerating, setIsGenerating] = useState(false)
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  // このタスクのTODOが生成済みかをLocalStorageで管理
  const [hasGeneratedTodos, setHasGeneratedTodos] = useState(() => {
    const generated = localStorage.getItem(`task-todos-generated-${taskId}`)
    return generated === 'true'
  })

  const completedCount = todos.filter(t => t.completed).length
  const totalCount = todos.length
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // タスク進捗のRedux/DB反映（右側の進捗バー等にも反映させる）
  const currentTask = useSelector((state: RootState) => state.tasks.tasks.find(t => t.id === taskId))
  const [lastSyncedProgress, setLastSyncedProgress] = useState<number | null>(null)

  useEffect(() => {
    if (!currentTask) return
    // TODOが未生成（総数0）の場合は、既存のタスク進捗を0で上書きしない
    if (totalCount === 0) return
    if (lastSyncedProgress === completionRate) return
    setLastSyncedProgress(completionRate)

    const nextStatus = completionRate === 100
      ? 'completed'
      : (completionRate > 0 ? 'in-progress' : (currentTask.status || 'pending'))

    // Redux更新
    dispatch(updateReduxTask({
      ...currentTask,
      progress: completionRate,
      status: nextStatus as any
    }))

    // DBへ永続化（エラーは無視してUIは更新）
    void window.electronAPI.dbUpdateTask(taskId, {
      progress: completionRate,
      status: nextStatus
    } as any)
  }, [completionRate, currentTask, dispatch, taskId, totalCount])

  // 初回マウント時に自動的にTODOを生成
  useEffect(() => {
    // このタスク用のTODOがまだ生成されていない場合のみ生成
    if (todos.length === 0 && !hasGeneratedTodos && !isGenerating) {
      console.log('Auto-generating TODOs for task:', taskId, taskTitle)
      handleGenerateTodos()
    }
  }, [taskId]) // taskIdが変わった時のみ実行

  // AIでTODOを自動生成
  const handleGenerateTodos = async () => {
    setIsGenerating(true)
    setHasGeneratedTodos(true) // 生成を試みたことを記録
    localStorage.setItem(`task-todos-generated-${taskId}`, 'true') // タスクごとに記録
    try {
      // AIによるタスク細分化
      const result = await window.electronAPI.geminiBreakdownTask({
        title: taskTitle,
        targetCount: 8 // 5-10個のTODOに分解
      })

      if (result.success && result.data) {
        console.log('Generated TODOs from AI:', result.data)
        const generatedTodos: Todo[] = result.data.todos.map((todo: any, index: number) => ({
          id: `${taskId}-todo-${Date.now()}-${index}`,
          taskId,
          title: todo.title,
          description: todo.description,
          completed: false,
          order: index,
          createdAt: new Date()
        }))

        console.log('Dispatching TODOs to store:', generatedTodos)
        dispatch(setTodosForTask({ taskId, todos: generatedTodos }))
        setIsExpanded(true) // 生成後に自動的に展開
      } else {
        console.error('Failed to generate TODOs:', result)
        // 失敗した場合はデフォルトのTODOを提案
        const defaultTodos: Todo[] = [
          { id: `${taskId}-todo-1`, taskId, title: `${taskTitle}に関する情報をWeb検索で収集`, description: 'Google、関連サイトで最新情報を調査', completed: false, order: 0, createdAt: new Date() },
          { id: `${taskId}-todo-2`, taskId, title: `類似事例や参考資料を調査`, description: '競合分析、ベストプラクティスの確認', completed: false, order: 1, createdAt: new Date() },
          { id: `${taskId}-todo-3`, taskId, title: `GensparkやChatGPTで初稿を生成`, description: 'AIツールを活用して基本構成を作成', completed: false, order: 2, createdAt: new Date() },
          { id: `${taskId}-todo-4`, taskId, title: `内容をブラッシュアップ・編集`, description: '生成された内容を精査し改善', completed: false, order: 3, createdAt: new Date() },
          { id: `${taskId}-todo-5`, taskId, title: `最終チェックと仕上げ`, description: '誤字脱字、内容の整合性を確認', completed: false, order: 4, createdAt: new Date() },
        ]
        dispatch(setTodosForTask({ taskId, todos: defaultTodos }))
      }
    } catch (error) {
      console.error('Failed to generate TODOs:', error)
      // エラー時もデフォルトのTODOを提案
      const defaultTodos: Todo[] = [
        { id: `${taskId}-todo-1`, taskId, title: `${taskTitle}に関する情報をWeb検索で収集`, description: 'Google、関連サイトで最新情報を調査', completed: false, order: 0, createdAt: new Date() },
        { id: `${taskId}-todo-2`, taskId, title: `類似事例や参考資料を調査`, description: '競合分析、ベストプラクティスの確認', completed: false, order: 1, createdAt: new Date() },
        { id: `${taskId}-todo-3`, taskId, title: `GensparkやChatGPTで初稿を生成`, description: 'AIツールを活用して基本構成を作成', completed: false, order: 2, createdAt: new Date() },
        { id: `${taskId}-todo-4`, taskId, title: `内容をブラッシュアップ・編集`, description: '生成された内容を精査し改善', completed: false, order: 3, createdAt: new Date() },
        { id: `${taskId}-todo-5`, taskId, title: `最終チェックと仕上げ`, description: '誤字脱字、内容の整合性を確認', completed: false, order: 4, createdAt: new Date() },
      ]
      dispatch(setTodosForTask({ taskId, todos: defaultTodos }))
    } finally {
      setIsGenerating(false)
    }
  }

  // 手動でTODO追加
  const handleAddTodo = () => {
    if (!newTodoTitle.trim()) return

    const newTodo: Todo = {
      id: `${taskId}-todo-${Date.now()}`,
      taskId,
      title: newTodoTitle,
      completed: false,
      order: todos.length,
      createdAt: new Date()
    }

    dispatch(addTodo(newTodo))
    setNewTodoTitle('')
  }

  // TODO編集
  const handleEditTodo = (todoId: string) => {
    const todo = todos.find(t => t.id === todoId)
    if (todo) {
      setEditingTodoId(todoId)
      setEditingTitle(todo.title)
    }
  }

  const handleSaveEdit = () => {
    if (editingTodoId && editingTitle.trim()) {
      dispatch(updateTodo({
        id: editingTodoId,
        updates: { title: editingTitle }
      }))
    }
    setEditingTodoId(null)
    setEditingTitle('')
  }

  const handleCancelEdit = () => {
    setEditingTodoId(null)
    setEditingTitle('')
  }

  // TODO削除
  const handleDeleteTodo = (todoId: string) => {
    const todo = todos.find(t => t.id === todoId)
    if (todo && confirm(`「${todo.title}」を削除してもよろしいですか？`)) {
      dispatch(deleteTodo(todoId))
    }
  }

  // TODO完了状態切り替え
  const handleToggleTodo = (todoId: string) => {
    dispatch(toggleTodoComplete(todoId))
  }

  // ドラッグ&ドロップ
  const handleDragStart = (index: number) => {
    setDraggingIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    if (draggingIndex !== null && dragOverIndex !== null && draggingIndex !== dragOverIndex) {
      dispatch(reorderTodos({ taskId, fromIndex: draggingIndex, toIndex: dragOverIndex }))
    }
    setDraggingIndex(null)
    setDragOverIndex(null)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
      {/* ヘッダー */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-left flex-1 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 p-2 -m-2 rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            <ListTodo className="w-5 h-5 text-primary-600" />
            <div className="flex-1">
              <h3 className="font-medium">TODOリスト</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {completedCount}/{totalCount} 完了
              </p>
            </div>
          </button>

          {/* 進捗バー */}
          <div className="flex items-center gap-3">
            <div className="w-32">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-600 dark:text-neutral-400">進捗</span>
                <span className="text-xs font-medium">{completionRate}%</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {/* AI生成/再生成ボタン */}
            <button
              onClick={() => {
                // 既存のTODOをクリアしてから再生成
                if (totalCount > 0) {
                  dispatch(clearTodosForTask(taskId))
                }
                localStorage.removeItem(`task-todos-generated-${taskId}`)
                setHasGeneratedTodos(false)
                handleGenerateTodos()
              }}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1"
            >
              {isGenerating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles size={16} />
                  </motion.div>
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  {totalCount > 0 ? 'AI再生成' : 'AI生成'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TODOリスト */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 overflow-y-auto max-h-[600px]">
              {/* 生成中の表示 */}
              {isGenerating && todos.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="mr-3"
                  >
                    <Sparkles className="w-6 h-6 text-primary-600" />
                  </motion.div>
                  <span className="text-neutral-600 dark:text-neutral-400">
                    AIがタスクを分析してTODOを生成中...
                  </span>
                </div>
              )}
              
              {/* TODO項目 */}
              {todos.map((todo, index) => (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all group ${
                    draggingIndex === index 
                      ? 'opacity-50 border-primary-500 shadow-lg' 
                      : dragOverIndex === index 
                        ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm'
                  } ${
                    todo.completed ? 'opacity-60 bg-neutral-50 dark:bg-neutral-800/50' : 'bg-white dark:bg-neutral-800'
                  }`}
                >
                  <div 
                    className="flex-shrink-0"
                    draggable={editingTodoId !== todo.id}
                    onDragStart={(e) => {
                      if (editingTodoId === todo.id) {
                        e.preventDefault()
                        return
                      }
                      e.stopPropagation()
                      handleDragStart(index)
                    }}
                    onDragEnd={handleDragEnd}
                    style={{ cursor: editingTodoId === todo.id ? 'default' : 'move' }}
                  >
                    <GripVertical className={`w-4 h-4 text-neutral-400 ${editingTodoId === todo.id ? 'opacity-30' : 'hover:text-neutral-600'}`} />
                  </div>
                  
                  <button
                    onClick={() => handleToggleTodo(todo.id)}
                    className="flex-shrink-0"
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-success-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-neutral-400 hover:text-primary-600" />
                    )}
                  </button>

                  {editingTodoId === todo.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleSaveEdit()
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            handleCancelEdit()
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-900 border-2 border-primary-500 rounded-lg focus:outline-none focus:border-primary-600 text-sm"
                        autoFocus
                        placeholder="TODOのタイトルを入力..."
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSaveEdit()
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 bg-success-600 text-white hover:bg-success-700 rounded-lg transition-colors text-sm font-medium"
                        title="保存 (Enter)"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCancelEdit()
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 bg-neutral-500 text-white hover:bg-neutral-600 rounded-lg transition-colors text-sm font-medium"
                        title="キャンセル (Escape)"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className={`flex-1 text-sm cursor-pointer hover:text-primary-600 ${
                          todo.completed ? 'line-through text-neutral-500' : ''
                        }`}
                        onClick={() => !todo.completed && handleEditTodo(todo.id)}
                        title={todo.completed ? '' : 'クリックして編集'}
                      >
                        {todo.title}
                        {todo.description && (
                          <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            {todo.description}
                          </span>
                        )}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditTodo(todo.id)}
                          className="p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                          title="編集"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="p-1.5 text-neutral-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded transition-colors"
                          title="削除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}

              {/* 新規TODO追加 */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                <Plus className="w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
                  placeholder="新しいTODOを追加..."
                  className="flex-1 px-3 py-2 bg-transparent border-none focus:outline-none placeholder-neutral-400"
                />
                {newTodoTitle && (
                  <button
                    onClick={handleAddTodo}
                    className="px-3 py-1 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                  >
                    追加
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TaskBreakdown