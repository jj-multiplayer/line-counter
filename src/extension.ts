import * as vscode from 'vscode';

interface GradientStep {
	minLines: number;
	maxLines: number;
	backgroundColor: string;
	decoration: vscode.TextEditorDecorationType;
}

const START_LINE = 150;
const END_LINE = 230;
const TOTAL_STEPS = END_LINE - START_LINE + 1;

function interpolateColor(startColor: string, endColor: string, steps: number): string[] {
	const start = {
		r: parseInt(startColor.slice(1, 3), 16),
		g: parseInt(startColor.slice(3, 5), 16),
		b: parseInt(startColor.slice(5, 7), 16)
	};
	const end = {
		r: parseInt(endColor.slice(1, 3), 16),
		g: parseInt(endColor.slice(3, 5), 16),
		b: parseInt(endColor.slice(5, 7), 16)
	};
	
	const colors: string[] = [];
	for (let i = 0; i < steps; i++) {
		const ratio = i / (steps - 1);
		const r = Math.round(start.r + (end.r - start.r) * ratio);
		const g = Math.round(start.g + (end.g - start.g) * ratio);
		const b = Math.round(start.b + (end.b - start.b) * ratio);
		colors.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
	}
	return colors;
}
const colors = interpolateColor('#FFFBE5', '#C9464C', TOTAL_STEPS);

const GRADIENT_STEPS: Array<Omit<GradientStep, 'decoration'>> = [
	...colors.map((color, index) => ({
		minLines: START_LINE + index,
		maxLines: START_LINE + index,
		backgroundColor: color
	})),
	{
		minLines: END_LINE + 1,
		maxLines: Infinity,
		backgroundColor: '#C9464C'
	}
];

let gradientSteps: GradientStep[] = [];

function createColorIcon(color: string): vscode.Uri {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="16"><rect width="4" height="16" fill="${color}"/></svg>`;
	const base64 = Buffer.from(svg).toString('base64');
	return vscode.Uri.parse(`data:image/svg+xml;base64,${base64}`);
}

function createDecorations(): GradientStep[] {
	return GRADIENT_STEPS.map(step => ({
		...step,
		decoration: vscode.window.createTextEditorDecorationType({
			gutterIconPath: createColorIcon(step.backgroundColor),
			gutterIconSize: 'contain'
		})
	}));
}

function updateDecorations(editor: vscode.TextEditor | undefined) {
	if (!editor) {
		return;
	}

	const document = editor.document;
	const lineCount = document.lineCount;

	gradientSteps.forEach(step => {
		const ranges: vscode.Range[] = [];
		
		if (lineCount >= step.minLines) {
			const startLine = Math.max(0, step.minLines - 1);
			const endLine = Math.min(lineCount - 1, step.maxLines - 1);
			
			for (let i = startLine; i <= endLine; i++) {
				const line = document.lineAt(i);
				const range = line.range;
				ranges.push(range);
			}
		}
		
		editor.setDecorations(step.decoration, ranges);
	});
}

function clearAllDecorations(editor: vscode.TextEditor | undefined) {
	if (!editor) {
		return;
	}
	gradientSteps.forEach(step => {
		editor.setDecorations(step.decoration, []);
	});
}

export function activate(context: vscode.ExtensionContext) {
	gradientSteps = createDecorations();
	
	if (vscode.window.activeTextEditor) {
		updateDecorations(vscode.window.activeTextEditor);
	}

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			updateDecorations(editor);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => {
			if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
				updateDecorations(vscode.window.activeTextEditor);
			}
		})
	);

	gradientSteps.forEach(step => {
		context.subscriptions.push(step.decoration);
	});
}

export function deactivate() {
	gradientSteps.forEach(step => {
		step.decoration.dispose();
	});
}
