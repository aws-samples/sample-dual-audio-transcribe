<script setup lang="ts">
import { computed, ref } from 'vue'
import { startTranscribe } from './stream'
import type { LanguageCode, Result } from '@aws-sdk/client-transcribe-streaming'

import MicrophonesSelection from './components/MicrophonesSelection.vue'

const languageCodes = [
  'en-US',
  'en-GB',
  'es-US',
  'fr-CA',
  'fr-FR',
  'en-AU',
  'it-IT',
  'de-DE',
  'pt-BR',
  'ja-JP',
  'ko-KR',
  'zh-CN',
  'th-TH',
  'es-ES',
  'ar-SA',
  'pt-PT',
  'ca-ES',
  'ar-AE',
  'hi-IN',
  'zh-HK',
  'nl-NL',
  'no-NO',
  'sv-SE',
  'pl-PL',
  'fi-FI',
  'zh-TW',
  'en-IN',
  'en-IE',
  'en-NZ',
  'en-AB',
  'en-ZA',
  'en-WL',
  'de-CH',
  'af-ZA',
  'eu-ES',
  'hr-HR',
  'cs-CZ',
  'da-DK',
  'fa-IR',
  'gl-ES',
  'el-GR',
  'he-IL',
  'id-ID',
  'lv-LV',
  'ms-MY',
  'ro-RO',
  'ru-RU',
  'sr-RS',
  'sk-SK',
  'so-SO',
  'tl-PH',
  'uk-UA',
  'vi-VN',
  'zu-ZA',
] as LanguageCode[]

const audioInputs = ref<{ A: MediaDeviceInfo; B: MediaDeviceInfo } | undefined>()
const data = ref<Result[]>([])
const streams = ref()
const started = ref(false)
const startTime = Date.now()
const errorMsg = ref()
const language = ref(languageCodes[0])

function setAudioInputs(inputs: { A: MediaDeviceInfo; B: MediaDeviceInfo }) {
  if (inputs.A && inputs.B) audioInputs.value = inputs
  else audioInputs.value = undefined
}

async function getMediaStreams(devices: MediaDeviceInfo[]) {
  if (!devices.length || devices.length > 2) {
    throw new Error('Expected max two devices/inputs')
  }
  const streams: MediaStream[] = []

  for (const device of devices) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: device.deviceId,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    console.log('Using mic: ', device.label)
    if (stream) streams.push(stream)
  }

  if (streams.length) return streams
  throw new Error('Recording device not found for mediaStream')
}

function stop() {
  for (const stream of streams.value) {
    for (const track of stream.getAudioTracks()) {
      track.stop()
    }
  }
  started.value = false
}

async function start() {
  try {
    data.value = []
    errorMsg.value = undefined
    if (!audioInputs.value?.A && !audioInputs.value?.B) return

    streams.value = await getMediaStreams([audioInputs.value.A, audioInputs.value.B])
    started.value = true
    await startTranscribe(streams.value, language.value, (results) => data.value.push(results))
  } catch (e) {
    if (e instanceof Error) {
      errorMsg.value = e.message
    }
    console.log(e)
    started.value = false
  }
}

const dataA = computed(() => data.value.filter((d) => d.ChannelId === 'ch_0' && !d.IsPartial))
const dataB = computed(() => data.value.filter((d) => d.ChannelId === 'ch_1' && !d.IsPartial))
</script>

<template>
  <h1>Streaming multi-channel audio to Amazon Transcribe using the Web Audio API</h1>
  <div class="row">
    <div class="column">
      <MicrophonesSelection
        v-on:audio-inputs="setAudioInputs"
        :disabled="started"
      ></MicrophonesSelection>

      <div style="margin-top: 10px">
        <span>Language: </span>
        <select v-model="language" :disabled="started">
          <option v-for="(language, idx) of languageCodes" :value="language" :key="idx">
            {{ language }}
          </option>
        </select>
      </div>

      <div style="margin-top: 15px">
        <button v-if="audioInputs && !started" @click="start" class="button button-start">
          Start Transcription
        </button>
        <button v-if="started" @click="stop" class="button button-stop">Stop Transcription</button>
      </div>
    </div>
  </div>

  <div class="row" v-if="errorMsg">
    <pre style="color: red; margin: 10px">Error: {{ errorMsg }}</pre>
  </div>

  <div class="row" v-else>
    <div class="column">
      <p style="font-size: larger; font-weight: 600" v-if="started">
        Channel 0 - {{ audioInputs?.A.label }}
      </p>
      <div v-for="(data, idx) in dataA" :key="idx">
        <p>
          {{
            data.EndTime
              ? new Date(startTime + Math.round(data.EndTime * 1000)).toLocaleTimeString()
              : 0
          }}
          ->
          {{ data.Alternatives ? data.Alternatives[0].Transcript : '' }}
        </p>
      </div>
    </div>
    <div class="column">
      <p style="font-size: larger; font-weight: 600" v-if="started">
        Channel 1 - {{ audioInputs?.B.label }}
      </p>
      <div v-for="(data, idx) in dataB" :key="idx">
        <p>
          {{
            data.EndTime
              ? new Date(startTime + Math.round(data.EndTime * 1000)).toLocaleTimeString()
              : 0
          }}
          ->
          {{ data.Alternatives ? data.Alternatives[0].Transcript : '' }}
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="css" scoped>
.column {
  float: left;
  width: 50%;
  padding: 10px;
}

.row:after {
  content: '';
  display: table;
  clear: both;
}

.button {
  font-family: inherit;
  font-size: 18px;
  color: white;
  padding: 0.5em 1em;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}

.button:hover {
  background-color: #747475;
  color: white;
}

.button-start {
  background-color: #008cba;
} /* Blue */
.button-stop {
  background-color: #f44336;
} /* Red */
</style>
