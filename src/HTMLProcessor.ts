// LICENSE : MIT
import { parse } from "./resx-to-ast.js";
export type HTMLProcessorOptions = {
    extensions?: string[];
}
export default class HTMLProcessor {
    config: HTMLProcessorOptions;
    extensions: string[];

    constructor(config: HTMLProcessorOptions) {
        this.config = config;
        this.extensions = this.config.extensions ? this.config.extensions : [];
    }

    availableExtensions() {
        return [
            ".resx"
        ].concat(this.extensions);
    }

    processor(_ext: string) {
        return {
            preProcess(text: string, _filePath: string) {
                return parse(text);
            },
            postProcess(messages: Array<any>, filePath?: string) {
                return {
                    messages,
                    filePath: filePath ? filePath : "<html>"
                };
            }
        };
    }
}
