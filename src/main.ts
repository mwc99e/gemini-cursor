import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  session,
  desktopCapturer,
  nativeImage,
  shell,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import started from "electron-squirrel-startup";
import { CursorController } from "@/apps/cursor/controller";
import { PermissionManager } from "@/permissions";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let tray: Tray | null = null;
let cursorWindow: BrowserWindow | null = null;
let controlWindow: BrowserWindow | null = null;
let cursorController: CursorController | null = null;
let permissionManager: PermissionManager | null = null;

const createControlWindow = () => {
  controlWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      // Enable screen capture and WebRTC features
      webSecurity: true,
      sandbox: false,
    },
  });

  // Request permissions when window is ready
  controlWindow.webContents.on("did-finish-load", () => {
    if (controlWindow && permissionManager) {
      permissionManager.requestAppPermissions(controlWindow);
    }
  });

  // Handle external links
  controlWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // Set additional required permissions
  controlWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' wss://generativelanguage.googleapis.com ws://generativelanguage.googleapis.com https://generativelanguage.googleapis.com; media-src 'self' mediastream: blob: data:; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline' blob:;",
          ],
        },
      });
    }
  );

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    controlWindow.loadURL(
      `${MAIN_WINDOW_VITE_DEV_SERVER_URL}/src/apps/controls/index.html`
    );
  } else {
    controlWindow.loadFile(
      path.join(
        __dirname,
        `../renderer/${MAIN_WINDOW_VITE_NAME}/src/apps/controls/index.html`
      )
    );
  }
};

const createCursorWindow = () => {
  cursorWindow = new BrowserWindow({
    width: 24,
    height: 24,
    frame: false,
    backgroundColor: "#D96570",
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    transparent: true,
    fullscreenable: false,
    skipTaskbar: true,
    roundedCorners: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    },
  });

  // Make the window click-through and prevent it from accepting focus
  cursorWindow.setIgnoreMouseEvents(true, { forward: true });
  cursorWindow.setFocusable(false);

  // Load the index.html
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    cursorWindow.loadURL(
      `${MAIN_WINDOW_VITE_DEV_SERVER_URL}/src/apps/cursor/index.html`
    );
  } else {
    cursorWindow.loadFile(
      path.join(
        __dirname,
        `../renderer/${MAIN_WINDOW_VITE_NAME}/src/apps/cursor/index.html`
      )
    );
  }

  // Initialize cursor controller
  cursorController = new CursorController(cursorWindow);
};

const createTray = () => {
  let iconPath: string;
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    iconPath = path.join(process.cwd(), "resources", "white-logo.png");
  } else {
    iconPath = path.join(process.resourcesPath, "white-logo.png");
  }

  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 20, height: 20 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Controls",
      type: "normal",
      click: () => {
        controlWindow?.show();
      },
    },
    {
      label: "Quit",
      type: "normal",
      click: () => {
        cursorController?.cleanup();
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Gemini Cursor");
  tray.setContextMenu(contextMenu);
};

// Before app.whenReady()
app.commandLine.appendSwitch("enable-features", "WebRTCPipeWireCapturer");

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Initialize permission manager
  permissionManager = new PermissionManager();

  // Set up display media request handler
  session.defaultSession.setDisplayMediaRequestHandler(
    async (request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ["screen"],
          thumbnailSize: { width: 0, height: 0 },
        });

        if (sources.length > 0) {
          callback({
            video: sources[0],
            audio: null,
          });
        } else {
          callback(null);
        }
      } catch (error) {
        console.error("Error getting screen sources:", error);
        callback(null);
      }
    }
  );

  ipcMain.on("move-cursor", (event, x: number, y: number) => {
    cursorController?.moveTo(x, y);
  });

  createTray();
  createCursorWindow();
  createControlWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  cursorController?.cleanup();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Add a before-quit handler to ensure proper cleanup
app.on("before-quit", () => {
  cursorController?.cleanup();

  // Destroy windows explicitly
  if (cursorWindow) {
    cursorWindow.destroy();
    cursorWindow = null;
  }

  if (controlWindow) {
    controlWindow.destroy();
    controlWindow = null;
  }

  if (tray) {
    tray.destroy();
    tray = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createCursorWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
