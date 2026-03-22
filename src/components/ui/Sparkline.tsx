
interface SparklineProps {
    data: number[]
    width?: number
    height?: number
    color?: string
    strokeWidth?: number
}

export function Sparkline({
    data,
    width = 60,
    height = 20,
    color = '#3b82f6',
    strokeWidth = 2
}: SparklineProps) {
    if (!data || data.length < 2) return null

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((val - min) / range) * height
        return `${x},${y}`
    }).join(' ')

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    )
}
