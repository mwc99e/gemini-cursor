import React, { useRef, useState } from "react";
import "@/apps/controls/styles/control.css";
import { LiveAPIProvider } from "@/apps/controls/contexts/LiveAPIContext";
import cn from "classnames";
import ControlTray from "@/apps/controls/components/control-tray/ControlTray";
import SidePanel from "@/apps/controls/components/side-panel/SidePanel";
// import { Altair } from "@/apps/controls/components/altair/Altair";

// Add TypeScript declaration for the window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      moveRight: () => void;
    };
  }
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set VITE_GEMINI_API_KEY in .env");
}

const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

const Control: React.FC = () => {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  console.log("videoStream", videoStream);

  const handleMoveRight = () => {
    window.electronAPI.moveRight();
  };

  return (
    <div className="App">
      <LiveAPIProvider url={uri} apiKey={API_KEY}>
        <div className="streaming-console">
          <SidePanel />
          <main>
            <div className="main-app-area">
              {/* APP goes here */}
              {/* <Altair /> */}
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
            >
              {/* put your own buttons here */}
            </ControlTray>
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );

  return (
    <div className="container">
      <LiveAPIProvider url={uri} apiKey={API_KEY}>
        <h1>Gemini Controls</h1>
        <button className="control-button" onClick={handleMoveRight}>
          Move Right
        </button>

        <video
          className={cn("stream", {
            hidden: !videoRef.current || !videoStream,
          })}
          ref={videoRef}
          autoPlay
          playsInline
        />

        <ControlTray
          videoRef={videoRef}
          supportsVideo={true}
          onVideoStreamChange={setVideoStream}
        >
          {/* put your own buttons here */}
        </ControlTray>
      </LiveAPIProvider>
    </div>
  );
};

export default Control;
