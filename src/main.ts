import { app, BrowserWindow, Tray, Menu, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { CursorController } from "./cursor-controller";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let controlWindow: BrowserWindow | null = null;
let cursorController: CursorController | null = null;

const createControlWindow = () => {
  controlWindow = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    controlWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/control.html`);
  } else {
    controlWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/control.html`)
    );
  }
};

const createCursorWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 24, // Small window for the cursor
    height: 24,
    frame: false,
    backgroundColor: "#D96570",
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    },
  });

  // Make the window click-through
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Load the index.html
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/cursor.html`);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/cursor.html`)
    );
  }

  // Initialize cursor controller
  cursorController = new CursorController(mainWindow);

  // Create Tray
  const iconPath = path.join(app.getAppPath(), "resources", "gemini-logo.png");
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Controls",
      type: "normal",
      click: () => {
        controlWindow?.show();
      },
    },
    {
      label: "Move Right",
      type: "normal",
      click: () => {
        cursorController?.moveRight();
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ipcMain.on("move-right", () => {
    cursorController?.moveRight();
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
  if (mainWindow) {
    mainWindow.destroy();
    mainWindow = null;
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
