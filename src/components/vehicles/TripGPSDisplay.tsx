import { ExternalLink, MapPin } from 'lucide-react'

type TripGPSLocation = {
    type: 'start' | 'end' | 'waypoint'
    label: string
    lat: number
    lng: number
    url: string
}

type TripGPSDisplayProps = {
    notes: string
}

/**
 * Parse GPS coordinates for trips (start and end locations)
 * Expected format:
 * 📍 Điểm đi: 10.123456, 105.123456
 * 🔗 https://www.google.com/maps?q=10.123456,105.123456
 * 📍 Điểm đến: 10.654321, 105.654321
 * 🔗 https://www.google.com/maps?q=10.654321,105.654321
 */
function parseTripGPSFromNotes(notes: string): TripGPSLocation[] {
    if (!notes) return []

    const lines = notes.split('\n')
    const locations: TripGPSLocation[] = []
    let currentLocation: Partial<TripGPSLocation> | null = null

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Match start location: [Start] 10.123456, 105.123456
        const startMatch = line.match(/\[Start\]\s*([-\d.]+),\s*([-\d.]+)/)
        if (startMatch) {
            currentLocation = {
                type: 'start',
                label: 'Điểm khởi hành',
                lat: parseFloat(startMatch[1]),
                lng: parseFloat(startMatch[2]),
            }
        }

        // Match end location: [End] 10.123456, 105.123456
        const endMatch = line.match(/\[End\]\s*([-\d.]+),\s*([-\d.]+)/)
        if (endMatch) {
            currentLocation = {
                type: 'end',
                label: 'Điểm kết thúc',
                lat: parseFloat(endMatch[1]),
                lng: parseFloat(endMatch[2]),
            }
        }

        // Match waypoint: [Waypoint] 10.123456, 105.123456
        const wpMatch = line.match(/\[Waypoint\]\s*([-\d.]+),\s*([-\d.]+)/)
        if (wpMatch) {
            currentLocation = {
                type: 'waypoint',
                label: 'Điểm ghé',
                lat: parseFloat(wpMatch[1]),
                lng: parseFloat(wpMatch[2]),
            }
        }

        // Match URL line: 🔗 https://www.google.com/maps?q=...
        const urlMatch = line.match(/🔗\s*(https:\/\/www\.google\.com\/maps\?q=[-\d.,]+)/)
        if (urlMatch && currentLocation) {
            currentLocation.url = urlMatch[1]
            if (currentLocation.type && currentLocation.lat && currentLocation.lng && currentLocation.url) {
                locations.push(currentLocation as TripGPSLocation)
                currentLocation = null
            }
        }
    }

    return locations
}

/**
 * Display GPS information for trips with clickable Google Maps links
 */
export function TripGPSDisplay({ notes }: TripGPSDisplayProps) {
    const locations = parseTripGPSFromNotes(notes)

    if (locations.length === 0) return null

    return (
        <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-slate-700">Tọa độ GPS:</p>
            {locations.map((location, index) => (
                <div
                    key={index}
                    className={`rounded-lg border p-3 space-y-2 ${location.type === 'start' ? 'bg-green-50 border-green-200' :
                        location.type === 'end' ? 'bg-red-50 border-red-200' :
                            'bg-cyan-50 border-cyan-200'
                        }`}
                >
                    <div className="flex items-start gap-2">
                        <MapPin
                            className={`h-4 w-4 mt-0.5 flex-shrink-0 ${location.type === 'start' ? 'text-green-600' :
                                location.type === 'end' ? 'text-red-600' :
                                    'text-cyan-600'
                                }`}
                        />
                        <div className="flex-1 min-w-0">
                            <p
                                className={`text-xs font-medium ${location.type === 'start' ? 'text-green-800' :
                                    location.type === 'end' ? 'text-red-800' :
                                        'text-cyan-800'
                                    }`}
                            >
                                {location.label}
                            </p>
                            <p
                                className={`text-xs font-mono ${location.type === 'start' ? 'text-green-700' :
                                    location.type === 'end' ? 'text-red-700' :
                                        'text-cyan-700'
                                    }`}
                            >
                                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                            </p>
                        </div>
                    </div>

                    <a
                        href={location.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        <ExternalLink className="h-3 w-3" />
                        Mở trong Google Maps
                    </a>
                </div>
            ))}
        </div>
    )
}

/**
 * Get clean notes without GPS data for trips
 */
export function getTripCleanNotes(notes: string): string {
    if (!notes) return ''

    const lines = notes.split('\n')
    const cleanLines = lines.filter(line => {
        if (line.match(/\[(Start|End|Waypoint)\]/)) return false
        if (line.match(/https:\/\/www\.google\.com\/maps/)) return false
        return true
    })

    return cleanLines.join('\n').trim()
}
