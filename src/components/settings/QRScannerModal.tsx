import { useEffect, useRef, useState, useCallback } from 'react'
import { MultiFormatReader, DecodeHintType, BarcodeFormat, HTMLCanvasElementLuminanceSource, BinaryBitmap, HybridBinarizer } from '@zxing/library'
import { FaTimes } from 'react-icons/fa'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { isAndroidApp, startNativeScan, setupNativeScanCallback, cleanupNativeScanCallback } from '../../utils/androidBridge'

interface QRScannerModalProps {
    isOpen: boolean
    onClose: () => void
    onScanSuccess?: (decodedText: string) => void
}

export const QRScannerModal = ({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const readerRef = useRef<MultiFormatReader | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const [scanResult, setScanResult] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const { success, error: showError } = useNotification()
    const scanningIntervalRef = useRef<number | null>(null)

    // Helper to check if string is URL
    const isValidUrl = (string: string) => {
        try {
            new URL(string)
            return true
        } catch (_) {
            return false
        }
    }

    // Memoize callbacks to prevent unnecessary re-renders
    const handleScanSuccess = useCallback((decodedText: string) => {
        setScanResult(decodedText)
        setIsScanning(false)
        success('Đã quét mã thành công!')
        if (onScanSuccess) {
            onScanSuccess(decodedText)
        }
        // Stop scanning upon success
        stopScanning()
    }, [onScanSuccess, success])

    // Function to find the best camera (back camera with highest resolution)
    const findBestCamera = async (): Promise<string | null> => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const videoDevices = devices.filter(device => device.kind === 'videoinput')

            if (videoDevices.length === 0) {
                return null
            }

            // Prefer back camera (environment facing)
            const backCameras = videoDevices.filter(device => {
                const label = device.label.toLowerCase()
                return label.includes('back') || label.includes('rear') || label.includes('environment')
            })

            // If we have back cameras, prefer the one with highest resolution
            // Otherwise, use any camera
            const preferredDevices = backCameras.length > 0 ? backCameras : videoDevices

            // Return the first preferred device ID (or null if none)
            return preferredDevices[0]?.deviceId || null
        } catch (error) {
            console.error('Error enumerating devices:', error)
            return null
        }
    }

    // Function to get camera constraints with best quality
    const getBestCameraConstraints = (deviceId: string | null): MediaStreamConstraints => {
        return {
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                facingMode: deviceId ? undefined : 'environment', // Fallback to environment if no deviceId
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                // Prefer higher frame rate for better scanning
                frameRate: { ideal: 30, min: 15 }
            }
        }
    }

    // Function to stop scanning and cleanup
    const stopScanning = useCallback(() => {
        if (scanningIntervalRef.current) {
            cancelAnimationFrame(scanningIntervalRef.current)
            scanningIntervalRef.current = null
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null
        }

        if (readerRef.current) {
            readerRef.current.reset()
        }

        cleanupNativeScanCallback()
        setIsScanning(false)
    }, [])

    // Start scanning
    const startScanning = useCallback(async () => {
        if (scanResult || isScanning) return

        // Handle Native Android App Scanning
        if (isAndroidApp()) {
            setIsScanning(true)
            setupNativeScanCallback((text) => {
                handleScanSuccess(text)
            })
            startNativeScan()
            return
        }

        if (!videoRef.current) return

        try {
            setIsScanning(true)

            // Find best camera
            const deviceId = await findBestCamera()

            // Get camera stream with best quality
            const constraints = getBestCameraConstraints(deviceId)
            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            streamRef.current = stream

            // Set video source
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }

            // Initialize ZXing reader with optimized hints for QR code
            const hints = new Map()
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])
            hints.set(DecodeHintType.TRY_HARDER, true)
            const reader = new MultiFormatReader()
            reader.setHints(hints)
            readerRef.current = reader

            // Wait for video to be ready
            await new Promise((resolve) => {
                if (videoRef.current) {
                    if (videoRef.current.readyState >= 2) {
                        // Video is already loaded
                        resolve(undefined)
                    } else {
                        videoRef.current.onloadedmetadata = () => resolve(undefined)
                        // Timeout fallback
                        setTimeout(() => resolve(undefined), 1000)
                    }
                } else {
                    resolve(undefined)
                }
            })

            // Create canvas for capturing frames
            if (!canvasRef.current) {
                const canvas = document.createElement('canvas')
                canvasRef.current = canvas
            }

            // Start scanning loop using canvas to capture frames
            const scanFrame = async () => {
                if (!videoRef.current || !readerRef.current || !canvasRef.current || scanResult || !isScanning) {
                    return
                }

                try {
                    const video = videoRef.current
                    const canvas = canvasRef.current
                    const ctx = canvas.getContext('2d', { willReadFrequently: true })

                    if (!ctx || video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
                        // Video not ready, continue scanning
                        if (!scanResult && isScanning) {
                            scanningIntervalRef.current = requestAnimationFrame(scanFrame)
                        }
                        return
                    }

                    // Set canvas size to match video
                    canvas.width = video.videoWidth
                    canvas.height = video.videoHeight

                    // Draw video frame to canvas
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

                    // Decode QR code from canvas using ZXing
                    const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas)
                    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource))
                    const result = readerRef.current.decode(binaryBitmap)

                    if (result) {
                        const text = result.getText()
                        if (text && !scanResult) {
                            handleScanSuccess(text)
                            return
                        }
                    }
                } catch (err) {
                    // Ignore scanning errors (normal during scanning - no QR code found)
                }

                // Continue scanning
                if (!scanResult && isScanning) {
                    scanningIntervalRef.current = requestAnimationFrame(scanFrame)
                }
            }

            // Start scanning loop
            scanningIntervalRef.current = requestAnimationFrame(scanFrame)
        } catch (_err) {
            console.error('Error starting camera:', _err)
            setIsScanning(false)
            showError('Không thể khởi động camera. Vui lòng kiểm tra quyền truy cập camera.')
        }
    }, [scanResult, isScanning, handleScanSuccess, showError])

    // Reset scan result when modal opens
    useEffect(() => {
        if (isOpen) {
            setScanResult(null)
            setIsScanning(false)
        } else {
            stopScanning()
        }
    }, [isOpen, stopScanning])

    // Start scanning when modal opens and video is ready
    useEffect(() => {
        const readyToStart = isOpen && !scanResult && !isScanning
        const canStart = isAndroidApp() || videoRef.current

        if (readyToStart && canStart) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                startScanning()
            }, 100)

            return () => {
                clearTimeout(timer)
            }
        }
    }, [isOpen, scanResult, isScanning, startScanning])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopScanning()
        }
    }, [stopScanning])

    const handleClose = () => {
        stopScanning()
        onClose()
    }

    const handleRescan = () => {
        stopScanning()
        setScanResult(null)
        setIsScanning(false)
        // Restart scanning after a brief delay
        setTimeout(() => {
            startScanning()
        }, 100)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
                    <h3 className="text-lg font-bold text-slate-800">Quét mã QR</h3>
                    <button
                        onClick={handleClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <FaTimes className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {scanResult ? (
                        <div className="text-center space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h4 className="text-lg font-semibold text-slate-800">Kết quả quét</h4>
                            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 break-all text-slate-600 font-mono text-sm max-h-40 overflow-y-auto">
                                {scanResult}
                            </div>
                            <div className="flex flex-col gap-3 pt-2">
                                {isValidUrl(scanResult) && (
                                    <a
                                        href={scanResult}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                                    >
                                        <span>Mở liên kết</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleRescan}
                                        className="flex-1 rounded-xl bg-slate-100 py-3 font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                                    >
                                        Quét lại
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (scanResult) {
                                                try {
                                                    await navigator.clipboard.writeText(scanResult)
                                                    success('Đã sao chép vào clipboard')
                                                } catch (err) {
                                                    console.error('Failed to copy to clipboard:', err)
                                                    showError('Không thể sao chép vào clipboard')
                                                }
                                            }
                                        }}
                                        className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                                    >
                                        Sao chép
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-900 min-h-[300px] flex items-center justify-center">
                                {isAndroidApp() ? (
                                    <div className="text-center text-white p-6">
                                        <div className="mb-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                            </svg>
                                        </div>
                                        <p className="text-lg font-medium mb-2">Sử dụng Camera thiết bị</p>
                                        <p className="text-sm text-slate-400 mb-6">Sử dụng camera gốc của điện thoại để quét nhanh hơn</p>
                                        <button
                                            onClick={startNativeScan}
                                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium transition-colors"
                                        >
                                            Mở Camera
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <video
                                            ref={videoRef}
                                            className="w-full h-full object-cover"
                                            playsInline
                                            muted
                                            autoPlay
                                        />
                                        {!isScanning && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                                                <div className="text-center text-white">
                                                    <div className="mb-2">
                                                        <svg className="animate-spin h-8 w-8 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    </div>
                                                    <p className="text-sm">Đang khởi động camera...</p>
                                                </div>
                                            </div>
                                        )}
                                        {/* Scanning overlay with frame */}
                                        {isScanning && (
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="absolute inset-0 bg-black/20"></div>
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-sky-400 rounded-lg shadow-lg">
                                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-400"></div>
                                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-400"></div>
                                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-400"></div>
                                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-400"></div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <p className="text-center text-sm text-slate-500">
                                {isAndroidApp()
                                    ? 'Nhấn nút bên trên nếu camera không tự động mở'
                                    : (isScanning ? 'Di chuyển camera đến mã QR để quét' : 'Đang khởi động camera...')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
