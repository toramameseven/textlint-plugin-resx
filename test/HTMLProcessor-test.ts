// LICENSE : MIT
"use strict";
import assert from "assert";
import HTMLPlugin from "../src/index.js"
// import { parse } from "../src/resx-to-ast.js";

import { TextlintKernel } from "@textlint/kernel"
import path from "path";
import { moduleInterop } from "@textlint/module-interop";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("RESXProcessor-test", function () {
    describe("HTMLPlugin", function () {
        context("support file extensions", function () {
            it("support {.html, .htm}", async function () {
                const textlint = new TextlintKernel()
                const plugin = {
                    pluginId: "html",
                    plugin: HTMLPlugin,
                    options: { degug: true}
                };
                const rule = {
                    ruleId: "no-todo",
                    // @ts-ignore
                    rule: moduleInterop((await import("textlint-rule-no-todo")).default)
                };
                const options = {
                    plugins: [plugin],
                    rules: [rule]
                }
                const fixturePathList = [
                    path.join(__dirname, "/fixtures/editUser.aspx.ja.resx"),
                    // path.join(__dirname, "/fixtures/test.htm")
                ];
                const promises = fixturePathList.map(async (filePath) => {
                    return textlint.lintText(fs.readFileSync(filePath, "utf-8"), {
                        ...options,
                        ext: path.extname(filePath),
                        filePath
                    }).then(results => {
                        assert(results.messages.length > 0);
                        console.dir(results.messages, { depth: null });
                        assert(results.filePath === filePath);
                    });
                });
                return Promise.all(promises);
            });
        });
    });
});
