// LICENSE : MIT
import { parse } from "./resx-to-ast.js";
export type RESXProcessorOptions = {
    extensions?: string[];
}
export default class RESXProcessor {
    config: RESXProcessorOptions;
    extensions: string[];

    constructor(config: RESXProcessorOptions) {
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
                    filePath: filePath ? filePath : "<resx>"
                };
            }
        };
    }
}
