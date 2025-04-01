import {
  LanguageCode,
  MediaEncoding,
  type Result,
  StartStreamTranscriptionCommand,
  TranscribeStreamingClient,
} from '@aws-sdk/client-transcribe-streaming'

import { pEventIterator } from 'p-event'

type AudioWorkletMessageDataType = {
  message: string
  buffer: Array<Float32Array>
  recordingLength: number
  audioData: Uint8Array
}

const SAMPLE_RATE = 16000

export async function getAudioIterator(mediaStreams: MediaStream[]) {
  const audioContext = new AudioContext({
    sampleRate: SAMPLE_RATE,
  })

  try {
    await audioContext.audioWorklet.addModule('./worklets/recording-processor.js')
  } catch (e) {
    console.error('Failed to load audio worklet')
  }

  const sourceA = audioContext.createMediaStreamSource(mediaStreams[0])
  const sourceB = audioContext.createMediaStreamSource(mediaStreams[1])

  const merger = audioContext.createChannelMerger(2)

  sourceA.connect(merger, 0, 0)
  sourceB.connect(merger, 0, 1)

  const audioWorkletNode = new AudioWorkletNode(audioContext, 'recording-processor', {
    channelCountMode: 'explicit',
    numberOfInputs: 1,
    outputChannelCount: [2],
    numberOfOutputs: 1,
    processorOptions: {
      numberOfChannels: 2,
      sampleRate: SAMPLE_RATE,
      maxFrameCount: (SAMPLE_RATE * 4) / 10, // dual channel 1 second encoding
    },
  })

  audioWorkletNode.port.postMessage({
    message: 'UPDATE_RECORDING_STATE',
    setRecording: true,
  })

  audioWorkletNode.port.onmessageerror = (error) => {
    console.log(`Error from audio worklet ${error}`)
  }

  merger.connect(audioWorkletNode)

  const audioDataIterator = pEventIterator<'message', MessageEvent<AudioWorkletMessageDataType>>(
    audioWorkletNode.port,
    'message',
  )

  return audioDataIterator
}

async function transcribeClient() {
  const client = new TranscribeStreamingClient({
    region: import.meta.env.VITE_REGION,
    credentials: {
      accessKeyId: import.meta.env.VITE_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_SECRET_ACCESS_KEY,
      sessionToken: import.meta.env.VITE_SESSION_TOKEN || undefined,
    },
  })
  return client
}


const getAudioStream = async function* (
  audioDataIterator: AsyncIterableIterator<MessageEvent<AudioWorkletMessageDataType>>,
) {
  for await (const chunk of audioDataIterator) {
    if (chunk.data.message === 'SHARE_RECORDING_BUFFER') {
      const { audioData } = chunk.data
      yield {
        AudioEvent: {
          AudioChunk: audioData,
        },
      }
    }
  }
}

export async function startTranscribe(
  mediaStreams: MediaStream[],
  languageCode: LanguageCode,
  callback: (result: Result) => void,
) {
  const client = await transcribeClient()

  const audioIterator = await getAudioIterator(mediaStreams)

  const command = new StartStreamTranscriptionCommand({
    LanguageCode: languageCode,
    MediaEncoding: MediaEncoding.PCM,
    MediaSampleRateHertz: SAMPLE_RATE,
    NumberOfChannels: 2,
    EnableChannelIdentification: true,
    ShowSpeakerLabel: true,
    AudioStream: getAudioStream(audioIterator),
  })

  const data = await client.send(command)

  if (!data.TranscriptResultStream || data.$metadata.httpStatusCode !== 200) return
  for await (const event of data.TranscriptResultStream) {
    if (event?.TranscriptEvent?.Transcript)
      for (const result of event.TranscriptEvent.Transcript.Results || []) {
        if (result) {
          callback({ ...result })
        }
      }
    else {
      console.error(event)
      throw new Error('Transcribe Stream exception')
    }
  }
}
