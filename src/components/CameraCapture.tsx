import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (blob: Blob, dataUrl: string) => void;
  onCancel?: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize camera stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      try {
        setLoading(true);
        setCameraError(null);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraError('Camera access failed. Please grant permission or check your webcam connection.');
      } finally {
        setLoading(false);
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Attach stream to video element whenever stream or captured state changes
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream, capturedDataUrl]);

  // Take Snapshot using Canvas
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw frame to canvas mirrored to match the live video preview angle
    context.save();
    context.scale(-1, 1);
    context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    context.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedDataUrl(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
        }
      },
      'image/jpeg',
      0.85
    );
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    setCapturedBlob(null);
  };

  const handleConfirm = () => {
    if (capturedBlob && capturedDataUrl) {
      onCapture(capturedBlob, capturedDataUrl);
    }
  };

  return (
    <div className="w-full bg-white/90 rounded-2xl border border-slate-200 p-4 sm:p-5 relative overflow-hidden shadow-sm">
      {/* Hidden Canvas for Canvas Snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900">Verification Selfie Snapshot</h3>
        </div>
        {stream && !capturedDataUrl && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Camera Active
          </span>
        )}
      </div>

      {/* Main Video Viewport or Captured Frame */}
      <div className="relative aspect-[4/3] w-full max-w-sm mx-auto bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
        {cameraError ? (
          <div className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-xs text-rose-600 mb-3">{cameraError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Retry Camera
            </button>
          </div>
        ) : (
          <>
            {/* Snapshot Preview */}
            {capturedDataUrl && (
              <div className="relative w-full h-full">
                <img
                  src={capturedDataUrl}
                  alt="Selfie snapshot"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/90 to-transparent p-3 text-center">
                  <span className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Snapshot Ready for Upload
                  </span>
                </div>
              </div>
            )}

            {/* Live Video Stream (kept in DOM so retaking never shows black screen) */}
            <div className={`relative w-full h-full ${capturedDataUrl ? 'hidden' : 'block'}`}>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-500 text-xs gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  Initializing Camera...
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              {/* Guide overlay */}
              <div className="absolute inset-0 border-2 border-dashed border-indigo-400/30 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-[10px] uppercase tracking-widest text-indigo-700/80 font-semibold bg-white/60 px-2 py-1 rounded">
                  Position Face Here
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center justify-center gap-3">
        {capturedDataUrl ? (
          <>
            <button
              type="button"
              onClick={handleRetake}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retake Photo
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Confirm Photo
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!stream || Boolean(cameraError)}
            onClick={takeSnapshot}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Snap Selfie</span>
          </button>
        )}
      </div>
    </div>
  );
};
