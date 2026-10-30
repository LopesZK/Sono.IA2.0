import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Square,
  Volume2,
  Sparkles,
  ShieldCheck,
  Eye,
  Coffee,
  AlertTriangle,
  Database,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { DriverState, DriverMetrics, DetectionSettings, TripSummary } from './types/detector';
import { visionEngine, LandmarkPoint } from './services/faceDetector';
import { audioAlarm } from './services/audioAlarm';
import { wakeLockService } from './services/wakeLock';
import { localDb, StoredTrip, StoredAlertEvent } from './services/database';

import { CockpitHeader } from './components/CockpitHeader';
import { StatusBanner } from './components/StatusBanner';
import { FatigueGauge } from './components/FatigueGauge';
import { CameraFeed } from './components/CameraFeed';
import { AlarmOverlay } from './components/AlarmOverlay';
import { SimulatorBar } from './components/SimulatorBar';
import { SettingsModal } from './components/SettingsModal';
import { TripStatsModal } from './components/TripStatsModal';
import { SafetyTipsDrawer } from './components/SafetyTipsDrawer';
import { DatabaseModal } from './components/DatabaseModal';
import { SimplifiedDriverView } from './components/SimplifiedDriverView';
import { AiChatbot } from './components/AiChatbot';

const DEFAULT_SETTINGS: DetectionSettings = {
  sleepThresholdSeconds: 1.2,
  drowsyThresholdSeconds: 0.5,
  eyeSensitivity: 0.22,
  yawnThreshold: 0.55,
  soundType: 'shrill-buzzer',
  voiceAlertsEnabled: true,
  vibrationEnabled: true,
  volume: 1.0,
  facingMode: 'user',
  nightModeHUD: false,
};

const INITIAL_METRICS: DriverMetrics = {
  leftEyeOpen: 0.85,
  rightEyeOpen: 0.85,
  averageEyeOpen: 0.85,
  isBlinking: false,
  eyesClosedDurationMs: 0,
  yawnScore: 0.1,
  isYawning: false,
  headPitch: 0,
  headRoll: 0,
  fatigueScore: 10,
  fps: 0,
  faceDetected: false,
};

export default function App() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [driverState, setDriverState] = useState<DriverState>('awake');
  const [metrics, setMetrics] = useState<DriverMetrics>(INITIAL_METRICS);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[] | null>(null);
  const [engineName, setEngineName] = useState<string>('carregando...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSimulatedState, setActiveSimulatedState] = useState<DriverState | null>(null);

  // Settings & Storage
  const [settings, setSettings] = useState<DetectionSettings>(() => {
    try {
      const saved = localStorage.getItem('vigidrive_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Trip Statistics
  const [tripSummary, setTripSummary] = useState<TripSummary>(() => {
    try {
      const saved = localStorage.getItem('vigidrive_trip');
      return saved ? JSON.parse(saved) : { startTime: Date.now(), totalDrowsyCount: 0, totalAsleepCount: 0, events: [] };
    } catch {
      return { startTime: Date.now(), totalDrowsyCount: 0, totalAsleepCount: 0, events: [] };
    }
  });

  const [tripDurationSec, setTripDurationSec] = useState(0);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [dbTripCount, setDbTripCount] = useState<number>(0);
  const [dbNotification, setDbNotification] = useState<string | null>(null);

  // View Mode: 'simplified' (default for driving) or 'advanced' (full telemetry)
  const [viewMode, setViewMode] = useState<'simplified' | 'advanced'>(() => {
    try {
      const saved = localStorage.getItem('vigidrive_view_mode');
      return saved === 'advanced' ? 'advanced' : 'simplified';
    } catch {
      return 'simplified';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vigidrive_view_mode', viewMode);
    } catch (e) {
      console.warn('Failed to save view mode:', e);
    }
  }, [viewMode]);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [isAlarmOverlayOpen, setIsAlarmOverlayOpen] = useState(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);

  // Refresh DB trip count
  const refreshDbCount = useCallback(async () => {
    try {
      const trips = await localDb.getAllTrips();
      setDbTripCount(trips.length);
    } catch (e) {
      console.warn('Failed to load trips count:', e);
    }
  }, []);

  useEffect(() => {
    refreshDbCount();
  }, [refreshDbCount]);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastDrowsySoundTime = useRef<number>(0);
  const tripIntervalRef = useRef<number | null>(null);

  // Save settings when changed
  useEffect(() => {
    try {
      localStorage.setItem('vigidrive_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }, [settings]);

  // Save trip summary when changed
  useEffect(() => {
    try {
      localStorage.setItem('vigidrive_trip', JSON.stringify(tripSummary));
    } catch (e) {
      console.warn('Failed to save trip:', e);
    }
  }, [tripSummary]);

  // Trip duration timer
  useEffect(() => {
    if (isMonitoring) {
      tripIntervalRef.current = window.setInterval(() => {
        setTripDurationSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (tripIntervalRef.current) {
        clearInterval(tripIntervalRef.current);
        tripIntervalRef.current = null;
      }
    }
    return () => {
      if (tripIntervalRef.current) clearInterval(tripIntervalRef.current);
    };
  }, [isMonitoring]);

  // Initialize MediaPipe engine in background
  useEffect(() => {
    let isMounted = true;
    visionEngine.initialize().then(() => {
      if (isMounted) {
        setEngineName('mediapipe');
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Stop camera helper
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera stream
  const startCameraStream = useCallback(async (facing: 'user' | 'environment') => {
    setCameraError(null);
    stopCameraStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Não foi possível acessar a câmera. Verifique as permissões do navegador.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Permissão da câmera negada. Clique no ícone de cadeado/permissão do navegador e autorize.';
      } else if (err.name === 'NotFoundError') {
        msg = 'Nenhuma câmera encontrada no dispositivo.';
      }
      setCameraError(msg);
      return false;
    }
  }, [stopCameraStream]);

  // Reattach camera stream seamlessly when switching between Simplified and Advanced views
  useEffect(() => {
    if (isMonitoring && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [viewMode, isMonitoring]);

  // Switch front/back camera
  const handleSwitchCamera = useCallback(() => {
    const nextFacing = settings.facingMode === 'user' ? 'environment' : 'user';
    setSettings((prev) => ({ ...prev, facingMode: nextFacing }));
    if (isMonitoring) {
      startCameraStream(nextFacing);
    }
  }, [settings.facingMode, isMonitoring, startCameraStream]);

  // Log detected event & save to database
  const logTripEvent = useCallback((type: 'drowsy' | 'asleep', durationMs: number, fatigue: number) => {
    const eventId = 'evt_' + Math.random().toString(36).substring(2, 9);
    const now = Date.now();

    setTripSummary((prev) => {
      const newEvent = {
        id: eventId,
        timestamp: now,
        type,
        durationMs,
        fatigueScore: fatigue,
      };
      return {
        ...prev,
        totalDrowsyCount: type === 'drowsy' ? prev.totalDrowsyCount + 1 : prev.totalDrowsyCount,
        totalAsleepCount: type === 'asleep' ? prev.totalAsleepCount + 1 : prev.totalAsleepCount,
        events: [...prev.events, newEvent],
      };
    });

    // Save directly to IndexedDB
    if (currentTripId) {
      const storedEvent: StoredAlertEvent = {
        id: eventId,
        tripId: currentTripId,
        timestamp: now,
        type,
        eyesClosedDurationMs: durationMs,
        fatigueScore: fatigue,
        yawnDetected: type === 'drowsy' && metrics.isYawning,
        headPitch: metrics.headPitch,
        alarmFired: type === 'asleep',
      };
      localDb.saveEvent(storedEvent).catch((err) => console.warn('Could not save event to DB:', err));

      setDbNotification(type === 'asleep' ? 'Alarme gravado no Banco de Dados' : 'Aviso gravado no Banco de Dados');
      setTimeout(() => setDbNotification(null), 2800);
    }
  }, [currentTripId, metrics.isYawning, metrics.headPitch]);

  // Main Detection Loop
  const runDetectionLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !isMonitoring) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    // If simulating, don't override with camera
    if (activeSimulatedState) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    const now = performance.now();
    const result = visionEngine.processVideoFrame(
      video,
      now,
      settings.eyeSensitivity,
      settings.yawnThreshold
    );

    const m = result.metrics;
    setMetrics(m);
    setLandmarks(result.landmarks);
    setEngineName(result.engineName);

    // Evaluate vigilance state
    const sleepThresholdMs = settings.sleepThresholdSeconds * 1000;
    const drowsyThresholdMs = settings.drowsyThresholdSeconds * 1000;

    if (m.eyesClosedDurationMs >= sleepThresholdMs) {
      // 1. STATE: ASLEEP (DORMINDO) -> CRITICAL ALARM!
      if (driverState !== 'asleep') {
        setDriverState('asleep');
        setIsAlarmOverlayOpen(true);
        logTripEvent('asleep', m.eyesClosedDurationMs, m.fatigueScore);

        // IMMEDIATE ALARM TRIGGER!
        if (!isMuted) {
          audioAlarm.startAlarm(
            settings.soundType,
            settings.volume,
            settings.voiceAlertsEnabled,
            settings.vibrationEnabled
          );
        }
      }
    } else if (
      m.isYawning ||
      (m.eyesClosedDurationMs >= drowsyThresholdMs && m.eyesClosedDurationMs < sleepThresholdMs) ||
      m.headPitch < -14
    ) {
      // 2. STATE: DROWSY (SONOLENTO) -> PREVENTIVE WARNING
      if (driverState !== 'drowsy') {
        setDriverState('drowsy');
        logTripEvent('drowsy', m.eyesClosedDurationMs || 500, m.fatigueScore);
      }

      // Gentle intermittent chime
      const timeSinceLastSound = Date.now() - lastDrowsySoundTime.current;
      if (timeSinceLastSound > 4000 && !isMuted) {
        lastDrowsySoundTime.current = Date.now();
        audioAlarm.playGentleDrowsyChime(settings.volume * 0.7);
      }
    } else {
      // 3. STATE: AWAKE (ACORDADO)
      if (driverState !== 'awake') {
        setDriverState('awake');
        // If coming out of sleep, stop alarm
        if (driverState === 'asleep') {
          audioAlarm.stopAlarm();
          setIsAlarmOverlayOpen(false);
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(runDetectionLoop);
  }, [
    isMonitoring,
    activeSimulatedState,
    settings,
    driverState,
    isMuted,
    logTripEvent,
  ]);

  // Start / Stop Monitoring Handler
  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      // Finalize current trip in IndexedDB
      if (currentTripId) {
        try {
          const existing = await localDb.getTrip(currentTripId);
          if (existing) {
            await localDb.saveTrip({
              ...existing,
              endTime: Date.now(),
              durationSeconds: tripDurationSec,
              totalDrowsyCount: tripSummary.totalDrowsyCount,
              totalAsleepCount: tripSummary.totalAsleepCount,
              averageFatigueScore: metrics.fatigueScore,
              status: 'completed',
            });
          }
          refreshDbCount();
          setDbNotification('Viagem concluída e gravada no Banco de Dados');
          setTimeout(() => setDbNotification(null), 3000);
        } catch (err) {
          console.warn('Error finalizing trip in DB:', err);
        }
      }

      // Stop
      setIsMonitoring(false);
      audioAlarm.stopAlarm();
      wakeLockService.release();
      setWakeLockActive(false);
      stopCameraStream();
      setDriverState('awake');
      setIsAlarmOverlayOpen(false);
      setCurrentTripId(null);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      // Start - Unlock audio context
      audioAlarm.initContext();

      const success = await startCameraStream(settings.facingMode);
      if (success) {
        const newTripId = 'trip_' + Date.now().toString(36);
        const newTrip: StoredTrip = {
          id: newTripId,
          startTime: Date.now(),
          durationSeconds: 0,
          totalDrowsyCount: 0,
          totalAsleepCount: 0,
          averageFatigueScore: 10,
          status: 'in_progress',
        };

        try {
          await localDb.saveTrip(newTrip);
          setCurrentTripId(newTripId);
          refreshDbCount();
          setDbNotification('Nova viagem iniciada no Banco de Dados');
          setTimeout(() => setDbNotification(null), 2500);
        } catch (err) {
          console.warn('Error creating trip in DB:', err);
        }

        setIsMonitoring(true);
        wakeLockService.request().then((active) => setWakeLockActive(active));
      }
    }
  };

  // Run or cancel loop on monitoring state change
  useEffect(() => {
    if (isMonitoring) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isMonitoring, runDetectionLoop]);

  // Dismiss Alarm Action (Driver taps "ESTOU ACORDADO")
  const handleDismissAlarm = () => {
    audioAlarm.stopAlarm();
    setIsAlarmOverlayOpen(false);
    setDriverState('awake');
    setActiveSimulatedState(null);
    visionEngine.resetFatigue();
  };

  // Simulation handler for testing
  const handleSimulateState = (simState: DriverState) => {
    audioAlarm.initContext();
    setActiveSimulatedState(simState);
    setDriverState(simState);

    if (simState === 'asleep') {
      setIsAlarmOverlayOpen(true);
      setMetrics((prev) => ({
        ...prev,
        averageEyeOpen: 0.05,
        leftEyeOpen: 0.05,
        rightEyeOpen: 0.05,
        eyesClosedDurationMs: settings.sleepThresholdSeconds * 1000 + 400,
        isBlinking: false,
        faceDetected: true,
      }));
      if (!isMuted) {
        audioAlarm.startAlarm(
          settings.soundType,
          settings.volume,
          settings.voiceAlertsEnabled,
          settings.vibrationEnabled
        );
      }
    } else if (simState === 'drowsy') {
      audioAlarm.stopAlarm();
      setIsAlarmOverlayOpen(false);
      setMetrics((prev) => ({
        ...prev,
        averageEyeOpen: 0.35,
        leftEyeOpen: 0.35,
        rightEyeOpen: 0.35,
        yawnScore: 0.85,
        isYawning: true,
        eyesClosedDurationMs: 650,
        faceDetected: true,
      }));
      if (!isMuted) {
        audioAlarm.playGentleDrowsyChime(settings.volume * 0.7);
      }
    } else {
      audioAlarm.stopAlarm();
      setIsAlarmOverlayOpen(false);
      setMetrics((prev) => ({
        ...prev,
        averageEyeOpen: 0.9,
        leftEyeOpen: 0.9,
        rightEyeOpen: 0.9,
        yawnScore: 0.1,
        isYawning: false,
        eyesClosedDurationMs: 0,
        faceDetected: true,
      }));
    }
  };

  const handleClearSimulation = () => {
    setActiveSimulatedState(null);
    audioAlarm.stopAlarm();
    setIsAlarmOverlayOpen(false);
  };

  return (
    <div
      className={`min-h-screen text-slate-100 flex flex-col font-sans transition-colors ${
        settings.nightModeHUD ? 'bg-black' : 'bg-slate-950'
      }`}
    >
      {/* Render either Simplified Driver Cockpit or Advanced Telemetry Dashboard */}
      {viewMode === 'simplified' ? (
        <SimplifiedDriverView
          isMonitoring={isMonitoring}
          driverState={driverState}
          metrics={metrics}
          tripDurationSec={tripDurationSec}
          isMuted={isMuted}
          onToggleMonitoring={handleToggleMonitoring}
          onToggleMute={() => {
            setIsMuted(!isMuted);
            if (!isMuted && audioAlarm.isPlaying()) {
              audioAlarm.stopAlarm();
            }
          }}
          onDismissAlarm={handleDismissAlarm}
          onOpenTips={() => setIsTipsOpen(true)}
          onOpenDatabase={() => setIsDatabaseOpen(true)}
          onSwitchToAdvanced={() => setViewMode('advanced')}
          videoRef={videoRef}
          settings={settings}
          onUpdateSettings={(newVals) => setSettings((prev) => ({ ...prev, ...newVals }))}
          dbTripCount={dbTripCount}
        />
      ) : (
        <>
          {/* Cockpit Header */}
          <CockpitHeader
            isMonitoring={isMonitoring}
            driverState={driverState}
            tripDurationSec={tripDurationSec}
            isMuted={isMuted}
            onToggleMute={() => {
              setIsMuted(!isMuted);
              if (!isMuted && audioAlarm.isPlaying()) {
                audioAlarm.stopAlarm();
              }
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenStats={() => setIsStatsOpen(true)}
            onOpenTips={() => setIsTipsOpen(true)}
            onOpenDatabase={() => setIsDatabaseOpen(true)}
            dbTripCount={dbTripCount}
            isNightMode={settings.nightModeHUD}
            onToggleNightMode={() =>
              setSettings((prev) => ({ ...prev, nightModeHUD: !prev.nightModeHUD }))
            }
            viewMode={viewMode}
            onToggleViewMode={() => setViewMode('simplified')}
          />

          {/* Main Cockpit Container (Central de Comando PC) */}
          <main className="flex-1 max-w-[1520px] w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
            {/* Top Telemetry Station Bar (Unboxed clean metadata, zero-pill discipline) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl select-none shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-white uppercase tracking-wider text-sm font-mono">
                      Central de Telemetria & Sentinela
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400 font-mono text-xs">Modo PC</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-emerald-400 font-mono text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Rasa NLU Ativo
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Estação industrial de alta densidade: visão computacional, calibração biométrica e Copiloto Rasa lado a lado.
                  </p>
                </div>
              </div>

              {/* Top Station Action Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMonitoring}
                  className={`px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
                    isMonitoring
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-950/40'
                  }`}
                >
                  {isMonitoring ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      <span>Interromper</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Iniciar Sentinela</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setViewMode('simplified')}
                  title="Alternar para o Modo Mobile para uso com smartphone fixado no painel do carro"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">📱 Modo Mobile</span>
                </button>
              </div>
            </div>

            {/* State Status Banner (Giant Dynamic Automotive Indicator) */}
            <StatusBanner
              driverState={driverState}
              metrics={metrics}
              isMonitoring={isMonitoring}
              sleepThresholdSec={settings.sleepThresholdSeconds}
            />

            {/* Main Command Workstation: 2 Colunas Paralelas (Deck Visual & Calibração à Esquerda vs Copiloto IA à Direita) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Coluna da Esquerda (7 de 12 colunas no desktop): Câmera + Gauges + Calibração + Dicas */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Live Camera View with AR Facial Landmarker Overlay */}
                <CameraFeed
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  isMonitoring={isMonitoring}
                  metrics={metrics}
                  landmarks={landmarks}
                  cameraError={cameraError}
                  onRetryCamera={() => startCameraStream(settings.facingMode)}
                  onSwitchCamera={handleSwitchCamera}
                  facingMode={settings.facingMode}
                  engineName={engineName}
                  isNightModeHUD={settings.nightModeHUD}
                />

                {/* Fatigue & Eye Aperture Gauges (Desktop 4-Col) */}
                <FatigueGauge
                  metrics={metrics}
                  sleepThresholdSec={settings.sleepThresholdSeconds}
                />

                {/* Primary Monitoring Big Touchpad for Desktop */}
                <button
                  onClick={handleToggleMonitoring}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-[0.98] ${
                    isMonitoring
                      ? 'bg-rose-950/60 border border-rose-600/50 hover:bg-rose-900/60 text-rose-200'
                      : 'bg-emerald-950/60 border border-emerald-600/50 hover:bg-emerald-900/60 text-emerald-200 font-black'
                  }`}
                >
                  {isMonitoring ? (
                    <>
                      <Square className="w-4 h-4 fill-current text-rose-400" />
                      Interromper Monitoramento da Câmera
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current text-emerald-400" />
                      Ativar Vigilância de Sono ao Vivo
                    </>
                  )}
                </button>

                {/* Interactive Calibration & State Simulator */}
                <SimulatorBar
                  onSimulateState={handleSimulateState}
                  activeSimulatedState={activeSimulatedState}
                  onClearSimulation={handleClearSimulation}
                  soundType={settings.soundType}
                  volume={settings.volume}
                />

                {/* Informational Guidance Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-400">
                  <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-start gap-2.5">
                    <Eye className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200 block mb-0.5">1. Acordado</span>
                      Olhos abertos (150-300ms). Vigília verde silenciosa.
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-start gap-2.5">
                    <Coffee className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200 block mb-0.5">2. Sonolento</span>
                      Bocejos e piscadas lentas acionam aviso preventivo.
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200 block mb-0.5">3. Dormindo</span>
                      Olhos fechados por {settings.sleepThresholdSeconds}s disparam a sirene contínua.
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna da Direita (5 de 12 colunas no desktop): Terminal Copiloto IA em Posição Vertical Sticky */}
              <div className="lg:col-span-5 lg:sticky lg:top-4">
                <AiChatbot
                  metrics={metrics}
                  tripSummary={tripSummary}
                  tripDurationSec={tripDurationSec}
                  currentTripId={currentTripId}
                  className="h-[740px] lg:h-[calc(100vh-160px)] min-h-[640px] max-h-[880px]"
                />
              </div>
            </div>
          </main>
        </>
      )}

      {/* Emergency Full-Screen Alarm Overlay (Immediate Awakening) */}
      <AlarmOverlay
        isOpen={isAlarmOverlayOpen}
        metrics={metrics}
        onDismiss={handleDismissAlarm}
        onOpenTips={() => setIsTipsOpen(true)}
        sleepThresholdSec={settings.sleepThresholdSeconds}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newVals) => setSettings((prev) => ({ ...prev, ...newVals }))}
        wakeLockActive={wakeLockActive}
      />

      {/* Trip Statistics Modal */}
      <TripStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        tripSummary={tripSummary}
        tripDurationSec={tripDurationSec}
        onClearStats={() => {
          setTripSummary({
            startTime: Date.now(),
            totalDrowsyCount: 0,
            totalAsleepCount: 0,
            events: [],
          });
        }}
      />

      {/* Safety Tips Drawer */}
      <SafetyTipsDrawer isOpen={isTipsOpen} onClose={() => setIsTipsOpen(false)} />

      {/* Database Trips & Profile Modal */}
      <DatabaseModal
        isOpen={isDatabaseOpen}
        onClose={() => {
          setIsDatabaseOpen(false);
          refreshDbCount();
        }}
        currentTripId={currentTripId}
      />
    </div>
  );
}
