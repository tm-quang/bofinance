/**
 * Voice Recognition Utility
 * Sử dụng Web Speech API để nhận diện giọng nói
 */

export interface VoiceRecognitionOptions {
  onResult: (transcript: string) => void
  onError?: (error: Error) => void
  onStart?: () => void
  onEnd?: () => void
  language?: string // Mặc định 'vi-VN' hoặc 'en-US'
  continuous?: boolean // Tiếp tục nhận diện sau khi nói xong
}

export class VoiceRecognitionService {
  private recognition: any = null
  private isSupported: boolean = false
  private isListening: boolean = false

  constructor() {
    // Kiểm tra browser support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      this.isSupported = !!SpeechRecognition

      if (this.isSupported) {
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = false
        this.recognition.interimResults = false
        this.recognition.lang = 'vi-VN' // Tiếng Việt
      }
    }
  }

  /**
   * Kiểm tra xem browser có hỗ trợ voice recognition không
   */
  isBrowserSupported(): boolean {
    return this.isSupported
  }

  /**
   * Bắt đầu nhận diện giọng nói
   */
  start(options: VoiceRecognitionOptions): void {
    if (!this.isSupported) {
      options.onError?.(new Error('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng sử dụng Chrome, Edge hoặc Safari.'))
      return
    }

    if (this.isListening) {
      this.stop()
    }

    this.recognition.lang = options.language || 'vi-VN'
    this.recognition.continuous = options.continuous || false

    this.recognition.onstart = () => {
      this.isListening = true
      options.onStart?.()
    }

    this.recognition.onresult = (event: any) => {
      let finalTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        }
      }

      if (finalTranscript) {
        options.onResult(finalTranscript.trim())
      }
    }

    this.recognition.onerror = (event: any) => {
      this.isListening = false
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
      this.isListening = false
      options.onEnd?.()
    }

    try {
      this.recognition.start()
    } catch (error) {
      options.onError?.(new Error('Không thể bắt đầu nhận diện giọng nói. Vui lòng thử lại.'))
    }
  }

  /**
   * Dừng nhận diện giọng nói
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop()
      } catch (error) {
        // Ignore errors when stopping
      }
      this.isListening = false
    }
  }

  /**
   * Kiểm tra trạng thái đang lắng nghe
   */
  getIsListening(): boolean {
    return this.isListening
  }
}

/**
 * Chuyển số bằng chữ tiếng Việt thành số
 */
function wordToNumber(word: string): string | null {
  const numberMap: Record<string, string> = {
    'không': '0',
    'một': '1',
    'hai': '2',
    'ba': '3',
    'bốn': '4',
    'năm': '5',
    'sáu': '6',
    'bảy': '7',
    'tám': '8',
    'chín': '9',
    'mười': '10',
    'mười một': '11',
    'mười hai': '12',
    'mười ba': '13',
    'mười bốn': '14',
    'mười lăm': '15',
    'mười sáu': '16',
    'mười bảy': '17',
    'mười tám': '18',
    'mười chín': '19',
    'hai mươi': '20',
  }
  
  return numberMap[word.toLowerCase()] || null
}

/**
 * Parse text từ giọng nói thành danh sách items với số lượng
 * Hỗ trợ cả số và số bằng chữ tiếng Việt
 * Ví dụ: "mua 2 chai nước, 3 gói mì, năm quả táo"
 * => [{name: "chai nước", quantity: "2"}, {name: "gói mì", quantity: "3"}, {name: "quả táo", quantity: "5"}]
 */
export function parseVoiceInputToItems(text: string): Array<{ name: string; quantity: string }> {
  const items: Array<{ name: string; quantity: string }> = []
  
  // Loại bỏ dấu câu và chuẩn hóa
  let normalizedText = text
    .toLowerCase()
    .replace(/[,，、]/g, ',') // Chuẩn hóa dấu phẩy
    .replace(/[\.。]/g, '') // Loại bỏ dấu chấm
    .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
    .trim()

  // Tách theo dấu phẩy hoặc từ khóa
  let parts: string[] = []
  
  // Tách theo dấu phẩy
  if (normalizedText.includes(',')) {
    parts = normalizedText.split(',').map(p => p.trim()).filter(p => p)
  } else {
    // Nếu không có dấu phẩy, thử tách theo số hoặc từ khóa
    parts = normalizedText.split(/(?=\s*\d+\s+|\s+(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s+)/).map(p => p.trim()).filter(p => p)
    if (parts.length === 1) {
      parts = [normalizedText]
    }
  }

  for (const part of parts) {
    // Loại bỏ các từ khóa không cần thiết ở đầu
    let cleanPart = part.replace(/^(mua|thêm|cho|và|với|cần)\s+/i, '').trim()

    let quantity = '1' // Mặc định là 1
    let itemName = cleanPart

    // Tìm số bằng chữ tiếng Việt trước
    const wordNumberMatch = cleanPart.match(/^(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mười một|mười hai|mười ba|mười bốn|mười lăm|mười sáu|mười bảy|mười tám|mười chín|hai mươi)\s+/i)
    if (wordNumberMatch) {
      const wordNumber = wordToNumber(wordNumberMatch[1])
      if (wordNumber) {
        quantity = wordNumber
        cleanPart = cleanPart.replace(wordNumberMatch[0], '').trim()
      }
    }

    // Tìm số (số arabic)
    const numberMatch = cleanPart.match(/^(\d+)\s+/)
    if (numberMatch) {
      quantity = numberMatch[1]
      cleanPart = cleanPart.replace(numberMatch[0], '').trim()
    }

    // Loại bỏ các từ chỉ đơn vị số lượng
    const unitPattern = /^(cái|chiếc|chai|gói|hộp|kg|kí|kilo|quả|trái|con|bịch|túi|lon|chén|bát|đĩa|bộ|ly|tách|bình|thùng)\s+/i
    itemName = cleanPart.replace(unitPattern, '').trim()

    // Loại bỏ các từ không cần thiết ở cuối
    itemName = itemName.replace(/\s+(và|với|cho|nữa)$/i, '').trim()

    // Loại bỏ các từ không cần thiết ở đầu
    itemName = itemName.replace(/^(và|với|cho|mua|thêm|tôi|cần)\s+/i, '').trim()

    if (itemName && itemName.length > 0) {
      // Viết hoa chữ cái đầu
      const capitalizedName = itemName.charAt(0).toUpperCase() + itemName.slice(1)
      
      items.push({
        name: capitalizedName,
        quantity: quantity
      })
    }
  }

  // Nếu không tách được, thử tách đơn giản
  if (items.length === 0 && normalizedText) {
    // Loại bỏ từ khóa "mua"
    const withoutKeyword = normalizedText.replace(/^(mua|thêm|tôi cần|tôi muốn)\s+/i, '').trim()
    
    if (withoutKeyword && withoutKeyword.length > 2) {
      items.push({
        name: withoutKeyword.charAt(0).toUpperCase() + withoutKeyword.slice(1),
        quantity: '1'
      })
    }
  }

  return items
}

// Export singleton instance
export const voiceRecognitionService = new VoiceRecognitionService()

