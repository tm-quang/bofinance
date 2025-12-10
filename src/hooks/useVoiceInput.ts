import { useState, useEffect, useCallback } from 'react'
import { speechRecognitionManager } from '../lib/speechRecognition/SpeechRecognitionManager'

export interface VoiceInputField {
  id: string
  onResult: (transcript: string) => void
}

export interface UseVoiceInputOptions {
  fields: VoiceInputField[]
  onError?: (error: string) => void
  language?: string
}

export interface VoiceInputControls {
  isListening: (fieldId: string) => boolean
  startListening: (fieldId: string) => void
  stopListening: () => void
  reset: () => void
  isSupported: boolean
}

/**
 * Custom hook để quản lý nhận diện giọng nói cho nhiều input fields
 * 
 * @param options - Cấu hình cho voice input
 * @returns Controls để quản lý voice recognition
 * 
 * @example
 * ```tsx
 * const voiceInput = useVoiceInput({
 *   fields: [
 *     {
 *       id: 'title',
 *       onResult: (text) => setTitle(text)
 *     },
 *     {
 *       id: 'description',
 *       onResult: (text) => setDescription(text)
 *     }
 *   ],
 *   onError: (error) => showError(error)
 * })
 * 
 * // Sử dụng
 * <button onClick={() => voiceInput.startListening('title')}>
 *   {voiceInput.isListening('title') ? 'Đang nghe...' : 'Bắt đầu'}
 * </button>
 * ```
 */
export const useVoiceInput = (options: UseVoiceInputOptions): VoiceInputControls => {
  const { fields, onError, language = 'vi-VN' } = options

  // Track listening state cho từng field
  const [listeningStates, setListeningStates] = useState<Record<string, boolean>>({})
  
  // Check browser support
  const isSupported = speechRecognitionManager.isSupported()

  // Reset tất cả states
  const reset = useCallback(() => {
    speechRecognitionManager.stop()
    setListeningStates({})
  }, [])

    // Dừng tất cả recognition đang chạy (trừ field được chỉ định)
  const stopAllExcept = useCallback((exceptFieldId?: string) => {
    Object.keys(listeningStates).forEach((fieldId) => {
      if (fieldId !== exceptFieldId && listeningStates[fieldId]) {
        speechRecognitionManager.stop()
        setListeningStates((prev) => ({ ...prev, [fieldId]: false }))
      }
    })
  }, [listeningStates])

  // Bắt đầu nhận diện cho một field cụ thể
  const startListening = useCallback((fieldId: string) => {
    if (!isSupported) {
      const errorMsg = 'Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng sử dụng Chrome, Edge hoặc Safari.'
      onError?.(errorMsg)
      return
    }

    // Tìm field config
    const field = fields.find((f) => f.id === fieldId)
    if (!field) {
      console.warn(`Voice input field "${fieldId}" not found`)
      return
    }

    // Dừng tất cả recognition khác
    stopAllExcept(fieldId)

    // Bắt đầu recognition cho field này
    setListeningStates((prev) => ({ ...prev, [fieldId]: true }))

    speechRecognitionManager.start({
      language,
      continuous: false,
      interimResults: false,
      onResult: (transcript: string, isFinal: boolean) => {
        if (isFinal) {
          field.onResult(transcript.trim())
          setListeningStates((prev) => ({ ...prev, [fieldId]: false }))
        }
      },
      onError: (error) => {
        onError?.(error.message)
        setListeningStates((prev) => ({ ...prev, [fieldId]: false }))
      },
      onEnd: () => {
        setListeningStates((prev) => ({ ...prev, [fieldId]: false }))
      },
    }).catch((error) => {
      onError?.(error instanceof Error ? error.message : 'Lỗi khởi động nhận diện giọng nói')
      setListeningStates((prev) => ({ ...prev, [fieldId]: false }))
    })
  }, [fields, isSupported, language, onError, stopAllExcept])

  // Dừng recognition cho tất cả fields
  const stopListening = useCallback(() => {
    speechRecognitionManager.stop()
    setListeningStates({})
  }, [])

  // Kiểm tra xem một field có đang lắng nghe không
  const isListening = useCallback((fieldId: string): boolean => {
    return listeningStates[fieldId] === true
  }, [listeningStates])

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      speechRecognitionManager.stop()
    }
  }, [])

  return {
    isListening,
    startListening,
    stopListening,
    reset,
    isSupported,
  }
}

