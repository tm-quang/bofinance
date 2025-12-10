/**
 * Web Speech API Provider
 * Sử dụng browser native Web Speech API (free, không cần API key)
 */

import type { ISpeechProvider, SpeechRecognitionOptions } from './ISpeechProvider'

export class WebSpeechProvider implements ISpeechProvider {
  private recognition: any = null
  private isListeningState: boolean = false
  private isSupportedState: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      this.isSupportedState = !!SpeechRecognition

      if (this.isSupportedState) {
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = false
        this.recognition.interimResults = false
        this.recognition.lang = 'vi-VN'
      }
    }
  }

  isSupported(): boolean {
    return this.isSupportedState
  }

  async start(options: SpeechRecognitionOptions): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web Speech API không được hỗ trợ trong trình duyệt này')
    }

    if (this.isListeningState) {
      this.stop()
    }

    this.recognition.lang = options.language || 'vi-VN'
    this.recognition.continuous = options.continuous || false
    this.recognition.interimResults = options.interimResults || false

    this.recognition.onstart = () => {
      this.isListeningState = true
      options.onStart?.()
    }

    this.recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      if (interimTranscript && options.onResult) {
        options.onResult(interimTranscript.trim(), false)
      }

      if (finalTranscript && options.onResult) {
        options.onResult(finalTranscript.trim(), true)
      }
    }

    this.recognition.onerror = (event: any) => {
      this.isListeningState = false
      let errorMessage = 'Lỗi nhận diện giọng nói'
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Không phát hiện giọng nói. Vui lòng thử lại.'
          break
        case 'audio-capture':
          errorMessage = 'Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.'
          break
        case 'not-allowed':
          errorMessage = 'Quyền truy cập microphone bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.'
          break
        case 'network':
          errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối.'
          break
        default:
          errorMessage = `Lỗi: ${event.error}`
      }

      options.onError?.(new Error(errorMessage))
    }

    this.recognition.onend = () => {
      this.isListeningState = false
      options.onEnd?.()
    }

    try {
      this.recognition.start()
    } catch (error) {
      throw new Error('Không thể bắt đầu nhận diện giọng nói. Vui lòng thử lại.')
    }
  }

  stop(): void {
    if (this.recognition && this.isListeningState) {
      try {
        this.recognition.stop()
      } catch (error) {
        // Ignore errors when stopping
      }
      this.isListeningState = false
    }
  }

  isListening(): boolean {
    return this.isListeningState
  }

  getName(): string {
    return 'Web Speech API'
  }

  getAccuracy(): number {
    return 0.7 // Độ chính xác trung bình
  }

  getSpeed(): number {
    return 500 // ~500ms latency
  }
}

