///<reference path="../node_modules/@types/jquery/index.d.ts"/>
///<reference path="../node_modules/trivial-components/dist/js/bundle/trivial-components-global.d.ts"/>
///<reference path="../node_modules/@types/mustache/index.d.ts"/>
///<reference path="../node_modules/monaco-editor/monaco.d.ts"/>
///<reference path="../node_modules/typescript/lib/typescriptServices.d.ts"/>

declare function require(name: string[], fun:()=>void): any;
declare namespace require {
	function config(config: any): any;
}
