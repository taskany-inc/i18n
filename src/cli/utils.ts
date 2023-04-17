/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import * as glob from 'glob';
import { traverse, parse } from '@babel/core';
import {
    CallExpression,
    isCallExpression,
    isIdentifier,
    isStringLiteral,
    StringLiteral,
    isMemberExpression,
} from '@babel/types';

export function traverseI18nFile(
    file: string,
    funcName: string,
    enter: (ctx: { key: string; node: CallExpression; keyNode: StringLiteral }) => void,
) {
    const code = fs.readFileSync(file, { encoding: 'utf8' });
    const filename = path.basename(file);

    const ast = parse(code, {
        presets: ['@babel/typescript'],
        filename,
        plugins: [
            [
                '@babel/plugin-proposal-decorators',
                {
                    decoratorsBeforeExport: true,
                },
            ],
        ],
    });

    traverse(ast, {
        enter(p) {
            const { node } = p;

            if (!isCallExpression(node)) {
                return;
            }

            if (node.arguments.length < 1) {
                return;
            }

            // проверка вызова `funcName`
            const isFuncCall = isIdentifier(node.callee) && node.callee.name === funcName;

            // проверка вызова `funcName.raw`
            const isFuncRawCall =
                isMemberExpression(node.callee) &&
                isIdentifier(node.callee.property) &&
                isIdentifier(node.callee.object) &&
                node.callee.object.name === funcName &&
                node.callee.property.name === 'raw';

            if (isFuncCall || isFuncRawCall) {
                const firstArgument = node.arguments[0];
                if (isStringLiteral(firstArgument)) {
                    const key = firstArgument.value;
                    enter({ key, node, keyNode: firstArgument });
                }
            }
        },
    });
}

export interface I18nRoot {
    name: string;
    root: string;
    i18nFolder: string;
}

export function getFilesList(dir: string) {
    const filesList: string[] = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach((entry) => {
        if (entry.isFile()) {
            if (['.js', '.jsx', '.ts', '.tsx'].includes(path.extname(entry.name))) {
                filesList.push(path.join(dir, entry.name));
            }
        }
    });

    return filesList;
}

export function getRootList(searchStr: string, silent = false): I18nRoot[] {
    const pathMap = new Map<string, I18nRoot>();

    glob.sync(searchStr).forEach((filePath) => {
        const root = path.dirname(filePath);
        const info = fs.lstatSync(root);

        if (!pathMap.has(root) && info.isDirectory() && !root.endsWith('.i18n')) {
            const name = path.basename(root);
            if (!silent) {
                console.log(`Searching in \x1b[33m${root}\x1b[0m`);
            }
            pathMap.set(root, {
                name,
                root,
                i18nFolder: path.join(root, `${name}.i18n`),
            });
        }
    });

    return Array.from(pathMap.values());
}

interface TranslationsLang {
    [key: string]: string;
}

export interface Translations {
    [lang: string]: TranslationsLang;
}

export function sortObjectKeys(target: Record<string, string>) {
    return Object.keys(target)
        .sort()
        .reduce<Record<string, string>>((acc, key) => {
            acc[key] = target[key];
            return acc;
        }, {});
}

export function readI18n(root: I18nRoot, langs: string[], sort = false) {
    const translations: Translations = {};
    langs.forEach((lang) => {
        translations[lang] = {};
    });

    const rootI18nDir = root.i18nFolder;

    if (fs.existsSync(rootI18nDir)) {
        langs.forEach((lang) => {
            const langFilePath = path.join(rootI18nDir, `${lang}.json`);
            if (fs.existsSync(langFilePath)) {
                const json: Record<string, string> = JSON.parse(fs.readFileSync(langFilePath, { encoding: 'utf8' }));

                translations[lang] = sort ? sortObjectKeys(json) : json;
            }
        });
    }

    return translations;
}

export type ExportPosition = {
    line: number;
    column: number;
};

export type ExportLocation = {
    start: ExportPosition;
    end: ExportPosition;
};

export type ExportKeyMeta = {
    comment?: string;
    translations: Record<string, string>;
    location: ExportLocation;
    file: string;
};

export type ExportEntries = Record<string, Record<string, ExportKeyMeta>>;
export interface ExportFormat {
    meta: {
        version: string;
        commit: string;
        datetime: string;
        timestamp: number;
        pathPrefix: string;
        repo: string;
    };
    entries: ExportEntries;
}

interface ExportDataParams {
    langs: string[];
    funcName: string;
    pattern: string;
    hash: string;
    prefix: string;
    repo: string;
}

export function getExportData(params: ExportDataParams) {
    const { langs, repo, hash, prefix, pattern, funcName } = params;

    const rootsList = getRootList(pattern, true);

    function getTranslationsForKey(translations: Translations, key: string) {
        const result: Record<string, string> = {};

        langs.forEach((lang) => {
            result[lang] = key;
            const langTranslations = translations[lang];

            if (langTranslations) {
                const keyTranslation = langTranslations[key];
                result[lang] = keyTranslation;
            }
        });

        return result;
    }

    /**
     * Счётчики по языкам для ключей. Если для ключа есть значене lang,
     * то счётчик увеличивается на 1.
     */
    const keysTranslated: Record<string, number> = {};
    for (const lang of langs) {
        keysTranslated[lang] = 0;
    }

    /**
     * Общее количество ключей. Необходимо для вычисления % сделанного перевода
     */
    let totalKeys = 0;

    const entries: ExportEntries = {};

    const now = new Date();

    const exportData: ExportFormat = {
        meta: {
            version: '1.3.0',
            commit: hash,
            datetime: now.toString(),
            timestamp: now.valueOf(),
            pathPrefix: prefix,
            repo,
        },
        entries,
    };

    rootsList.forEach((root) => {
        const files = getFilesList(root.root);
        const rootId = root.root;
        const translations = readI18n(root, langs);

        files.forEach((file) => {
            traverseI18nFile(file, funcName, ({ keyNode, key }) => {
                totalKeys += 1;
                const comments = keyNode.trailingComments || keyNode.leadingComments;

                if (!entries[rootId]) {
                    entries[rootId] = {};
                }

                const nodeTranslations = getTranslationsForKey(translations, key);

                for (const lang of langs) {
                    if (nodeTranslations[lang]) {
                        keysTranslated[lang] += 1;
                    }
                }

                entries[rootId][key] = {
                    translations: nodeTranslations,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    location: keyNode.loc!,
                    file,
                };

                if (comments) {
                    const i18nComment = comments.map((block) => block.value.trim()).join('\n');

                    entries[rootId][key].comment = i18nComment;
                }
            });
        });
    });

    return {
        exportData,
        totalKeys,
        keysTranslated,
    };
}

interface ImportI18nParams {
    langs: string[];
    data: ExportFormat;
    pattern: string;
    funcName: string;
    sort: boolean;
}

export function importI18n(params: ImportI18nParams) {
    const { langs, data: importData, pattern, funcName, sort } = params;

    const rootsList = getRootList(pattern, true);

    rootsList.forEach((root) => {
        const jsonRoot = importData.entries[root.root];
        let hasChanges = false;
        if (jsonRoot) {
            const files = getFilesList(root.root);

            const keys: Record<string, boolean> = {};
            files.forEach((file) => {
                traverseI18nFile(file, funcName, ({ key }) => {
                    keys[key] = true;
                });
            });

            const stored = readI18n(root, langs, sort);

            Object.entries(jsonRoot).forEach(([key, keyMeta]) => {
                if (!keys[key]) {
                    console.log(`Unused key in translations: ${JSON.stringify(key)}`);
                } else {
                    langs.forEach((lang) => {
                        const storedTranslation = stored[lang][key];

                        if (storedTranslation !== keyMeta.translations[lang]) {
                            console.log(
                                `Changed translation for key ${JSON.stringify(key)}: ${JSON.stringify(
                                    storedTranslation,
                                )} -> ${JSON.stringify(keyMeta.translations[lang])}`,
                            );
                            stored[lang][key] = keyMeta.translations[lang];
                            hasChanges = true;
                        }
                    });
                }
            });

            if (hasChanges) {
                langs.forEach((lang) => {
                    const langFilePath = path.join(root.i18nFolder, `${lang}.json`);
                    const data = sort ? sortObjectKeys(stored[lang]) : stored[lang];

                    fs.writeFileSync(langFilePath, `${JSON.stringify(data, null, 4)}\n`, { encoding: 'utf8' });
                });
            }
        }
    });
}

export interface Config {
    langs?: string;
    path?: string;
    func: string;
    out: string;
    getLang: string;
    fmt: string;
    stats: boolean;
    hash: string;
    prefix?: string;
    repo?: string;
    delimiter: string;
    env?: string;
}

export function loadConfig(configName: string, otherOpts: Config) {
    let config;
    try {
        const configString = fs.readFileSync(configName, { encoding: 'utf8' });
        config = JSON.parse(configString);
    } catch (e) {
        config = {};
    }

    return {
        langs: otherOpts.langs ? otherOpts.langs.split(',') : (config.langs as string[]),
        path: otherOpts.path ? otherOpts.path : (config.path as string),
        func: otherOpts.func,
        out: otherOpts.out,
        stats: otherOpts.stats,
        hash: otherOpts.hash,
        prefix: otherOpts.prefix ? otherOpts.prefix : (config.prefix as string),
        repo: otherOpts.repo ? otherOpts.repo : (config.repo as string),
        delimiter: (otherOpts.delimiter ? otherOpts.delimiter : (config.delimiter as string)) || ',',
        fmt: otherOpts.fmt ? otherOpts.fmt : (config.fmt as string),
        env: otherOpts.env ? otherOpts.env : (config.env as string),
        getLang: otherOpts.getLang ? otherOpts.getLang : (config.getLang as string),
    };
}
