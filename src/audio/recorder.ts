export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private activeState: 'idle' | 'recording' = 'idle'

  async start(): Promise<void> {
    if (this.activeState === 'recording') {
      await this.stop()
    }

    this.audioChunks = []
    
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.stream = userStream

      // Determine best audio mime type supported by the current browser
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4' // Fallback for Safari/macOS/iOS
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac'
      }

      const recorder = new MediaRecorder(userStream, { mimeType })
      this.mediaRecorder = recorder
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      recorder.start(250) // Slice chunks every 250ms for recovery safety
      this.activeState = 'recording'
    } catch (err) {
      console.error('Audio recorder failed to start:', err)
      this.activeState = 'idle'
      throw err
    }
  }

  stop(): Promise<{ blob: Blob; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.activeState === 'idle') {
        reject(new Error('Audio recorder is not active.'))
        return
      }

      const recorder = this.mediaRecorder
      const mime = recorder.mimeType

      recorder.onstop = () => {
        try {
          const finalBlob = new Blob(this.audioChunks, { type: mime })
          this.audioChunks = []
          resolve({ blob: finalBlob, mimeType: mime })
        } catch (err) {
          reject(err)
        }
      }

      try {
        recorder.stop()
        
        // Stop all mic tracks to release system recording indicator
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop())
          this.stream = null
        }
      } catch (err) {
        reject(err)
      } finally {
        this.mediaRecorder = null
        this.activeState = 'idle'
      }
    })
  }

  isRecording(): boolean {
    return this.activeState === 'recording'
  }
}

export const audioRecorder = new AudioRecorder()
