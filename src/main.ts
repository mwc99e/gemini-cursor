import { app, BrowserWindow, Tray, Menu } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { CursorMovement } from "./cursor-movement";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let cursorMovement: CursorMovement | null = null;

const createWindow = () => {
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
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false,
    },
  });

  // Make the window click-through
  mainWindow.setIgnoreMouseEvents(true);

  // Load the index.html
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Initialize cursor movement
  cursorMovement = new CursorMovement(mainWindow);

  // Create Tray
  const iconPath = path.join(app.getAppPath(), "resources", "gemini-logo.png");
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Move Right",
      type: "normal",
      click: () => {
        cursorMovement?.moveRight();
      },
    },
    {
      label: "Quit",
      type: "normal",
      click: () => {
        cursorMovement?.cleanup();
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
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }

  cursorMovement?.cleanup();
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
