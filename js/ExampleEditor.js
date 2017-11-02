var Demo;
(function (Demo) {
    Demo.DEFAULT_RESULT_AREA_HTML = "<div>\n\t<div id=\"componentWrapper\">\n\t\t<input type=\"text\" id=\"originalInput\">\n\t</div>\n\t<h4>Original input value</h4>\n\t<div class=\"original-input-value-wrapper\">\n\t\t<code id=\"originalInputValue\"></code>\n\t</div>\n\t<h4>Selected entry</h4>\n\t<pre id=\"selectedEntryDisplay\" class=\"selected-entry-display prettyprint lang-js\"></pre>\n</div>";
    var ExampleEditor = (function () {
        function ExampleEditor($targetElement, exampleData) {
            var _this = this;
            this.uuid = DemoUtils.generateUUID();
            this.codeEditorId = "code-editor-" + this.uuid;
            this.exampleSelectionComboBoxId = "example-selection-combobox-" + this.uuid;
            this.template = "<div class=\"example-editor\">  \n  \t\t\t<div class=\"toolbar\">\n  \t\t\t\t<label>Example</label>\n\t\t\t\t<div class=\"selection-combobox-wrapper\">\n\t\t\t\t\t<input type=\"text\" id=\"" + this.exampleSelectionComboBoxId + "\">\n\t\t\t\t</div>  \t\t\t\n\t\t\t</div>\n\t\t\t<div class=\"main-area\">\n\t\t\t    <div class=\"code-editor-section\">\n\t\t\t        <h3 class=\"heading code-heading\">Code</h3>\n\t\t\t\t\t<div id=\"" + this.codeEditorId + "\" class=\"code-editor-wrapper\"></div>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"result-section\">\n\t\t\t\t\t<h3 class=\"heading result-heading\">Result</h3>\n\t\t\t\t\t<div class=\"result-wrapper\"></div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"description\">\n\t\t\t\t<h3>Description</h3>\n\t\t\t\t<p class=\"description-text\"></p>\n\t\t\t\t<p class=\"apidoc-link-paragraph\">\n\t\t\t\t\tSee <a class=\"apidoc-link\" href=\"\">API documentation</a>.\n\t\t\t\t</p>\n\t\t\t</div>\n\t\t</div>";
            this.$mainDomElement = $(this.template).appendTo($targetElement);
            require.config({ paths: { 'vs': 'node_modules/monaco-editor/min/vs' } });
            require(['vs/editor/editor.main'], function () {
                loadTypescriptFilesAsMonacoModels([
                    'node_modules/@types/jquery/index.d.ts',
                    'lib/js/trivial-components-global.d.ts',
                    'ts/DemoUtils.ts'
                ], function () {
                    _this.editor = monaco.editor.create(document.getElementById(_this.codeEditorId), {
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
                    var selectionComboBox = new TrivialComponents.TrivialTreeComboBox("#" + _this.exampleSelectionComboBoxId, {
                        entries: exampleData,
                        entryRenderingFunction: function (entry, depth) {
                            if (entry != null) {
                                var template = entry.template || TrivialComponents.DEFAULT_TEMPLATES.icon2LinesTemplate;
                                return Mustache.render(template, entry);
                            }
                            else {
                                return "<div>Please select...</div>";
                            }
                        }
                    });
                    selectionComboBox.onSelectedEntryChanged.addListener(function (entry) {
                        _this.$mainDomElement.find('.description-text').html(entry.description || "");
                        _this.$mainDomElement.find('.apidoc-link').attr("href", entry.apiDocLink);
                        _this.setEditorModel("/ts/examples/" + entry.fileName);
                    });
                    selectionComboBox.setSelectedEntry(exampleData[0].children[0], true, true);
                });
            });
        }
        ExampleEditor.prototype.setEditorModel = function (url) {
            var _this = this;
            require(['vs/editor/editor.main'], function () {
                _this.editorModel && _this.editorModel.dispose();
                jQuery.get(url)
                    .then(function (data) {
                    _this.editorModel = monaco.editor.createModel(data, "typescript");
                    _this.editor.setModel(_this.editorModel);
                    _this.editorModel.onDidChangeContent(DemoUtils.debounce(function () {
                        _this.compileAndEvaluate();
                    }, 1000));
                    _this.compileAndEvaluate();
                });
            });
        };
        ExampleEditor.prototype.compileAndEvaluate = function () {
            var _this = this;
            try {
                this.$mainDomElement.find('.result-wrapper')
                    .empty()
                    .append(Demo.DEFAULT_RESULT_AREA_HTML);
                var tsCode = this.editor.getModel().getLinesContent().join('\n');
                var jsCode = ts.transpile(tsCode);
                jsCode = jsCode + "\n//# sourceURL=transpiled-demo-editor-code.js";
                eval(jsCode);
            }
            catch (e) {
                console.log('Could not update component due to eval error: ' + e);
                if (e.message === "ts is not defined") {
                    window.clearTimeout(this.reEvaluateTimeout);
                    this.reEvaluateTimeout = window.setTimeout(function () { return _this.compileAndEvaluate(); }, 1000);
                }
            }
        };
        return ExampleEditor;
    }());
    Demo.ExampleEditor = ExampleEditor;
    function loadTypescriptFilesAsMonacoModels(fileNames, callback) {
        $.when(fileNames.map(function (fileName) { return jQuery.get(fileName, function (data) {
            var startTime = new Date().getTime();
            while (new Date().getTime() <= startTime) {
            }
            monaco.languages.typescript.typescriptDefaults.addExtraLib(data);
        }); }))
            .then(function () { return callback(); });
    }
})(Demo || (Demo = {}));
//# sourceMappingURL=ExampleEditor.js.map