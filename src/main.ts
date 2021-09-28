import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  shell,
  Tray,
  ipcMain as icp,
  screen,
} from 'electron';
import * as path from 'path';
import { IcpChannels } from './constants';
import { UnicodeCharacter } from './models';
import { UnicodeStore } from './store/unicode-store';

const unicodeStore = new UnicodeStore();
const isMac = process.platform === 'darwin';

/**
 * Selection made window flashes a confirmation message
 * Turned off for now because it delays the user's focus being returned to previous application
 */
const showSelectionMade = false;

const showDevTools = false;

let mainWindow: Electron.BrowserWindow;
let selectionMadeWindow: Electron.BrowserWindow;
let tray: Tray;
let quitting = false;

const webPreferences = {
  nodeIntegration: true, // Changed
  enableRemoteModule: true,
  contextIsolation: false, // Changed
};

const loadUnicode = async () => {
  const characters = await unicodeStore.loadData();
  mainWindow.webContents.send(IcpChannels.unicdoesLoaded, characters);
};

icp.on(IcpChannels.loadUnicodes, () => {
  void loadUnicode();
});

icp.on(
  IcpChannels.saveCharacter,
  async (event: any, editCharacter: UnicodeCharacter) => {
    await unicodeStore.saveUserDefinedCharacter(editCharacter);
    void loadUnicode();
  }
);

const createWindow = () => {
  if (showSelectionMade) {
    selectionMadeWindow = new BrowserWindow({
      webPreferences,
      frame: false,
      height: 250,
      show: false,
      transparent: true,
      width: 500,
    });
    void selectionMadeWindow.loadFile(
      path.join(__dirname, 'selection-made.html')
    );
  }

  mainWindow = new BrowserWindow({
    webPreferences,
    frame: false,
    height: 500,
    icon: path.join(__dirname, 'assets', 'speedy.ico'),
    width: 800,
  });
  void mainWindow.loadFile(path.join(__dirname, 'index.html'));
  if (showDevTools) {
    mainWindow.webContents.openDevTools();
  }
  const mainPosition = mainWindow.getBounds();
  const activeScreen = screen.getDisplayNearestPoint({
    x: mainPosition.x,
    y: mainPosition.y,
  });
  mainWindow.setSize(
    Math.min(activeScreen.bounds.width * 0.8, 1000),
    Math.min(activeScreen.bounds.height * 0.8, 500)
  );

  mainWindow.on('close', (event) => {
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
};

const createAppMenu = () => {
  const template = [
    ...(isMac
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'forcereload', label: 'Refresh' },
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: () => {
            void shell.openExternal('https://github.com/fotijr/speedy-unicode');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
};

const createEditWindow: () => Electron.BrowserWindow = () => {
  const editCharacterWindow = new BrowserWindow({
    webPreferences,
    frame: true,
    height: 400,
    modal: true,
    show: false,
    title: 'Edit Character',
    width: 375,
  });
  void editCharacterWindow.loadFile(
    path.join(__dirname, 'edit-character.html')
  );
  if (showDevTools) {
    editCharacterWindow.webContents.openDevTools();
  }
  return editCharacterWindow;
};

const editCharacter = (character: UnicodeCharacter) => {
  const editWindow = createEditWindow();
  editWindow.webContents.once('dom-ready', () => {
    editWindow.webContents.send(IcpChannels.editCharacter, character);
    editWindow.show();
    showDockIcon();
  });
};

const addCharacter = () => {
  editCharacter({
    name: '',
    value: '',
    code: '',
    lastSelected: 0,
    userDefined: true,
  });
};

ipcMain.on(
  IcpChannels.editCharacter,
  (event: any, character: UnicodeCharacter) => {
    editCharacter(character);
  }
);

ipcMain.on(
  IcpChannels.saveCharacter,
  (event: any, selection: UnicodeCharacter) => {
    mainWindow.webContents.send(IcpChannels.saveCharacter, selection);
  }
);

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

const createTrayIcon = () => {
  try {
    tray = new Tray(path.join(__dirname, 'assets', 'speedy-22.png'));
    const exitText = isMac ? 'Quit' : 'Exit';
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Speedy Unicode', type: 'normal', click: showApp },
      { label: 'Add custom character', type: 'normal', click: addCharacter },
      { label: exitText, type: 'normal', click: () => app.quit() },
    ]);
    tray.setToolTip('Speedy Unicode');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', showApp);
  } catch (error) {
    console.error('Error setting up tray icon', error);
  }
};

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

const showDockIcon = () => {
  if (isMac) {
    void app.dock.show();
  }
};

const showApp = () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    // toggling visible on all workspaces ensures speedy opens on the active desktop/monitor
    mainWindow.setVisibleOnAllWorkspaces(true);
    mainWindow.show();
    mainWindow.restore();
    mainWindow.setVisibleOnAllWorkspaces(false);
    showDockIcon();
  }
};

app.on('activate', showApp);
