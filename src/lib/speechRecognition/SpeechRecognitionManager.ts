/**
 * Speech Recognition Manager
 * Quản lý và chọn provider tốt nhất, với fallback và post-processing
 */

import type { ISpeechProvider, SpeechRecognitionOptions } from './ISpeechProvider'
import { WebSpeechProvider } from './WebSpeechProvider'
import { OpenAIWhisperProvider } from './OpenAIWhisperProvider'

export type ProviderType = 'auto' | 'web-speech' | 'openai-whisper'

export class SpeechRecognitionManager {
  private providers: Map<string, ISpeechProvider> = new Map()
  private currentProvider: ISpeechProvider | null = null
  // @ts-ignore - Reserved for future provider selection
  private preferredProvider: ProviderType = 'auto'

  constructor() {
    // Đăng ký các providers
    const webSpeech = new WebSpeechProvider()
    const openAIWhisper = new OpenAIWhisperProvider()

    this.providers.set('web-speech', webSpeech)
    this.providers.set('openai-whisper', openAIWhisper)

    // Chọn provider mặc định
    this.selectProvider()
  }

  /**
   * Chọn provider tốt nhất dựa trên cấu hình
   */
  private selectProvider(): void {
    const preferred = import.meta.env.VITE_SPEECH_PROVIDER as ProviderType || 'auto'

    if (preferred === 'auto') {
      // Tạm thời chỉ dùng Web Speech API (miễn phí)
      // AI providers đã bị ẩn, có thể bật lại sau bằng cách set VITE_SPEECH_PROVIDER=openai-whisper
      const webSpeech = this.providers.get('web-speech')
      if (webSpeech?.isSupported()) {
        this.currentProvider = webSpeech
      }
    } else if (preferred === 'web-speech') {
      // Chỉ dùng Web Speech
      const provider = this.providers.get('web-speech')
      if (provider && provider.isSupported()) {
        this.currentProvider = provider
      }
    } else if (preferred === 'openai-whisper') {
      // Chỉ dùng OpenAI Whisper (nếu user explicitly chọn)
      const provider = this.providers.get('openai-whisper')
      if (provider && provider.isSupported()) {
        this.currentProvider = provider
      } else {
        // Fallback về Web Speech nếu OpenAI không khả dụng
        const fallback = this.providers.get('web-speech')
        if (fallback?.isSupported()) {
          this.currentProvider = fallback
        }
      }
    } else {
      // Fallback về Web Speech
      const fallback = this.providers.get('web-speech')
      if (fallback?.isSupported()) {
        this.currentProvider = fallback
      }
    }

    this.preferredProvider = preferred
  }

  /**
   * Set provider ưa thích
   */
  setProvider(providerType: ProviderType): void {
    this.preferredProvider = providerType
    this.selectProvider()
  }

  /**
   * Lấy provider hiện tại
   */
  getCurrentProvider(): ISpeechProvider | null {
    return this.currentProvider
  }

  /**
   * Lấy tên provider hiện tại
   */
  getProviderName(): string {
    return this.currentProvider?.getName() || 'Không có'
  }

  /**
   * Kiểm tra xem có provider nào được hỗ trợ không
   */
  isSupported(): boolean {
    return this.currentProvider !== null
  }

  /**
   * Bắt đầu nhận diện giọng nói với provider hiện tại
   */
  async start(options: SpeechRecognitionOptions): Promise<void> {
    if (!this.currentProvider) {
      throw new Error('Không có speech recognition provider nào khả dụng')
    }

    // Enhanced options với post-processing
    const enhancedOptions: SpeechRecognitionOptions = {
      ...options,
      onResult: (transcript: string, isFinal: boolean) => {
        // Post-process transcript
        const processed = this.postProcess(transcript, this.currentProvider!)
        
        if (isFinal && processed) {
          options.onResult?.(processed, true)
        } else if (!isFinal) {
          options.onResult?.(transcript, false)
        }
      },
    }

    await this.currentProvider.start(enhancedOptions)
  }

  /**
   * Dừng nhận diện
   */
  stop(): void {
    this.currentProvider?.stop()
  }

  /**
   * Kiểm tra trạng thái
   */
  isListening(): boolean {
    return this.currentProvider?.isListening() || false
  }

  /**
   * Post-process transcript để cải thiện độ chính xác
   */
  private postProcess(text: string, _provider: ISpeechProvider): string {
    let processed = text.trim()

    // 1. Chuẩn hóa khoảng trắng
    processed = processed.replace(/\s+/g, ' ').trim()

    // 2. Sửa lỗi phổ biến với tiếng Việt
    const commonMistakes: Record<string, string> = {
      // Lỗi dấu câu
      ' ,': ',',
      ' .': '.',
      ' :': ':',
      ' ;': ';',
      // Lỗi từ phổ biến
      'được rồi': 'được rồi',
      'không được': 'không được',
      'được không': 'được không',
      // Lỗi số
      ' một ': ' 1 ',
      ' hai ': ' 2 ',
      ' ba ': ' 3 ',
      ' bốn ': ' 4 ',
      ' năm ': ' 5 ',
    }

    // Apply corrections
    Object.entries(commonMistakes).forEach(([wrong, correct]) => {
      processed = processed.replace(new RegExp(wrong, 'gi'), correct)
    })

    // 3. Capitalize đầu câu
    processed = processed.charAt(0).toUpperCase() + processed.slice(1)

    // 4. Thêm dấu câu nếu thiếu (heuristic)
    if (processed.length > 0 && !/[.!?]$/.test(processed)) {
      // Có thể thêm logic phức tạp hơn ở đây
    }

    return processed
  }

  /**
   * Lấy danh sách providers có sẵn
   */
  getAvailableProviders(): Array<{ type: string; name: string; accuracy: number; speed: number; supported: boolean }> {
    const result: Array<{ type: string; name: string; accuracy: number; speed: number; supported: boolean }> = []
    
    this.providers.forEach((provider, type) => {
      result.push({
        type,
        name: provider.getName(),
        accuracy: provider.getAccuracy(),
        speed: provider.getSpeed(),
        supported: provider.isSupported(),
      })
    })

    return result
  }
}

// Export singleton instance
export const speechRecognitionManager = new SpeechRecognitionManager()

