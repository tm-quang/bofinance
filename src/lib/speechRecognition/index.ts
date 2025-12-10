/**
 * Speech Recognition Module
 * Export tất cả các types và classes để dễ import
 */

export type { ISpeechProvider, SpeechRecognitionOptions } from './ISpeechProvider'
export { WebSpeechProvider } from './WebSpeechProvider'
export { OpenAIWhisperProvider } from './OpenAIWhisperProvider'
export { speechRecognitionManager, type ProviderType } from './SpeechRecognitionManager'

