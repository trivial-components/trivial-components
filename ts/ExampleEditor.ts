///<reference path="definitions.d.ts"/>

module Demo {

	type DemoFileEntry = {
		fileName: string,
		imageUrl: string,
		displayValue: string,
		additionalInfo: string
	};

	import IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor;

	export let DEFAULT_RESULT_AREA_HTML = `<div>
	<div id="componentWrapper">
		<input type="text" id="originalInput">
	</div>
	<h4>Original input value</h4>
	<code id="originalInputValue"></code>
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
				<div class="selection-combobox-wrapper">
					<input type="text" id="${this.exampleSelectionComboBoxId}">
				</div>  			
			</div>
			<div class="main-area">
			    <div class="code-editor-section">
			        <h3 class="code-heading">Code</h3>
					<div id="${this.codeEditorId}" class="code-editor-wrapper"></div>
				</div>
				<div class="result-section">
					<h3 class="result-heading">Result</h3>
					<div class="result-wrapper"></div>
				</div>
			</div>
		</div>`;

		constructor($targetElement: Element | JQuery | string, exampleData: DemoFileEntry[]) {
			this.$mainDomElement = $(this.template).appendTo($targetElement);

			require.config({paths: {'vs': 'node_modules/monaco-editor/min/vs'}});
			require(['vs/editor/editor.main'], () => {
				loadTypescriptFilesAsMonacoModels([
					'node_modules/@types/jquery/index.d.ts',
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

					let selectionComboBox = new TrivialComponents.TrivialComboBox<DemoFileEntry>("#" + this.exampleSelectionComboBoxId, {
						entries: exampleData
					});
					selectionComboBox.onSelectedEntryChanged.addListener(entry => {
						this.setEditorModel(`/ts/examples/${entry.fileName}`);
					});
					if (exampleData && exampleData.length > 0) {
						selectionComboBox.setSelectedEntry(exampleData[0]);
						this.setEditorModel(`/ts/examples/${exampleData[0].fileName}`)
					}
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

		private compileAndEvaluate() {
			try {
				this.$mainDomElement.find('.result-wrapper')
					.empty()
					.append(DEFAULT_RESULT_AREA_HTML);
				let tsCode = this.editor.getModel().getLinesContent().join('\n');
				let jsCode = ts.transpile(tsCode);
				eval(jsCode);
			} catch (e) {
				console.log('Could not update component due to eval error: ' + e);
			}
		}

	}

	function loadTypescriptFilesAsMonacoModels(fileNames: string[], callback: Function) {
		$.when(fileNames.map(fileName => jQuery.get(fileName, (data) => monaco.editor.createModel(data, "typescript"))))
			.then(() => callback());
	}
}