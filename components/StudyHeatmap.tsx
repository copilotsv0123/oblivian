'use client'

import { useState, useEffect } from 'react'

interface HeatmapData {
  [date: string]: {
    count: number
    totalCards: number
  }
}

export default function StudyHeatmap() {
  const [data, setData] = useState<HeatmapData>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/study/heatmap')
        if (res.ok) {
          const result = await res.json()
          setData(result.heatmapData)
        }
      } catch (error) {
        console.error('Error fetching heatmap data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-100'
    if (count === 1) return 'bg-green-200'
    if (count === 2) return 'bg-green-300'
    if (count === 3) return 'bg-green-400'
    if (count >= 4) return 'bg-green-500'
    return 'bg-gray-100'
  }

  // Generate grid for the last 52 weeks
  const generateGrid = () => {
    const grid = []
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 364) // Go back 52 weeks

    // Adjust to start on Sunday
    const dayOfWeek = startDate.getDay()
    if (dayOfWeek !== 0) {
      startDate.setDate(startDate.getDate() - dayOfWeek)
    }

    const weeks = []
    const currentDate = new Date(startDate)

    for (let week = 0; week < 53; week++) {
      const days = []
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const dayData = data[dateStr] || { count: 0, totalCards: 0 }
        const isToday = currentDate.toDateString() === today.toDateString()
        const isFuture = currentDate > today

        days.push({
          date: new Date(currentDate),
          dateStr,
          count: dayData.count,
          totalCards: dayData.totalCards,
          isToday,
          isFuture,
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }
      weeks.push(days)
    }

    return weeks
  }

  const monthLabels = () => {
    const labels: { month: string; weekIndex: number }[] = []
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 364)

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    let lastMonth = -1

    const weeks = generateGrid()
    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0].date
      const month = firstDayOfWeek.getMonth()
      if (month !== lastMonth && weekIndex > 0) {
        labels.push({
          month: months[month],
          weekIndex,
        })
        lastMonth = month
      }
    })

    return labels
  }

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-primary mb-4">Study Activity</h2>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const weeks = generateGrid()
  const months = monthLabels()
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-primary mb-4">Study Activity</h2>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex mb-2" style={{ paddingLeft: '30px' }}>
            {months.map((label, i) => (
              <div
                key={i}
                className="text-xs text-gray-500"
                style={{
                  position: 'absolute',
                  left: `${30 + label.weekIndex * 13}px`,
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          <div className="flex gap-1" style={{ marginTop: '20px' }}>
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-2">
              {dayLabels.map((day, i) => (
                <div
                  key={i}
                  className="text-xs text-gray-500 h-3 flex items-center justify-end"
                  style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}
                >
                  {day[0]}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`w-3 h-3 rounded-sm ${
                      day.isFuture
                        ? 'bg-transparent'
                        : day.isToday
                        ? `${getIntensity(day.count)} ring-1 ring-primary`
                        : getIntensity(day.count)
                    } ${!day.isFuture ? 'hover:ring-1 hover:ring-gray-400 cursor-pointer' : ''}`}
                    title={
                      !day.isFuture
                        ? `${day.date.toLocaleDateString()}: ${day.count} session${
                            day.count !== 1 ? 's' : ''
                          }, ${day.totalCards} cards`
                        : ''
                    }
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
            <span>Less</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(level => (
                <div
                  key={level}
                  className={`w-3 h-3 rounded-sm ${getIntensity(level)}`}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}