// LICENSE : MIT
"use strict";
export const tagNameToType = {
    "root": "Document",
    "comment": "Comment",
    'data': 'Data',
    'value': 'Value',
} as const;

export const nodeTypes = {
    "root": "Document",
    "comment": "Comment",
    'text': 'Str',
} as const;
