import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { FaTimes } from 'react-icons/fa'
import { useNotification } from '../../contexts/notificationContext.helpers'

interface QRScannerModalProps {
    isOpen: boolean
    onClose: () => void
    onScanSuccess?: (decodedText: string) => void
}

export const QRScannerModal = ({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null)
    const [scanResult, setScanResult] = useState<string | null>(null)
    const { success, error: showError } = useNotification()

    // Reset scan result when modal opens
    useEffect(() => {
        if (isOpen) {
            setScanResult(null)
        }
    }, [isOpen])

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>

        if (isOpen && !scanResult) {
            // Initialize scanner when modal opens and no result yet
            // Use a timeout to ensure the DOM element is ready
            timer = setTimeout(() => {
                try {
                    // Check if element exists before initializing
                    if (!document.getElementById('reader')) return

                    // Clear any existing scanner instance
                    if (scannerRef.current) {
                        scannerRef.current.clear().catch(console.error)
                    }

                    const scanner = new Html5QrcodeScanner(
                        "reader",
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1.0
                        },
                        /* verbose= */ false
                    )

                    scannerRef.current = scanner

                    scanner.render(
                        (decodedText: string) => {
                            // Success callback
                            setScanResult(decodedText)
                            success('Đã quét mã thành công!')
                            if (onScanSuccess) {
                                onScanSuccess(decodedText)
                            }
                            // Stop scanning upon success
                            scanner.clear().catch(console.error)
                        },
                        (_errorMessage: string) => {
                            // parse error, ignore to avoid console spam
                        }
                    )
                } catch (err) {
                    console.error("Scanner initialization error:", err)
                    // Only show error if it's not a cleanup error
                    if (isOpen) {
                        showError('Không thể khởi động camera')
                    }
                }
            }, 100)
        }

        // Cleanup function
        return () => {
            if (timer) clearTimeout(timer)

            if (scannerRef.current) {
                scannerRef.current.clear().catch((err) => {
                    // Ignore errors during cleanup (e.g. if scanning hasn't started)
                    console.log("Scanner cleanup:", err)
                })
                scannerRef.current = null
            }
        }
    }, [isOpen, scanResult, onScanSuccess, success, showError])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
                    <h3 className="text-lg font-bold text-slate-800">Quét mã QR</h3>
                    <button
                        onClick={onClose}
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
                            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 break-all text-slate-600 font-mono text-sm">
                                {scanResult}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setScanResult(null)
                                        // The useEffect will re-initialize the scanner because scanResult becomes null
                                    }}
                                    className="flex-1 rounded-xl bg-slate-100 py-3 font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                                >
                                    Quét lại
                                </button>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(scanResult)
                                        success('Đã sao chép vào clipboard')
                                    }}
                                    className="flex-1 rounded-xl bg-sky-500 py-3 font-semibold text-white hover:bg-sky-600 transition-colors shadow-lg shadow-sky-200"
                                >
                                    Sao chép
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div id="reader" className="overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 min-h-[250px]"></div>
                            <p className="text-center text-sm text-slate-500">
                                Di chuyển camera đến mã QR để quét
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
