import React, { useRef, useState } from "react";
import "@/apps/controls/index.css";
import { LiveAPIProvider } from "@/apps/controls/contexts/LiveAPIContext";
import cn from "classnames";
import ControlTray from "@/apps/controls/components/control-tray/ControlTray";
import SidePanel from "@/apps/controls/components/side-panel/SidePanel";
import CursorControl from "@/apps/controls/components/CursorControl";

// Add TypeScript declaration for the window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      moveCursor: (x: number, y: number) => void;
    };
  }
}

// @ts-expect-error import.meta.env is injected by Vite
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set VITE_GEMINI_API_KEY in .env");
}

const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

const App = () => {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [lastCapturedFrame, setLastCapturedFrame] = useState<string | null>(
    null
  );

  return (
    <div className="App">
      <LiveAPIProvider url={uri} apiKey={API_KEY}>
        <div className="streaming-console">
          <SidePanel />
          <main>
            <div className="main-app-area">
              <CursorControl lastCapturedFrame={lastCapturedFrame} />

              <video
                className={cn("stream", {
                  hidden: !videoRef.current || !videoStream,
                })}
                ref={videoRef}
                autoPlay
                playsInline
              />
            </div>

            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
              onFrameCapture={setLastCapturedFrame}
            >
              {/* put your own buttons here */}
            </ControlTray>
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
};

export default App;
