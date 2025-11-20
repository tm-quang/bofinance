import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaCopy, FaExternalLinkAlt, FaQrcode, FaCheck } from 'react-icons/fa'
import HeaderBar from '../components/layout/HeaderBar'
import { useNotification } from '../contexts/notificationContext.helpers'

const QRResultPage = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { success, error: showError } = useNotification()
    const [scanResult] = useState<string>(() => {
        const stateResult = location.state?.scanResult
        const queryResult = new URLSearchParams(location.search).get('result')
        return stateResult || (queryResult ? decodeURIComponent(queryResult) : '')
    })
    const [isCopied, setIsCopied] = useState(false)

    useEffect(() => {
        if (!scanResult) {
            navigate('/settings')
        }
    }, [scanResult, navigate])

    const isValidUrl = (string: string) => {
        try {
            new URL(string)
            return true
        } catch {
            return false
        }
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(scanResult)
            setIsCopied(true)
            success('Đã sao chép vào clipboard')
            setTimeout(() => setIsCopied(false), 2000)
        } catch (_err) {
            console.error('Failed to copy:', _err)
            showError('Không thể sao chép')
        }
    }

    const handleOpenLink = () => {
        if (isValidUrl(scanResult)) {
            window.open(scanResult, '_blank', 'noopener,noreferrer')
        }
    }

    return (
        <div className="flex h-full flex-col bg-[#F7F9FC]">
            <HeaderBar
                variant="page"
                title="Kết quả quét QR"
                onBack={() => navigate('/settings')}
            />

            <main className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto max-w-md space-y-6">

                    {/* Result Card */}
                    <div className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-lg border border-slate-100 text-center">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 opacity-50 blur-2xl" />

                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm ring-4 ring-emerald-50">
                                <FaQrcode className="h-10 w-10" />
                            </div>

                            <h2 className="text-xl font-bold text-slate-800">Nội dung mã QR</h2>

                            <div className="w-full rounded-2xl bg-slate-50 p-4 border border-slate-200">
                                <p className="break-all font-mono text-slate-600 text-lg">
                                    {scanResult}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid gap-3">
                        {isValidUrl(scanResult) && (
                            <button
                                onClick={handleOpenLink}
                                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 p-4 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95"
                            >
                                <FaExternalLinkAlt />
                                Truy cập liên kết
                            </button>
                        )}

                        <button
                            onClick={handleCopy}
                            className={`flex w-full items-center justify-center gap-3 rounded-2xl p-4 font-bold transition-all active:scale-95 border ${isCopied
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            {isCopied ? <FaCheck /> : <FaCopy />}
                            {isCopied ? 'Đã sao chép' : 'Sao chép nội dung'}
                        </button>

                        <button
                            onClick={() => navigate('/settings', { state: { openScanner: true } })}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-100 p-4 font-bold text-slate-600 transition-all hover:bg-slate-200 active:scale-95"
                        >
                            <FaQrcode />
                            Quét mã khác
                        </button>
                    </div>

                </div>
            </main>
        </div>
    )
}

export default QRResultPage
