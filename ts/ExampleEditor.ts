import * as monaco from 'monaco-editor';

import * as TrivialComponents from "trivial-components";
import * as ts from "typescript";
import * as $ from "jquery";
import * as DemoUtils from "./DemoUtils";
import IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor;
import {debounce, generateUUID} from "./DemoUtils";
import {DEFAULT_RENDERING_FUNCTIONS, TrivialTreeComboBox} from "trivial-components";

(window as any).MonacoEnvironment = {
	getWorkerUrl: function (moduleId: string, label: string) {
		if (label === 'json') {
			return 'dist/json.worker.bundle.js';
		}
		if (label === 'css') {
			return 'dist/css.worker.bundle.js';
		}
		if (label === 'html') {
			return 'dist/html.worker.bundle.js';
		}
		if (label === 'typescript' || label === 'javascript') {
			return 'dist/ts.worker.bundle.js';
		}
		return 'dist/editor.worker.bundle.js';
	}
};

interface DemoTreeEntry {
	displayValue: string,
	children?: DemoFileEntry[]
}

interface DemoFileEntry extends DemoTreeEntry {
	additionalInfo?: string
	fileName: string,
	imageUrl: string,
	apiDocLink: string,
	infoText: string,
	description: string
}

export let DEFAULT_RESULT_AREA_HTML = `<div>
	<div id="componentWrapper">
		<input type="text" id="originalInput">
	</div>
	<h4>Original input value</h4>
	<div class="original-input-value-wrapper">
		<code id="originalInputValue"></code>
	</div>
	<h4>Selected entry</h4>
	<pre id="selectedEntryDisplay" class="selected-entry-display prettyprint lang-js"></pre>
</div>`;

export class ExampleEditor {
	private $mainDomElement: JQuery;
	private $descriptionText: JQuery;
	private $apiDocLink: JQuery;
	private $resultWrapper: JQuery;
	private $runButton: JQuery;
	private $fullscreenButton: JQuery;
	private $infoText: JQuery;

	private editor: IStandaloneCodeEditor;
	private editorModel: monaco.editor.IModel;
	private uuid = generateUUID();
	private codeEditorId = "code-editor-" + this.uuid;
	private exampleSelectionComboBoxId = "example-selection-combobox-" + this.uuid;

	private template = `<div class="example-editor">  
  			<div class="toolbar">
  				<label>Example</label>
				<div class="selection-combobox-wrapper">
					<input type="text" id="${this.exampleSelectionComboBoxId}">
				</div>
				<div class="toolbar-buttons-wrapper">
					<div class="btn-group" role="group" aria-label="...">
					  <button class="run-button btn btn-success"><span class="glyphicon glyphicon-play"></span></button>
					</div>
					<div class="btn-group" role="group" aria-label="...">
					  <button class="fullscreen-button btn btn-default"><span class="glyphicon glyphicon-fullscreen"></span></button>
					</div>
				</div>
			</div>
		    <div class="main-area">
			    <div class="code-editor-section">
			        <h3 class="heading code-heading">Code</h3>
					<div id="${this.codeEditorId}" class="code-editor-wrapper"></div>
				</div>
				<div class="result-section">
					<h3 class="heading result-heading">Result</h3>
					<div class="info-text alert alert-info"></div>
					<div class="result-wrapper"></div>
				</div>
			</div>
			<div class="description">
				<h3>Description</h3>
				<p class="description-text"></p>
				<p class="apidoc-link-paragraph">
					See <a class="apidoc-link" href="">API documentation</a>.
				</p>
			</div>
		</div>`;

	constructor($targetElement: Element | JQuery | string, exampleData: DemoTreeEntry[]) {
		this.$mainDomElement = $(this.template).appendTo($targetElement);
		this.$infoText = this.$mainDomElement.find('.info-text');
		this.$descriptionText = this.$mainDomElement.find('.description-text');
		this.$apiDocLink = this.$mainDomElement.find('.apidoc-link');
		this.$resultWrapper = this.$mainDomElement.find('.result-wrapper');
		this.$runButton = this.$mainDomElement.find('.run-button');
		this.$fullscreenButton = this.$mainDomElement.find('.fullscreen-button');

		monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
			target: monaco.languages.typescript.ScriptTarget.ES2016,
			allowNonTsExtensions: true,
			moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
			module: monaco.languages.typescript.ModuleKind.CommonJS,
			noEmit: true,
			typeRoots: ["node_modules/@types"]
		});

		loadLibs({
			"node_modules/@types/jquery.d.ts": 'lib/tsd/jquery/index.d.ts',
			"node_modules/@types/trivial-components.d.ts": "lib/tsd/trivial-components/trivial-components-externals-concatenated.d.ts",
			"node_modules/@types/trivial-components-global.d.ts": "lib/tsd/trivial-components/trivial-components-global.d.ts",
			"ts/DemoUtils.ts": 'ts/DemoUtils.ts',
			"ts/DemoUtils-global.d.ts": 'ts/DemoUtils-global.d.ts'
		}, () => {


			this.editor = monaco.editor.create(document.getElementById(this.codeEditorId), {
				value: '',
				language: 'typescript',
				scrollbar: {
					useShadows: true,
					vertical: 'auto',
					horizontal: 'auto',
					verticalScrollbarSize: 7,
					horizontalScrollbarSize: 7
				},
				automaticLayout: true,
				lineNumbers: 'off',
				scrollBeyondLastLine: false,
				renderLineHighlight: 'none'
			});


			let selectionComboBox = new TrivialTreeComboBox<DemoTreeEntry>("#" + this.exampleSelectionComboBoxId, {
				entries: exampleData,
				entryRenderingFunction: (entry, depth) => {
					return DEFAULT_RENDERING_FUNCTIONS.icon2Lines(entry || {
						displayValue: "Please select...",
						imageUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw="
					});
				}
			});
			selectionComboBox.onSelectedEntryChanged.addListener(entry => {
				if (this.isFileEntry(entry)) {
					this.$infoText.toggleClass("hidden", !entry.infoText).html(entry.infoText || "");
					this.$descriptionText.html(entry.description || "");
					this.$apiDocLink.attr("href", entry.apiDocLink);
					this.setEditorModel(`ts/examples/${entry.fileName}`);
				}
			});
			selectionComboBox.setSelectedEntry(exampleData[0].children[0], true, true);

			this.$runButton.click(() => {
				this.compileAndEvaluate();
			});
			this.$fullscreenButton.click(() => {
				this.$mainDomElement.toggleClass("maximized");
				this.$fullscreenButton.find('span').toggleClass("glyphicon-remove glyphicon-fullscreen");
			});
			this.editor.onKeyDown((e) => {
				if ((e.metaKey || e.ctrlKey) && e.keyCode == 49) {
					this.compileAndEvaluate();
					e.preventDefault();
				}
			});
		});

	}

	private isFileEntry(entry: DemoTreeEntry): entry is DemoFileEntry {
		return !!(entry as DemoFileEntry).fileName;
	}

	public setEditorModel(url: string) {
		this.editorModel && this.editorModel.dispose();
		$.get(url)
			.then((data) => {
				this.editorModel = monaco.editor.createModel(data, "typescript", monaco.Uri.parse(url));
				this.editor.setModel(this.editorModel);
				this.editorModel.onDidChangeContent(debounce(() => {
				}, 200));
				this.compileAndEvaluate();
			});
	}

	private reEvaluateTimeout: number;

	private compileAndEvaluate() {
		try {
			this.$resultWrapper
				.empty()
				.append(DEFAULT_RESULT_AREA_HTML);
			let tsCode = this.editor.getModel().getLinesContent().join('\n');
			let jsCode = ts.transpile(tsCode);
			jsCode = jsCode + "\n//# sourceURL=transpiled-demo-editor-code.js";

			var /* yes, var!! else, webpack will mess arround with the name! */ require /* local var used in evaluated code! */ = (name: string) => {
				let modules: { [name: string]: any } = {
					"trivial-components": TrivialComponents,
					"../DemoUtils": DemoUtils
				};
				return modules[name];
			};
			eval(jsCode);
		} catch (e) {
			console.warn('Could not update component due to eval error: ' + e);
			if (e.message === "ts is not defined") {
				window.clearTimeout(this.reEvaluateTimeout);
				this.reEvaluateTimeout = window.setTimeout(() => this.compileAndEvaluate(), 1000);
			} else {
				throw e;
			}
		}
	}

}

function loadLibs(libs: { [libraryPath: string]: string }, callback: Function) {
	$.when(Object.keys(libs).map(virtualLibPath => {
		let libServerPath = libs[virtualLibPath];
		return $.get(libServerPath, (data) => {

			let startTime = new Date().getTime();
			while (new Date().getTime() <= startTime) {
				// wait until we are one millisecond ahead. This is needed to be sure we get a new timestamp for the extra lib in monaco editor.
				// See https://github.com/Microsoft/monaco-editor/issues/507
			}

			monaco.languages.typescript.typescriptDefaults.addExtraLib(data, virtualLibPath);
		});
	}))
		.then(() => callback());
}