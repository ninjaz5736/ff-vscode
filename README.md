# Farbfeld Image Preview Extension for Visual Studio Code

Simple [Farbfeld](https://tools.suckless.org/farbfeld/) image viewer extension for VS Code.

Partially Vibe-Coded with Gemini.

Released under 0-Clause-BSD License.

## Install from release

- Download release from GitHub
- In VS Code, press `F1` or open `View -> Command Palette...`, then search for `Extensions: Install from VSIX...``
- Find downloaded file, et voila, you can now open FF files!

## Build, run and develop locally:

- Clone this repo `git clone https://github.com/ninjaz5736/ff-vscode`
- Open in VS Code 1.46+
- `npm install`
- `npm run watch` or `npm run compile`
- `F5` to start debugging

## Packaging locally

- `npm run package`
- Right-Click on generated .vsix extension -> 'Install Extension VSIX'
