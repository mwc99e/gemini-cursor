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
  dialog,
  systemPreferences,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import started from "electron-squirrel-startup";
import { CursorController } from "@/apps/cursor/controller";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let tray: Tray | null = null;
let cursorWindow: BrowserWindow | null = null;
let controlWindow: BrowserWindow | null = null;
let cursorController: CursorController | null = null;

// Store granted permissions in memory and persist them
const grantedPermissions = new Set<string>();

// Load persisted permissions
const loadPersistedPermissions = () => {
  const userDataPath = app.getPath("userData");
  const permissionsPath = path.join(userDataPath, "permissions.json");

  try {
    if (fs.existsSync(permissionsPath)) {
      const data = JSON.parse(fs.readFileSync(permissionsPath, "utf-8"));
      data.permissions.forEach((p: string) => grantedPermissions.add(p));
    }
  } catch (error) {
    console.error("Error loading permissions:", error);
  }
};

// Save permissions to disk
const savePermissions = () => {
  const userDataPath = app.getPath("userData");
  const permissionsPath = path.join(userDataPath, "permissions.json");

  try {
    fs.writeFileSync(
      permissionsPath,
      JSON.stringify({ permissions: Array.from(grantedPermissions) }),
      "utf-8"
    );
  } catch (error) {
    console.error("Error saving permissions:", error);
  }
};

const checkSystemPermission = (permission: string) => {
  if (process.platform === "darwin") {
    if (
      permission === "screen" ||
      permission === "desktopCapture" ||
      permission === "display-capture"
    ) {
      return systemPreferences.getMediaAccessStatus("screen") === "granted";
    }
    if (permission === "media") {
      return (
        systemPreferences.getMediaAccessStatus("camera") === "granted" ||
        systemPreferences.getMediaAccessStatus("microphone") === "granted"
      );
    }
  }
  return false;
};

const requestAppPermissions = async (window: BrowserWindow) => {
  try {
    // Set up a single permission request handler for the window
    window.webContents.session.setPermissionRequestHandler(
      async (webContents, permission, callback, details) => {
        const allowedPermissions = [
          "media",
          "display-capture",
          "screen",
          "desktopCapture",
        ] as const;

        // Check if this is a supported permission type
        if (
          allowedPermissions.includes(
            permission as (typeof allowedPermissions)[number]
          )
        ) {
          // First check system level permissions
          if (checkSystemPermission(permission)) {
            grantedPermissions.add(permission);
            savePermissions();
            callback(true);
            return;
          }

          // Then check our stored permissions
          if (grantedPermissions.has(permission)) {
            callback(true);
            return;
          }

          // Show a permission request dialog to the user
          const { response } = await dialog.showMessageBox(window, {
            type: "question",
            buttons: ["Allow", "Deny"],
            defaultId: 0,
            title: "Permission Request",
            message: `This app needs ${permission} permission to function properly.`,
            detail: "Please allow access to continue using the app.",
          });

          const isGranted = response === 0;

          // Store the permission choice if granted
          if (isGranted) {
            grantedPermissions.add(permission);
            savePermissions();
          }

          callback(isGranted);
        } else {
          callback(false);
        }
      }
    );

    // Set up permission check handler to be consistent with request handler
    window.webContents.session.setPermissionCheckHandler(
      (webContents, permission) => {
        const allowedPermissions = [
          "media",
          "display-capture",
          "screen",
          "desktopCapture",
        ] as const;

        // Check both system and stored permissions
        return (
          allowedPermissions.includes(
            permission as (typeof allowedPermissions)[number]
          ) &&
          (checkSystemPermission(permission) ||
            grantedPermissions.has(permission))
        );
      }
    );
  } catch (error) {
    console.error("Error requesting permissions:", error);
  }
};

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
    if (controlWindow) {
      requestAppPermissions(controlWindow);
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

  // Create Tray
  let iconPath: string;
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    iconPath = path.join(process.cwd(), "resources", "white-logo.png");
  } else {
    // Try multiple possible locations
    const possiblePaths = [
      path.join(process.resourcesPath, "white-logo.png"),
      path.join(app.getAppPath(), "..", "white-logo.png"),
      path.join(app.getAppPath(), "resources", "white-logo.png"),
    ];

    iconPath =
      possiblePaths.find((p) => {
        try {
          return fs.existsSync(p);
        } catch {
          return false;
        }
      }) || possiblePaths[0];
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
  // Load persisted permissions at startup
  loadPersistedPermissions();

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
