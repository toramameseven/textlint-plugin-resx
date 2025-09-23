// LICENSE : MIT
import type {
    TxtParentNode,
} from "@textlint/ast-node-types";
import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import traverse, { TraverseContext } from "neotraverse";
import { StructuredSource } from "structured-source";
import type { RootContent } from "hast";
import { nodeTypes, tagNameToType } from "./mapping.js";


function categorizeResource(type: string, mimeType: string, value: string) {
    // 1. MIMEタイプがある場合は優先
    if (mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('text/')) return 'string';
        if (mimeType === 'application/octet-stream') return 'binary';
        if (mimeType.includes('microsoft.net.object')) return 'object';
    }

    // 2. type属性による判定
    if (type) {
        // 文字列型
        if (type.includes('System.String')) return 'string';

        // 画像型
        if (type.includes('System.Drawing.Bitmap') ||
            type.includes('System.Drawing.Icon') ||
            type.includes('System.Drawing.Image')) return 'image';

        // 数値型
        if (type.includes('System.Int32') ||
            type.includes('System.Double') ||
            type.includes('System.Decimal') ||
            type.includes('System.Single') ||
            type.includes('System.Int64') ||
            type.includes('System.UInt32')) return 'numeric';

        // ブール型
        if (type.includes('System.Boolean')) return 'boolean';

        // ファイル参照
        if (type.includes('System.Resources.ResXFileRef')) return 'fileref';

        // その他のシリアライズ可能オブジェクト
        if (type.includes('microsoft.net.object')) return 'object';
    }

    // 3. 値の内容による判定（ヒューリスティック）
    if (value) {
        // Base64エンコードされたバイナリデータの可能性
        if (value.length > 100 && /^[A-Za-z0-9+/]+=*$/.test(value.trim())) {
            return 'binary';
        }
    }

    // 4. type属性がない場合はデフォルトで文字列
    if (!type && !mimeType) {
        return 'string';
    }

    return 'unknown';
}

function mapNodeType(node: RootContent, parent: TraverseContext | undefined) {
    if (node.type === "element") {
        // @ts-expect-error: tagName is string
        const mappedType = tagNameToType[node.tagName];
        if (mappedType) {
            // p => Paragraph...
            return mappedType;
        } else {
            // other case, return original tagName
            return node.tagName;
        }
    } else if (node.type === "doctype") {
        return "doctype";
    } else if (node.type in nodeTypes) {
        // mappable node type
        // type:text => ast:Str
        if (node.type === "text") {
            const parentNode = parent?.parent?.node;
            const parentparentNode = parent?.parent?.parent?.parent?.node;
            const dataType = parentparentNode?.properties?.type;
            const dataMimetype = parentparentNode?.properties?.mimetype;
            const category = categorizeResource(dataType, dataMimetype, node.value);
            if (parentNode?.type === "Value" && parentparentNode?.type === "Data" && category === 'string') {
                // TODO: check resouce is text strings.
                return nodeTypes[node.type];
            }
        } else {
            return nodeTypes[node.type];
        }
    }
    // The other node is original node.type because it is not defined in textlint's AST
    // Almost rule should not handle this node.
    // https://github.com/textlint/textlint-plugin-html/issues/19
    return node.type;
}

export type ParseOptions = {
    debug: boolean;
}

export function parse(html: string, options?: ParseOptions) {
    const isDebug = process.env.DEBUG?.startsWith("textlint:html") ?? options?.debug ?? false;
    const parseHtml = unified().use(rehypeParse)
    const ast = parseHtml.parse(html);
    const src = new StructuredSource(html);
    const tr = traverse(ast);

    // console.log("---- Src before mapping ----");
    // console.dir(src, { depth: null });
    // console.log("---- AST before mapping ----");
    // console.dir(ast, { depth: null });
    tr.forEach(function (node) {
        if (typeof node === "object" && !Array.isArray(node)) {
            // it is not leaf node
            if (!("type" in node)) {
                return;
            }
            // backup
            if (isDebug) {
                Object.defineProperty(node, "_debug_type", {
                    value: node.type,
                })
            }
            // avoid conflict <input type="text" />
            // AST node has type and position
            if (node.type) {
                // case: element => Html or ...
                node.type = mapNodeType(node, this.parent);
            } else {
                // We can not use "Html" type because some rule ignore node under the "Html" node.
                // So, We use "unknown" type instead of "Html".
                // https://github.com/textlint-ja/textlint-rule-no-synonyms/issues/4
                node.type = "unknown" as const;
            }
            // map `range`, `loc` and `raw` to node
            if (typeof node.position === "object") {
                const position = node.position;
                // TxtNode's line start with 1
                // TxtNode's column start with 0
                const positionCompensated = {
                    start: { line: position.start.line, column: position.start.column - 1 },
                    end: { line: position.end.line, column: position.end.column - 1 }
                } as const;
                const range = src.locationToRange(positionCompensated);
                node.loc = positionCompensated;
                node.range = range;
                node.raw = html.slice(range[0], range[1]);
            }
        }
    });
    console.log("---- AST after mapping ----");
    console.dir(ast, { depth: null });
    return ast as any as TxtParentNode;
}
