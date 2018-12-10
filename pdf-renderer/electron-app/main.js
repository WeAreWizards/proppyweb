const electron = require('electron')
const path = require('path')
var ipc = require('electron').ipcMain;

let mainWindow
const BrowserWindow = electron.BrowserWindow
const app = electron.app
const url = process.argv[process.argv.length - 1];
console.error("Called with: ", process.argv);

const waitLoadedJS = `
new Promise(resolve => {
  function waitLoaded() {
    const printIcon = window.document.getElementsByClassName('icon-print');
    const found = Object.keys(printIcon).length > 0;
    console.error("printIcon", printIcon);
    if (found) {
      setTimeout(() => { resolve("ok"); }, 1000);
    } else {
      setTimeout(() => { waitLoaded(); }, 100);
    }
  }
  waitLoaded();
});
`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024, height: 600,
    webSecurity: false,
  })
  mainWindow.loadURL(url)

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.executeJavaScript(waitLoadedJS, (result) => {
      console.error("result", result);
      const pdfOpts = {};
      mainWindow.webContents.printToPDF(pdfOpts, (err, data) => {
        if (err) console.error(err, function() { app.exit(1); });
        process.stdout.write(data, app.quit);
      });
    });
  });

  mainWindow.webContents.on("did-fail-load", (event, code, message) => {
    console.error("printing failed:", code, message);
    app.exit(-1);
  });

  // Global 10s timeout (prefer fail)
  setTimeout(() => {
    console.error("render timeout for ", url);
    app.exit(-1);
  }, 120000);
}

ipc.on('invokeAction', function(event, data) {
  console.error("invokeAction", event, data);
});

app.on('ready', createWindow)

app.on('activate', function () {
  createWindow()
})
