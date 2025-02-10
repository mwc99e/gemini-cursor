import React, { useRef, useState, useEffect } from "react";
import "@/apps/controls/index.css";
import { LiveAPIProvider } from "@/apps/controls/contexts/LiveAPIContext";
import cn from "classnames";
import ControlTray from "@/apps/controls/components/control-tray/ControlTray";
import SidePanel from "@/apps/controls/components/side-panel/SidePanel";
import CursorControl from "@/apps/controls/components/CursorControl";
import geminiLogo from "../../../../resources/gemini-logo.svg";

// Add TypeScript declaration for the window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      moveCursor: (x: number, y: number) => void;
    };
  }
}

interface ImportMetaEnv {
  PROD: boolean;
}

interface ImportMeta {
  env: ImportMetaEnv;
}

const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;
const apiKeyStorageKey = "geminiApiKey";

const App = () => {
  const [apiKey, setApiKey] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [lastCapturedFrame, setLastCapturedFrame] = useState<string | null>(
    null
  );

  useEffect(() => {
    const savedApiKey = localStorage.getItem(apiKeyStorageKey);
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem(apiKeyStorageKey, apiKey);
    }
  };

  return (
    <div className="App">
      <LiveAPIProvider url={uri} apiKey={apiKey}>
        <div className="streaming-console">
          <SidePanel />
          <main>
            <div className="api-key-form-container">
              <div className="header-container">
                <div className="app-title-container">
                  <img
                    src={geminiLogo}
                    alt="Gemini Logo"
                    className="gemini-logo"
                  />

                  <h1 className="app-title">Gemini Cursor</h1>
                </div>

                <p>
                  Made with ✨️ by{" "}
                  <a
                    href="https://x.com/27upon2"
                    target="_system"
                    rel="noopener noreferrer"
                  >
                    @27upon2
                  </a>
                </p>
              </div>

              <div className="api-key-form">
                <form onSubmit={handleApiKeySubmit}>
                  <label htmlFor="api-key">Gemini API Key</label>
                  <div>
                    <input
                      id="api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your API key"
                    />
                    <button type="submit">Update</button>
                  </div>
                </form>
              </div>
            </div>

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
              hasApiKey={!!apiKey.trim()}
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
