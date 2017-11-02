///<reference path="definitions.d.ts"/>

module Demo {

	interface DemoTreeEntry {
		displayValue: string,
		children?: DemoFileEntry[]
	}

	interface DemoFileEntry extends DemoTreeEntry {
		additionalInfo?: string
		fileName: string,
		imageUrl: string,
		apiDocLink: string
	}

	import IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor;

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
		private editor: IStandaloneCodeEditor;
		private editorModel: monaco.editor.IModel;
		private uuid = DemoUtils.generateUUID();
		private codeEditorId = "code-editor-" + this.uuid;
		private exampleSelectionComboBoxId = "example-selection-combobox-" + this.uuid;

		private template = `<div class="example-editor">  
  			<div class="toolbar">
  				<label>Example</label>
				<div class="selection-combobox-wrapper">
					<input type="text" id="${this.exampleSelectionComboBoxId}">
				</div>  			
			</div>
			<div class="main-area">
			    <div class="code-editor-section">
			        <h3 class="heading code-heading">Code</h3>
					<div id="${this.codeEditorId}" class="code-editor-wrapper"></div>
				</div>
				<div class="result-section">
					<h3 class="heading result-heading">Result</h3>
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

			require.config({paths: {'vs': 'lib/js/vs'}});
			require(['vs/editor/editor.main'], () => {
				loadTypescriptFilesAsMonacoModels([
					'lib/js/jquery/index.d.ts',
					'lib/js/trivial-components-global.d.ts',
					'ts/DemoUtils.ts'
				], () => {
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

					let selectionComboBox = new TrivialComponents.TrivialTreeComboBox<DemoTreeEntry>("#" + this.exampleSelectionComboBoxId, {
						entries: exampleData,
						entryRenderingFunction: (entry, depth) => {
							if (entry != null) {
								const template = (entry as any).template || TrivialComponents.DEFAULT_TEMPLATES.icon2LinesTemplate;
								return Mustache.render(template, entry);
							} else {
								return "<div>Please select...</div>";
							}
						}
					});
					selectionComboBox.onSelectedEntryChanged.addListener(entry => {
						this.$mainDomElement.find('.description-text').html(entry.description || "");
						this.$mainDomElement.find('.apidoc-link').attr("href", entry.apiDocLink);
						this.setEditorModel(`ts/examples/${entry.fileName}`);
					});
					selectionComboBox.setSelectedEntry(exampleData[0].children[0], true, true);
				});
			});
		}

		public setEditorModel(url: string) {
			require(['vs/editor/editor.main'], () => {
				this.editorModel && this.editorModel.dispose();
				jQuery.get(url)
					.then((data) => {
						this.editorModel = monaco.editor.createModel(data, "typescript");
						this.editor.setModel(this.editorModel);
						this.editorModel.onDidChangeContent(DemoUtils.debounce(() => {
							this.compileAndEvaluate();
						}, 1000));
						this.compileAndEvaluate();
					});
			});
		}

		private reEvaluateTimeout: number;
		private compileAndEvaluate() {
			try {
				this.$mainDomElement.find('.result-wrapper')
					.empty()
					.append(DEFAULT_RESULT_AREA_HTML);
				let tsCode = this.editor.getModel().getLinesContent().join('\n');
				let jsCode = ts.transpile(tsCode);
				jsCode = jsCode + "\n//# sourceURL=transpiled-demo-editor-code.js";
				eval(jsCode);
			} catch (e) {
				console.log('Could not update component due to eval error: ' + e);
				if (e.message === "ts is not defined") {
					window.clearTimeout(this.reEvaluateTimeout);
					this.reEvaluateTimeout = window.setTimeout(() => this.compileAndEvaluate(), 1000);
				}
			}
		}

	}

	function loadTypescriptFilesAsMonacoModels(fileNames: string[], callback: Function) {
		$.when(fileNames.map(fileName => jQuery.get(fileName, (data) => {

			let startTime = new Date().getTime();
			while (new Date().getTime() <= startTime) {
				// wait until we are one millisecond ahead. This is needed to be sure we get a new timestamp for the extra lib in monaco editor.
				// See https://github.com/Microsoft/monaco-editor/issues/507
			}

			monaco.languages.typescript.typescriptDefaults.addExtraLib(data);
		})))
			.then(() => callback());
	}
}