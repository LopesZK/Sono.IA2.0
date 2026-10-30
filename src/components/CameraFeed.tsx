import React, { useRef, useEffect } from 'react';
import { Camera, RefreshCw, AlertCircle, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { DriverMetrics } from '../types/detector';
import { LandmarkPoint } from '../services/faceDetector';

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isMonitoring: boolean;
  metrics: DriverMetrics;
  landmarks: LandmarkPoint[] | null;
  cameraError: string | null;
  onRetryCamera: () => void;
  onSwitchCamera: () => void;
  facingMode: 'user' | 'environment';
  engineName: string;
  isNightModeHUD: boolean;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  videoRef,
  canvasRef,
  isMonitoring,
  metrics,
  landmarks,
  cameraError,
  onRetryCamera,
  onSwitchCamera,
  facingMode,
  engineName,
  isNightModeHUD,
}) => {
  const [isFullscreenVideo, setIsFullscreenVideo] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw AR facial landmarks overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isMonitoring) return;

    const w = canvas.width;
    const h = canvas.height;

    // Draw facial landmarks if MediaPipe points are available
    if (landmarks && landmarks.length > 0) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = metrics.averageEyeOpen < 0.25 ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.75)';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';

      landmarks.forEach((pt) => {
        const px = pt.x * w;
        const py = pt.y * h;
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Bounding box around eyes
      const eyePoints = landmarks.slice(0, 12);
      if (eyePoints.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        eyePoints.forEach((p) => {
          minX = Math.min(minX, p.x * w);
          minY = Math.min(minY, p.y * h);
          maxX = Math.max(maxX, p.x * w);
          maxY = Math.max(maxY, p.y * h);
        });

        const pad = 12;
        ctx.strokeStyle = metrics.averageEyeOpen < 0.25 ? 'rgba(239, 68, 68, 0.9)' : 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
      }
    } else if (metrics.faceDetected) {
      // Fallback bounding box
      const boxW = w * 0.45;
      const boxH = h * 0.6;
      const bx = (w - boxW) / 2;
      const by = (h - boxH) / 2.3;

      ctx.strokeStyle = metrics.averageEyeOpen < 0.25 ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(bx, by, boxW, boxH);
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(bx + 15, by + boxH * 0.35);
      ctx.lineTo(bx + boxW - 15, by + boxH * 0.35);
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
      ctx.stroke();
    }
  }, [landmarks, metrics, isMonitoring, canvasRef, videoRef]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl transition-all ${
        isFullscreenVideo ? 'fixed inset-0 z-50 rounded-none border-none' : 'aspect-[4/3] sm:aspect-[16/9] max-h-[520px]'
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`w-full h-full object-cover transform ${
          facingMode === 'user' ? 'scale-x-[-1]' : ''
        } ${isNightModeHUD ? 'brightness-75 contrast-125' : ''}`}
      />

      {/* AR Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${
          facingMode === 'user' ? 'scale-x-[-1]' : ''
        }`}
      />

      {/* Target Guide when standing by */}
      {!isMonitoring && !cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center select-none">
          <div className="w-14 h-14 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3">
            <Camera className="w-7 h-7" />
          </div>
          <p className="text-white font-mono font-bold text-sm tracking-wider uppercase mb-1">
            SENSOR ÓPTICO EM STANDBY
          </p>
          <p className="text-xs text-slate-400 max-w-xs font-sans">
            Alinhe sua linha de visão com a câmera. Clique em "Iniciar Sentinela" para iniciar o processamento biométrico.
          </p>
        </div>
      )}

      {/* Camera Permission / Device Error */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/95 p-6 text-center z-10 select-none">
          <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
          <p className="text-white font-mono font-bold text-sm uppercase mb-1">Permissão da Câmera Necessária</p>
          <p className="text-xs text-rose-200/90 max-w-sm mb-4">
            {cameraError || 'Não foi possível acessar a câmera do dispositivo para monitorar a sonolência.'}
          </p>
          <button
            onClick={onRetryCamera}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-lg transition-colors font-mono uppercase"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tentar Novamente
          </button>
        </div>
      )}

      {/* HUD Telemetry Badges */}
      {isMonitoring && (
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none select-none">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-md border border-white/10 text-[11px] text-white font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>REC {metrics.fps} FPS</span>
            </div>
            <div className="hidden xs:flex items-center gap-1 px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-md border border-white/10 text-[11px] text-slate-300 font-mono">
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>{engineName === 'mediapipe' ? 'MediaPipe Mesh' : 'CV Fast Engine'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Switch Camera */}
            <button
              onClick={onSwitchCamera}
              title="Alternar Câmera Frontal / Traseira"
              className="p-1.5 bg-black/75 backdrop-blur-md hover:bg-black text-white rounded-md border border-white/10 text-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {/* Fullscreen Video Toggle */}
            <button
              onClick={() => setIsFullscreenVideo(!isFullscreenVideo)}
              title={isFullscreenVideo ? 'Reduzir Visão' : 'Expandir Câmera'}
              className="p-1.5 bg-black/75 backdrop-blur-md hover:bg-black text-white rounded-md border border-white/10 text-xs transition-colors"
            >
              {isFullscreenVideo ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Telemetry HUD */}
      {isMonitoring && metrics.faceDetected && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white/90 pointer-events-none font-mono">
          <div className="px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-md border border-white/10">
            EAR: {metrics.averageEyeOpen.toFixed(2)} · MAR: {metrics.yawnScore.toFixed(2)}
          </div>
          <div className="px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-md border border-white/10">
            Pitch: {metrics.headPitch}°
          </div>
        </div>
      )}
    </div>
  );
};
