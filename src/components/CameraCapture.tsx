import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertCircle, Sparkles, X } from 'lucide-react';

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
    if (capturedDataUrl) {
      if (capturedBlob) {
        onCapture(capturedBlob, capturedDataUrl);
      } else {
        fetch(capturedDataUrl)
          .then((r) => r.blob())
          .then((b) => onCapture(b, capturedDataUrl))
          .catch(() => onCapture(new Blob(), capturedDataUrl));
      }
    }
  };

  return (
    <div className="w-full bg-white/95 rounded-3xl border border-slate-200/80 p-5 sm:p-6 relative overflow-hidden shadow-md">
      {/* Hidden Canvas for Canvas Snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Live Verification Camera</h3>
            <p className="text-xs text-slate-500">Capture clear face snapshot for punch</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stream && !capturedDataUrl && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Camera Active
            </span>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              title="Close Camera"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Video Viewport or Captured Frame */}
      <div className="relative aspect-[4/3] w-full max-w-sm mx-auto bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-200/90 shadow-lg flex items-center justify-center">
        {cameraError ? (
          <div className="p-5 text-center bg-white w-full h-full flex flex-col items-center justify-center">
            <AlertCircle className="w-9 h-9 text-rose-500 mx-auto mb-2" />
            <p className="text-xs text-rose-600 mb-3 max-w-xs">{cameraError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl transition-colors shadow-sm"
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
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-3 text-center">
                  <span className="text-xs text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Snapshot Ready to Submit
                  </span>
                </div>
              </div>
            )}

            {/* Live Video Stream */}
            <div className={`relative w-full h-full ${capturedDataUrl ? 'hidden' : 'block'}`}>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-300 text-xs gap-2">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  Starting Camera...
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              {/* Biometric Face Target Reticle */}
              <div className="absolute inset-6 border-2 border-dashed border-amber-400/50 rounded-3xl pointer-events-none flex items-center justify-center">
                <span className="text-[10px] uppercase tracking-widest text-white font-extrabold bg-slate-950/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                  Align Face Inside
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex items-center justify-center gap-3">
        {capturedDataUrl ? (
          <>
            <button
              type="button"
              onClick={handleRetake}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retake
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="btn-tactile px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-extrabold rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm Photo
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!stream || Boolean(cameraError)}
            onClick={takeSnapshot}
            className="btn-tactile px-7 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 text-xs font-black rounded-2xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Capture Snapshot</span>
          </button>
        )}
      </div>
    </div>
  );
};
