import * as vscode from 'vscode';

export class FarbFeldEditorProvider implements vscode.CustomReadonlyEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new FarbFeldEditorProvider(context);
        return vscode.window.registerCustomEditorProvider('ninjaz5736.farbfeld', provider, {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        });
    }

    constructor(private readonly context: vscode.ExtensionContext) { }

    async openCustomDocument(uri: vscode.Uri, _openContext: vscode.CustomDocumentOpenContext, _token: vscode.CancellationToken): Promise<vscode.CustomDocument> {
        return { uri, dispose: () => { } };
    }

    async resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
        const render = async () => {
            try {

                webviewPanel.webview.options = { enableScripts: true };
                webviewPanel.webview.html = this.getHtmlForWebview();

                // 1. Read the raw file from disk
                const rawFileBytes = await vscode.workspace.fs.readFile(document.uri);

                // 2. Validate Magic Header ("farbfeld")
                const header = String.fromCharCode(...rawFileBytes.slice(0, 8));
                if (header !== 'farbfeld') {
                    vscode.window.showErrorMessage('Not a valid farbfeld image file.');
                    return;
                }

                // 3. Extract Width and Height using a Big-Endian DataView
                const view = new DataView(rawFileBytes.buffer, rawFileBytes.byteOffset, rawFileBytes.byteLength);
                const width = view.getUint32(8, false);  // false = Big-Endian
                const height = view.getUint32(12, false);

                // 4. Allocate 8-bit RGBA buffer for HTML Canvas (Width * Height * 4 bytes)
                const rgbaBuffer = new Uint8Array(width * height * 4);

                let readOffset = 16; // Pixel data starts immediately after the 16-byte header
                let writeOffset = 0;

                // 5. Parse 16-bit Big-Endian RGBA down to 8-bit RGBA
                while (writeOffset < rgbaBuffer.length) {
                    // Farbfeld structure: [R_hi, R_lo, G_hi, G_lo, B_hi, B_lo, A_hi, A_lo]
                    // We grab only the '_hi' (Most Significant Byte) to downsample to 8-bit.
                    rgbaBuffer[writeOffset] = rawFileBytes[readOffset];     // Red
                    rgbaBuffer[writeOffset + 1] = rawFileBytes[readOffset + 2]; // Green
                    rgbaBuffer[writeOffset + 2] = rawFileBytes[readOffset + 4]; // Blue
                    rgbaBuffer[writeOffset + 3] = rawFileBytes[readOffset + 6]; // Alpha

                    readOffset += 8;  // Step forward 8 bytes (16-bit * 4 channels)
                    writeOffset += 4; // Step forward 4 bytes (8-bit * 4 channels)
                }

                // 6. Push the clean 8-bit buffer directly to your Canvas webview
                webviewPanel.webview.postMessage({
                    type: 'renderBuffer',
                    width: width,
                    height: height,
                    rgbaData: rgbaBuffer
                });
            } catch (e) {
                if (typeof e === "string") {
                    vscode.window.showErrorMessage(e);
                } else if (e instanceof Error) {
                    vscode.window.showErrorMessage(e.message);
                }
            }
        };

        render();

        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(document.uri, '*'));

        // 4. Trigger a re-render every time the file on disk is changed/saved
        const changeSubscription = watcher.onDidChange(() => {
            render();
        });

        webviewPanel.onDidDispose(() => {
            changeSubscription.dispose();
            watcher.dispose();

        });
    }

    private getHtmlForWebview(): string {
        return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            /* Reset and fill the entire webview viewport */
            html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                background: var(--vscode-editor-background);
                display: flex;
                justify-content: center;
                align-items: center;
                overflow: hidden; /* Prevents unwanted scrollbars */
            }

            /* Container that adapts to the viewport */
            .canvas-container {
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 16px; /* Optional: gives a nice safety margin from the window edges */
                box-sizing: border-box;
            }

            canvas {
                /* MAGIC HAPPENS HERE: Auto-scale to fit while maintaining aspect ratio */
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;

                /* CRITICAL FOR FRAMEBUFFERS: Keeps pixels razor-sharp when scaled up */
                image-rendering: pixelated; 
                image-rendering: crisp-edges;
                
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            }
        </style>
    </head>
    <body>
        <div class="canvas-container">
            <canvas id="fbCanvas"></canvas>
        </div>

        <script>
            const canvas = document.getElementById('fbCanvas');
            const ctx = canvas.getContext('2d');

            window.addEventListener('message', event => {
                const { type, width, height, rgbaData } = event.data;
                
                if (type === 'renderBuffer') {
                    // Keep the internal coordinate system matching the actual file size
                    canvas.width = width;
                    canvas.height = height;

                    const clampedArray = new Uint8ClampedArray(rgbaData);
                    const imageData = new ImageData(clampedArray, width, height);
                    
                    ctx.putImageData(imageData, 0, 0);
                }
            });
        </script>
    </body>
    </html>`;
    }
}