///<reference path="../node_modules/@types/jquery/index.d.ts"/>
///<reference path="../node_modules/trivial-components/dist/js/bundle/trivial-components.d.ts"/>
///<reference path="../node_modules/@types/mustache/index.d.ts"/>

module Demo {

	import ResultCallback = TrivialComponents.ResultCallback;
	import TrivialComboBoxConfig = TrivialComponents.TrivialComboBoxConfig;
	$(function () {

		$('#entries').val(JSON.stringify(DemoUtils.createEntries(5), null, 2));
		$('#spinnerTemplate').val(TrivialComponents.DEFAULT_TEMPLATES.defaultSpinnerTemplate);
		$('#noEntriesTemplate').val(TrivialComponents.DEFAULT_TEMPLATES.defaultNoEntriesTemplate);

		const createTemplateComboBox = function (element: Element|string) {
			return new TrivialComponents.TrivialComboBox(element, {
				entries: [{
					displayValue: "Image with two lines of text",
					value: function (entry: any) {
						return Mustache.render(TrivialComponents.DEFAULT_TEMPLATES.image2LinesTemplate, entry);
					},
					additionalInfo: 'TrivialComponents.DEFAULT_TEMPLATES.image2LinesTemplate',
					imageUrl: 'img/icons/dev.png'
				}, {
					displayValue: "Round image with two lines of text and status buble",
					value: function (entry: any) {
						return Mustache.render(TrivialComponents.DEFAULT_TEMPLATES.roundImage2LinesColorBubbleTemplate, entry);
					},
					additionalInfo: "TrivialComponents.DEFAULT_TEMPLATES.roundImage2LinesColorBubbleTemplate",
					imageUrl: 'img/icons/dev.png'
				}, {
					displayValue: "Icon with two lines of text",
					value: function (entry: any) {
						return Mustache.render(TrivialComponents.DEFAULT_TEMPLATES.icon2LinesTemplate, entry);
					},
					additionalInfo: "TrivialComponents.DEFAULT_TEMPLATES.icon2LinesTemplate",
					imageUrl: 'img/icons/dev.png'
				}, {
					displayValue: "Icon with single line of text",
					value: function (entry: any) {
						return Mustache.render(TrivialComponents.DEFAULT_TEMPLATES.iconSingleLineTemplate, entry);
					},
					additionalInfo: "TrivialComponents.DEFAULT_TEMPLATES.iconSingleLineTemplate",
					imageUrl: 'img/icons/dev.png'
				}, {
					displayValue: "Single line of text",
					value: function (entry: any) {
						return Mustache.render(TrivialComponents.DEFAULT_TEMPLATES.singleLineTemplate, entry);
					},
					additionalInfo: "TrivialComponents.DEFAULT_TEMPLATES.singleLineTemplate",
					imageUrl: 'img/icons/dev.png'
				}],
				selectedEntry: {
					displayValue: "Image with two lines of text",
					value: function (entry: any) {
						return Mustache.render(TrivialComponents.DEFAULT_TEMPLATES.image2LinesTemplate, entry);
					},
					additionalInfo: "TrivialComponents.DEFAULT_TEMPLATES.image2LinesTemplate",
					imageUrl: 'img/icons/dev.png'
				},
				allowFreeText: false
			})
		};
		const templateComboBox = createTemplateComboBox('#template');
		const selectedEntryTemplateComboBox = createTemplateComboBox('#selectedEntryTemplate');

		const matchingModeComboBox = new TrivialComponents.TrivialComboBox('#matchingMode', {
			entryRenderingFunction: (entry: any) => `<div>${entry.displayValue}</div>`,
			entries: [{
				displayValue: "contains"
			}, {
				displayValue: "prefix"
			}, {
				displayValue: "prefix-word"
			}],
			selectedEntry: {
				displayValue: "contains"
			},
			allowFreeText: false
		});
		const editingModeComboBox = new TrivialComponents.TrivialComboBox('#editingMode', {
			entryRenderingFunction: (entry: any) => `<div>${entry.displayValue}</div>`,
			entries: [{
				displayValue: "editable"
			}, {
				displayValue: "disabled"
			}, {
				displayValue: "readonly"
			}],
			selectedEntry: {
				displayValue: "editable"
			},
			allowFreeText: false
		});

		const customQueryFunction = function (queryString:string, resultCallback:ResultCallback<any>) {
			setTimeout(function () {
				resultCallback(DemoUtils.createEntries(100).filter(function (entry) {
					return entry.displayValue.toLowerCase().indexOf(queryString.toLowerCase()) != -1 || entry.additionalInfo.toLowerCase().indexOf(queryString.toLowerCase()) != -1;
				}));
			}, 1000);
		};

		function reInitReadMore() {
			$('.prettyprint').readmore({
				collapsedHeight: 500,
				moreLink: '<a href="#">Read more...</a>',
				lessLink: '<a href="#">Read less...</a>'
			});
		}

		function createComboBox() {
			$('#comboBoxWrapper').empty();
			const $comboBoxOriginalInput = $('<input id="combobox"/>').appendTo('#comboBoxWrapper');
			$comboBoxOriginalInput.on('change', function () {
				$('#originalInputValue').text($(this).val());
			});
			const config:TrivialComboBoxConfig<any> = {
				showTrigger: $('#showTrigger').is(':checked'),
				allowFreeText: $('#allowFreeText').is(':checked'),
				freeTextEntryFactory: (freeText:string) => {
					let entry = JSON.parse($('#freeTextEntryValues').val());
					entry.displayValue = freeText;
					return entry;
				},
				autoComplete: $('#autoComplete').is(':checked'),
				queryFunction: $('#customQueryFunction').is(':checked') ? customQueryFunction : undefined,
				autoCompleteDelay: parseInt($('#autoCompleteDelay').val()),
				valueFunction: (entry:any) => entry && entry[$('#valueProperty').val()],
				matchingOptions: {
					matchingMode: matchingModeComboBox.getSelectedEntry().displayValue,
					ignoreCase: $('#ignoreCase').is(':checked'),
					maxLevenshteinDistance: 2
				},
				entryRenderingFunction: templateComboBox.getSelectedEntry().value,
				selectedEntryRenderingFunction: selectedEntryTemplateComboBox.getSelectedEntry().value,
				spinnerTemplate: $('#spinnerTemplate').val(),
				noEntriesTemplate: $('#noEntriesTemplate').val(),
				selectedEntry: JSON.parse($('#selectedEntry').val()),
				emptyEntry: JSON.parse($('#emptyEntry').val()),
				entries: JSON.parse($('#entries').val()),
				editingMode: editingModeComboBox.getSelectedEntry().displayValue
			};
			$('#configDisplay').removeClass("prettyprinted")
				.text("$('#combobox').TrivialComboBox(" + JSON.stringify(config, function (key, value) {
						if (key === 'queryFunction' && config.queryFunction) {
							return "%queryFunction%";
						} else {
							return value;
						}
					}, 2).replace("\"%queryFunction%\"", customQueryFunction.toString()) + ");");
			const trivialComboBox = new TrivialComponents.TrivialComboBox($comboBoxOriginalInput, config);

			function updateSelectedEntryDisplay() {
				$('#selectedEntryDisplay')
					.text(JSON.stringify(trivialComboBox.getSelectedEntry(), null, 2))
					.removeClass("prettyprinted");
				// prettyPrint();
			}

			updateSelectedEntryDisplay();
			trivialComboBox.onSelectedEntryChanged.addListener(function () {
				updateSelectedEntryDisplay.call(this);
				reInitReadMore();
			});
			// prettyPrint();
			reInitReadMore();
		}

		createComboBox();

		$('#config input, #config textarea').change(function () {
			createComboBox();
		});

	});


}