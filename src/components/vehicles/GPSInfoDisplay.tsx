import { ExternalLink, MapPin } from 'lucide-react'

type GPSLocation = {
    label: string
    lat: number
    lng: number
    url: string
}

type GPSInfoDisplayProps = {
    notes: string
}

/**
 * Parse GPS coordinates from notes
 * Expected format:
 * 📍 Vị trí: 10.123456, 105.123456
 * 🔗 https://www.google.com/maps?q=10.123456,105.123456
 */
function parseGPSFromNotes(notes: string): GPSLocation | null {
    if (!notes) return null

    const lines = notes.split('\n')
    let lat: number | null = null
    let lng: number | null = null
    let url: string | null = null

    for (const line of lines) {
        // Match coordinates line: 📍 Vị trí: 10.123456, 105.123456
        const coordMatch = line.match(/📍\s*(?:Vị trí|Điểm đi|Điểm đến):\s*([-\d.]+),\s*([-\d.]+)/)
        if (coordMatch) {
            lat = parseFloat(coordMatch[1])
            lng = parseFloat(coordMatch[2])
        }

        // Match URL line: 🔗 https://www.google.com/maps?q=...
        const urlMatch = line.match(/🔗\s*(https:\/\/www\.google\.com\/maps\?q=[-\d.,]+)/)
        if (urlMatch) {
            url = urlMatch[1]
        }
    }

    if (lat !== null && lng !== null && url) {
        return {
            label: 'Vị trí',
            lat,
            lng,
            url,
        }
    }

    return null
}

/**
 * Display GPS information with clickable Google Maps link
 */
export function GPSInfoDisplay({ notes }: GPSInfoDisplayProps) {
    const gpsInfo = parseGPSFromNotes(notes)

    if (!gpsInfo) return null

    return (
        <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
            <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-green-800">Tọa độ GPS:</p>
                    <p className="text-xs text-green-700 font-mono">
                        {gpsInfo.lat.toFixed(6)}, {gpsInfo.lng.toFixed(6)}
                    </p>
                </div>
            </div>

            <a
                href={gpsInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
                <ExternalLink className="h-3 w-3" />
                Mở trong Google Maps
            </a>
        </div>
    )
}

/**
 * Get clean notes without GPS data
 */
export function getCleanNotes(notes: string): string {
    if (!notes) return ''

    const lines = notes.split('\n')
    const cleanLines = lines.filter(line => {
        // Remove GPS coordinate lines
        if (line.match(/📍\s*(?:Vị trí|Điểm đi|Điểm đến):/)) return false
        // Remove Google Maps URL lines
        if (line.match(/🔗\s*https:\/\/www\.google\.com\/maps/)) return false
        return true
    })

    return cleanLines.join('\n').trim()
}
