export interface InputAnalyserSession {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  data: Uint8Array<ArrayBuffer>;
  source: MediaStreamAudioSourceNode;
  stream: MediaStream;
}

export function smoothValue(previous: number, next: number, alpha = 0.2): number {
  return previous + (next - previous) * alpha;
}

export async function requestMicrophoneStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

export function createInputAnalyser(stream: MediaStream): InputAnalyserSession {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.88;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

  return {
    audioContext,
    analyser,
    data,
    source,
    stream,
  };
}

export function readAmplitude(analyser: AnalyserNode, data: Uint8Array<ArrayBuffer>): number {
  analyser.getByteFrequencyData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    sum += data[i];
  }
  const avg = sum / data.length;
  return Math.min(1, Math.max(0, avg / 170));
}

export async function stopInputAnalyser(session: InputAnalyserSession | null): Promise<void> {
  if (!session) return;
  session.stream.getTracks().forEach((track) => track.stop());
  session.source.disconnect();
  session.analyser.disconnect();
  if (session.audioContext.state !== "closed") {
    await session.audioContext.close();
  }
}
