/**
 * Voice Input Button Component
 * Component tái sử dụng để thêm nút nhận diện giọng nói vào input fields
 */

import { FaMicrophone } from 'react-icons/fa'
import { speechRecognitionManager } from '../../lib/speechRecognition/SpeechRecognitionManager'

interface VoiceInputButtonProps {
  isListening: boolean
  onStart: () => void
  onStop: () => void
  className?: string
  iconSize?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'success'
  disabled?: boolean
  title?: string
}

const sizeClasses = {
  sm: 'h-3 w-3 p-1',
  md: 'h-4 w-4 p-1.5',
  lg: 'h-5 w-5 p-2',
}

const variantClasses = {
  default: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
  primary: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
  success: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
}

export const VoiceInputButton = ({
  isListening,
  onStart,
  onStop,
  className = '',
  iconSize = 'md',
  variant = 'default',
  disabled = false,
  title,
}: VoiceInputButtonProps) => {
  const isSupported = speechRecognitionManager.isSupported()
  const providerName = speechRecognitionManager.getProviderName()

  const handleClick = () => {
    if (disabled || !isSupported) return
    
    if (isListening) {
      onStop()
    } else {
      onStart()
    }
  }

  if (!isSupported) {
    return null
  }

  const baseTitle = title || (isListening ? 'Dừng nhận diện giọng nói' : 'Nhập bằng giọng nói')
  const fullTitle = `${baseTitle} (${providerName})`

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`rounded-full transition-all ${
        isListening
          ? 'bg-red-100 text-red-600 animate-pulse'
          : variantClasses[variant]
      } ${sizeClasses[iconSize]} ${className} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'
      }`}
      title={fullTitle}
    >
      <FaMicrophone className={sizeClasses[iconSize].split(' ')[0]} />
    </button>
  )
}

