import * as vscode from 'vscode';
import { FarbFeldEditorProvider } from './farbFeldEditor';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(FarbFeldEditorProvider.register(context));
}