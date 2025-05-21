<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const options = ref<{ deviceId: string; label: string }[]>([])
const devices = ref<MediaDeviceInfo[]>([])
const props = defineProps(['disabled'])

const roleDeviceMap = ref<{ A: string | undefined; B: string | undefined }>({
  A: undefined,
  B: undefined,
})

const emit = defineEmits(['audioInputs'])

async function listAudioDevices() {
  await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'audioinput')
}

async function setup() {
  devices.value = await listAudioDevices()
  options.value = []
  for (const device of devices.value) {
    if (device.deviceId && device.deviceId !== 'default') {
      options.value.push({ deviceId: device.deviceId, label: device.label })
    }
  }

  if (options.value.length >= 2) {
    roleDeviceMap.value.A = options.value[0].deviceId
    roleDeviceMap.value.B = options.value[1].deviceId
  }
}

onMounted(async () => {
  await setup()
})

watch(
  () => roleDeviceMap,
  (newVal) => {
    if (newVal.value.A && newVal.value.B) {
      emit('audioInputs', {
        A: devices.value.find((d) => d.deviceId === newVal.value.A),
        B: devices.value.find((d) => d.deviceId === newVal.value.B),
      })
    } else {
      console.log(newVal.value)
      emit('audioInputs', { A: undefined, B: undefined })
    }
  },
  { deep: true },
)
</script>

<template>
  <div v-if="options.length >= 2">
    <div>
      <span style="padding-right: 5px">Channel 0: </span>
      <select v-model="roleDeviceMap.A" :disabled="props.disabled">
        <option v-for="(option, idx) in options" :value="option.deviceId" :key="idx">
          {{ option.label }}
        </option>
      </select>
    </div>
    <div>
      <span style="padding-right: 5px">Channel 1: </span>
      <select v-model="roleDeviceMap.B" :disabled="props.disabled">
        <option v-for="(option, idx) in options" :value="option.deviceId" :key="idx">
          {{ option.label }}
        </option>
      </select>
    </div>
  </div>

  <div v-else>
    <p>No microphone devices</p>
  </div>
  <button @click="setup">Detect devices</button>
</template>
