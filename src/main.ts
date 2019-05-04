import { app, BrowserWindow, globalShortcut, ipcMain, Menu, MenuItemConstructorOptions, shell, Tray } from 'electron';
import * as path from 'path';
import { editCharacterChannel, saveCharacterChannel } from './constants';
import { UnicodeCharacter } from './models';

const isMac = (process.platform === 'darwin');

/**
 * Selection made window flashes a confirmation message
 * Turned off for now because it delays the user's focus being returned to previous application
 */
const showSelectionMade = false;

let mainWindow: Electron.BrowserWindow;
let selectionMadeWindow: Electron.BrowserWindow;
let tray: Tray;
let quitting = false;

function createWindow() {
  if (showSelectionMade) {
    selectionMadeWindow = new BrowserWindow({
      frame: false,
      height: 250,
      show: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: true
      },
      width: 500
    });
    selectionMadeWindow.loadFile(path.join(__dirname, 'selection-made.html'));
  }

  mainWindow = new BrowserWindow({
    frame: false,
    height: 400,
    icon: path.join(__dirname, 'assets', 'speedy.ico'),
    webPreferences: {
      nodeIntegration: true
    },
    width: 500
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // mainWindow.webContents.openDevTools();

  mainWindow.on('close', event => {
    try {
      if (quitting) {
        mainWindow = null;
      } else {
        event.preventDefault();
        mainWindow.hide();
        if (isMac) {
          app.dock.hide();
        }
      }
    } catch (error) {
      console.error('quitting error');
      console.error(error);
    }
  });

  createAppMenu();

  app.on('before-quit', () => {
    try {
      quitting = true;
      globalShortcut.unregisterAll();
      tray.destroy();
    } catch (error) {
      console.error(error);
    }
  });
}

function createAppMenu() {
  const template = [
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'forcereload', label: 'Refresh' },
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click() { shell.openExternal('https://github.com/fotijr/speedy-unicode'); }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
}

function createEditWindow(): Electron.BrowserWindow {
  const editCharacterWindow = new BrowserWindow({
    frame: true,
    height: 400,
    modal: true,
    show: false,
    title: 'Edit Character',
    webPreferences: {
      nodeIntegration: true
    },
    width: 375
  });
  editCharacterWindow.loadFile(path.join(__dirname, 'edit-character.html'));
  // editCharacterWindow.webContents.openDevTools();
  return editCharacterWindow;
}

function editCharacter(character: UnicodeCharacter) {
  const editWindow = createEditWindow();
  editWindow.webContents.once('dom-ready', () => {
    editWindow.webContents.send(editCharacterChannel, character);
    editWindow.show();
    showDockIcon();
  });
}

function addCharacter() {
  editCharacter({ name: '', value: '', number: '', lastSelected: 0, userDefined: true });
}

ipcMain.on(editCharacterChannel, (event: any, character: UnicodeCharacter) => {
  editCharacter(character);
});

ipcMain.on(saveCharacterChannel, (event: any, selection: UnicodeCharacter) => {
  mainWindow.webContents.send(saveCharacterChannel, selection);
});

if (showSelectionMade) {
  ipcMain.on('selection-made', (event: any, selection: UnicodeCharacter) => {
    selectionMadeWindow.webContents.send('selection-made', selection);
    selectionMadeWindow.show();
    setTimeout(() => {
      selectionMadeWindow.hide();
      app.hide();
    }, 300);
  });
}

function createTrayIcon() {
  try {
    tray = new Tray(path.join(__dirname, 'assets', 'speedy-22.png'));
    const exitText = (isMac) ? 'Quit' : 'Exit';
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Speedy Unicode', type: 'normal', click: showApp },
      { label: 'Add custom character', type: 'normal', click: addCharacter },
      { label: exitText, type: 'normal', click: () => app.quit() }
    ]);
    tray.setToolTip('Speedy Unicode');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', showApp);
  } catch (error) {
    console.error('Error setting up tray icon', error);
  }
}

app.on('ready', () => {
  createWindow();
  createTrayIcon();
  globalShortcut.register('CommandOrControl+Shift+X', showApp);
});

app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (!isMac) {
    app.quit();
  }
});

function showDockIcon() {
  if (isMac) {
    app.dock.show();
  }
}

function showApp() {
  if (mainWindow === null) {
    createWindow();
  } else {
    app.show();
    // toggling visible on all workspaces ensures speedy opens on the active desktop/monitor
    mainWindow.setVisibleOnAllWorkspaces(true);
    mainWindow.show();
    mainWindow.restore();
    mainWindow.setVisibleOnAllWorkspaces(false);
    showDockIcon();
  }
}

app.on('activate', showApp);
