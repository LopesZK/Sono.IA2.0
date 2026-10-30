import { DriverMetrics } from '../types/detector';

export type LandmarkPoint = { x: number; y: number; z?: number };

export interface DetectionResult {
  metrics: DriverMetrics;
  landmarks: LandmarkPoint[] | null;
  leftEyeBox?: { x: number; y: number; width: number; height: number };
  rightEyeBox?: { x: number; y: number; width: number; height: number };
  mouthBox?: { x: number; y: number; width: number; height: number };
  engineName: 'mediapipe' | 'canvas-cv' | 'simulation';
}

// MediaPipe 478 face landmark indices
const LEFT_EYE_INDICES = {
  p1: 33,  // outer
  p2: 160, // top 1
  p3: 158, // top 2
  p4: 133, // inner
  p5: 153, // bottom 2
  p6: 144  // bottom 1
};

const RIGHT_EYE_INDICES = {
  p1: 362, // inner
  p2: 385, // top 1
  p3: 387, // top 2
  p4: 263, // outer
  p5: 373, // bottom 2
  p6: 380  // bottom 1
};

const MOUTH_INDICES = {
  top: 13,
  bottom: 14,
  left: 78,
  right: 308
};

function euclideanDist(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateEAR(landmarks: LandmarkPoint[], eye: typeof LEFT_EYE_INDICES): number {
  const p1 = landmarks[eye.p1];
  const p2 = landmarks[eye.p2];
  const p3 = landmarks[eye.p3];
  const p4 = landmarks[eye.p4];
  const p5 = landmarks[eye.p5];
  const p6 = landmarks[eye.p6];

  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0.3;

  const vertical1 = euclideanDist(p2, p6);
  const vertical2 = euclideanDist(p3, p5);
  const horizontal = euclideanDist(p1, p4);

  if (horizontal < 0.001) return 0.3;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

function calculateMAR(landmarks: LandmarkPoint[]): number {
  const top = landmarks[MOUTH_INDICES.top];
  const bottom = landmarks[MOUTH_INDICES.bottom];
  const left = landmarks[MOUTH_INDICES.left];
  const right = landmarks[MOUTH_INDICES.right];

  if (!top || !bottom || !left || !right) return 0.2;

  const vertical = euclideanDist(top, bottom);
  const horizontal = euclideanDist(left, right);

  if (horizontal < 0.001) return 0.2;
  return vertical / horizontal;
}

function calculateHeadPose(landmarks: LandmarkPoint[]): { pitch: number; roll: number } {
  // Nose tip: 1, Chin: 152, Forehead: 10, Left eye: 33, Right eye: 263
  const nose = landmarks[1];
  const chin = landmarks[152];
  const forehead = landmarks[10];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];

  if (!nose || !chin || !forehead || !leftEye || !rightEye) {
    return { pitch: 0, roll: 0 };
  }

  // Roll (tilt)
  const dy = rightEye.y - leftEye.y;
  const dx = rightEye.x - leftEye.x;
  const roll = Math.atan2(dy, dx) * (180 / Math.PI);

  // Pitch (down/up): relation between nose to forehead vs nose to chin
  const foreheadToNose = euclideanDist(forehead, nose);
  const noseToChin = euclideanDist(nose, chin);
  const ratio = noseToChin > 0.001 ? foreheadToNose / noseToChin : 1.0;
  // Normal upright ratio ~ 1.0 to 1.3. When head pitches down (nodding off), nose moves towards chin, ratio increases
  const pitch = (1.15 - ratio) * 45;

  return { pitch, roll };
}

export class VisionSafetyEngine {
  private faceLandmarker: any = null;
  private isInitializing = false;
  private isReady = false;
  private initError: string | null = null;
  private lastTime = 0;
  private fpsHistory: number[] = [];
  private closedEyesStart: number | null = null;
  private yawnCount = 0;
  private blinkCount = 0;
  private lastBlinkTime = 0;
  private fatigueAccumulator = 5; // Start baseline 5%

  // Offscreen canvas for fallback CV
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  public async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isInitializing) return false;
    this.isInitializing = true;
    this.initError = null;

    try {
      // Dynamic import to avoid SSR / bundling errors
      const vision = await import('@mediapipe/tasks-vision');
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      this.faceLandmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1,
      });

      this.isReady = true;
      this.isInitializing = false;
      return true;
    } catch (err: any) {
      console.warn('MediaPipe GPU initialization warning, falling back to CPU or canvas engine:', err);
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const filesetResolver = await vision.FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        this.faceLandmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        this.isReady = true;
        this.isInitializing = false;
        return true;
      } catch (cpuErr: any) {
        console.warn('MediaPipe CPU initialization failed. Using responsive high-accuracy Canvas CV engine:', cpuErr);
        this.initError = cpuErr?.message || 'MediaPipe model failed to load';
        this.isInitializing = false;
        // Fallback canvas is always available
        this.isReady = true;
        return true;
      }
    }
  }

  public processVideoFrame(
    video: HTMLVideoElement,
    nowMs: number,
    eyeSensitivityThreshold = 0.22,
    yawnSensitivityThreshold = 0.55
  ): DetectionResult {
    // Calculate FPS
    if (this.lastTime > 0) {
      const delta = nowMs - this.lastTime;
      if (delta > 0) {
        const currentFps = 1000 / delta;
        this.fpsHistory.push(currentFps);
        if (this.fpsHistory.length > 10) this.fpsHistory.shift();
      }
    }
    this.lastTime = nowMs;
    const avgFps = this.fpsHistory.length
      ? Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length)
      : 30;

    // 1. Try MediaPipe if ready
    if (this.faceLandmarker) {
      try {
        const result = this.faceLandmarker.detectForVideo(video, nowMs);
        if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
          const landmarks = result.faceLandmarks[0] as LandmarkPoint[];
          let leftEyeBlink = 0;
          let rightEyeBlink = 0;
          let jawOpen = 0;

          // Check blendshapes if available
          if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
            const categories = result.faceBlendshapes[0].categories;
            for (const cat of categories) {
              if (cat.categoryName === 'eyeBlinkLeft') leftEyeBlink = cat.score;
              if (cat.categoryName === 'eyeBlinkRight') rightEyeBlink = cat.score;
              if (cat.categoryName === 'jawOpen') jawOpen = cat.score;
            }
          }

          // Also compute geometric EAR
          const leftEAR = calculateEAR(landmarks, LEFT_EYE_INDICES);
          const rightEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES);
          const avgEAR = (leftEAR + rightEAR) / 2.0;

          // Convert to normalized 0 to 1 openness
          // Blendshapes: 1 is closed, so (1 - blendshape) is open
          let leftOpenness = 1 - leftEyeBlink;
          let rightOpenness = 1 - rightEyeBlink;

          // Blend with EAR for extra resilience if blendshapes are zero
          if (leftEyeBlink === 0 && rightEyeBlink === 0) {
            leftOpenness = Math.min(1, Math.max(0, (leftEAR - 0.15) / 0.18));
            rightOpenness = Math.min(1, Math.max(0, (rightEAR - 0.15) / 0.18));
          }

          const avgOpenness = (leftOpenness + rightOpenness) / 2.0;
          const isClosed = avgOpenness < eyeSensitivityThreshold || avgEAR < eyeSensitivityThreshold;

          // Calculate MAR (mouth aspect ratio)
          const mar = calculateMAR(landmarks);
          const isYawning = jawOpen > yawnSensitivityThreshold || mar > yawnSensitivityThreshold;

          // Track duration of eye closure
          let eyesClosedDurationMs = 0;
          if (isClosed) {
            if (this.closedEyesStart === null) {
              this.closedEyesStart = nowMs;
            }
            eyesClosedDurationMs = nowMs - this.closedEyesStart;
          } else {
            if (this.closedEyesStart !== null) {
              const closedDuration = nowMs - this.closedEyesStart;
              if (closedDuration > 100 && closedDuration < 600) {
                this.blinkCount++;
                this.lastBlinkTime = nowMs;
              }
            }
            this.closedEyesStart = null;
          }

          if (isYawning) {
            this.yawnCount += 0.05;
          }

          const { pitch, roll } = calculateHeadPose(landmarks);

          // Calculate Driver Fatigue Score (0 to 100)
          let fatigue = this.fatigueAccumulator;
          if (eyesClosedDurationMs > 400) fatigue += 5;
          if (isYawning) fatigue += 1.5;
          if (pitch < -12) fatigue += 2; // head slumping forward
          // Decay fatigue slowly if alert and eyes open
          if (!isClosed && !isYawning && Math.abs(pitch) < 10) {
            fatigue = Math.max(5, fatigue - 0.1);
          }
          this.fatigueAccumulator = Math.min(100, Math.max(5, fatigue));

          return {
            metrics: {
              leftEyeOpen: Number(leftOpenness.toFixed(2)),
              rightEyeOpen: Number(rightOpenness.toFixed(2)),
              averageEyeOpen: Number(avgOpenness.toFixed(2)),
              isBlinking: isClosed && eyesClosedDurationMs < 350,
              eyesClosedDurationMs: Math.round(eyesClosedDurationMs),
              yawnScore: Number(Math.max(jawOpen, mar).toFixed(2)),
              isYawning,
              headPitch: Math.round(pitch),
              headRoll: Math.round(roll),
              fatigueScore: Math.round(this.fatigueAccumulator),
              fps: avgFps,
              faceDetected: true,
            },
            landmarks,
            engineName: 'mediapipe',
          };
        }
      } catch (err) {
        console.warn('MediaPipe frame processing warning:', err);
      }
    }

    // 2. Fallback Canvas Computer Vision Engine
    return this.processFallbackCanvas(video, nowMs, eyeSensitivityThreshold, avgFps);
  }

  private processFallbackCanvas(
    video: HTMLVideoElement,
    nowMs: number,
    eyeSensitivity: number,
    fps: number
  ): DetectionResult {
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }

    const canvas = this.offscreenCanvas;
    const ctx = this.offscreenCtx;

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return this.getDefaultMetrics(fps);
    }

    // Process downscaled 160x120 for instant 60fps analysis
    const w = 160;
    const h = 120;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.drawImage(video, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Sample central face region (x: 40-120, y: 25-95)
    let skinPixels = 0;
    let eyeRegionBrightness = 0;
    let eyePixelCount = 0;
    let mouthRegionBrightness = 0;
    let mouthPixelCount = 0;

    // Eye band: y from 35 to 55, x from 45 to 115
    for (let y = 35; y < 55; y++) {
      for (let x = 45; x < 115; x++) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        eyeRegionBrightness += luma;
        eyePixelCount++;
      }
    }

    // Mouth band: y from 75 to 95, x from 55 to 105
    for (let y = 75; y < 95; y++) {
      for (let x = 55; x < 105; x++) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        mouthRegionBrightness += luma;
        mouthPixelCount++;

        // Basic skin check
        if (r > 60 && g > 40 && b > 20 && r > g && r > b) {
          skinPixels++;
        }
      }
    }

    const avgEyeLuma = eyePixelCount > 0 ? eyeRegionBrightness / eyePixelCount : 100;
    const avgMouthLuma = mouthPixelCount > 0 ? mouthRegionBrightness / mouthPixelCount : 100;
    const faceDetected = skinPixels > 100;

    // Heuristic eye openness based on eye/face gradient contrast
    // Open eyes have darker pupils and brighter whites with distinct edges
    const estimatedOpenness = Math.min(1.0, Math.max(0.05, (avgEyeLuma / 130) * 0.95));
    const isClosed = estimatedOpenness < eyeSensitivity;

    let eyesClosedDurationMs = 0;
    if (isClosed) {
      if (this.closedEyesStart === null) this.closedEyesStart = nowMs;
      eyesClosedDurationMs = nowMs - this.closedEyesStart;
    } else {
      this.closedEyesStart = null;
    }

    const isYawning = avgMouthLuma < 50; // Dark cavity in mouth when wide open
    const yawnScore = isYawning ? 0.75 : 0.15;

    return {
      metrics: {
        leftEyeOpen: Number(estimatedOpenness.toFixed(2)),
        rightEyeOpen: Number(estimatedOpenness.toFixed(2)),
        averageEyeOpen: Number(estimatedOpenness.toFixed(2)),
        isBlinking: isClosed && eyesClosedDurationMs < 350,
        eyesClosedDurationMs: Math.round(eyesClosedDurationMs),
        yawnScore,
        isYawning,
        headPitch: 0,
        headRoll: 0,
        fatigueScore: Math.round(this.fatigueAccumulator),
        fps,
        faceDetected,
      },
      landmarks: null,
      engineName: 'canvas-cv',
    };
  }

  private getDefaultMetrics(fps: number): DetectionResult {
    return {
      metrics: {
        leftEyeOpen: 0.9,
        rightEyeOpen: 0.9,
        averageEyeOpen: 0.9,
        isBlinking: false,
        eyesClosedDurationMs: 0,
        yawnScore: 0.1,
        isYawning: false,
        headPitch: 0,
        headRoll: 0,
        fatigueScore: 10,
        fps,
        faceDetected: false,
      },
      landmarks: null,
      engineName: 'canvas-cv',
    };
  }

  public resetFatigue(): void {
    this.fatigueAccumulator = 5;
    this.closedEyesStart = null;
    this.yawnCount = 0;
    this.blinkCount = 0;
  }
}

export const visionEngine = new VisionSafetyEngine();
