import {ExampleEditor} from "./ExampleEditor";

require("trivial-components/dist/js/commonjs/trivial-highlight.js");

import '../less/all.less';

import * as jQuery from "jquery";
(window as any).$ = jQuery;

if (location.pathname.indexOf('/demo.html') !== -1) {
	jQuery.get("ts/examples/demo.json", function(data) {
		(window as any).exampleEditor = new ExampleEditor('#exampleEditor', data);
	});
}
