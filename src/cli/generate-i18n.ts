/* eslint-disable no-console */
import fsp from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import ejs from 'ejs';
import { Command } from 'commander';
import debug from 'debug';
import invariant from 'invariant';

import {
    getRootList,
    I18nRoot,
    getFilesList,
    traverseI18nFile,
    Translations,
    readI18n,
    sortObjectKeys,
    loadConfig,
    Config,
} from './utils';

const generateLog = debug('i18n:generate');

const program = new Command();

program
    .option('-l, --langs <string>', "Languages to generate, for example 'ru,en'")
    .option('-f, --func <string>', 'Function name', 't')
    .option('-s, --split', 'Split languages')
    .option('-e, --env <string>', 'Env var name', 'REACT_APP_LANG')
    .option('--fmt <string>', 'Formatter path')
    .option('--getLang <string>', 'Getlang path')
    .option('--sort', 'Sort keys')
    .option('-q, --quite', 'be quite', false)
    .option('--path <string>', "Path or pattern to i18n root, for example 'src/{components/*\\,utils\\,somepath}'")
    .option('-c, --config <string>', 'Load config from file', './i18n.config.json')
    .option('--fail-if-unused', 'Return error code if script found unused keys', false);

program.parse(process.argv);

const opts = program.opts();

generateLog('Run options:', opts);

const funcName = opts.func;
const {
    fmt,
    path: pattern,
    env: envVarName,
    getLang,
    langs,
    failIfUnused = false,
    quite = false,
} = loadConfig(path.resolve(opts.config), opts as Config);
const { split: splitLangs, sort: sortKeys } = opts;

generateLog('Parsed command options', { fmt, pattern, envVarName, getLang, langs, failIfUnused, quite });

interface TemplateData {
    langs: string[];
    envVarName: string;
    funcName?: string;
    formatterPath?: string;
    splitLangs?: string;
    getLangPath?: string;
}

const rootsList = getRootList(pattern, quite);

async function render(data: TemplateData) {
    const tplDir = path.resolve(__dirname, '../../templates');
    const fileName = path.resolve(tplDir, 'i18n.ejs');

    const file = await fsp.readFile(fileName, { encoding: 'utf-8' });

    invariant(file, "Template doesn't exist");

    return ejs.render(file, data, { root: tplDir, async: true });
}

async function writeI18n(root: I18nRoot, translations: Translations) {
    const componentI18nDir = root.i18nFolder;

    if (!existsSync(componentI18nDir)) {
        generateLog('Create translate storage dir');
        await fsp.mkdir(componentI18nDir);
    }

    generateLog(`Create translate files for ${langs.length} language(s)`);
    for (const lang of langs) {
        const langFilePath = path.join(componentI18nDir, `${lang}.json`);

        const data = sortKeys ? sortObjectKeys(translations[lang]) : translations[lang];

        await fsp.writeFile(langFilePath, `${JSON.stringify(data, null, 4)}\n`, { encoding: 'utf-8' });
    }

    const formatterPath = fmt ? path.relative(root.i18nFolder, fmt) : undefined;
    const getLangPath = getLang ? path.relative(root.i18nFolder, getLang) : undefined;

    const tpl = await render({
        langs,
        funcName,
        formatterPath,
        envVarName,
        splitLangs,
        getLangPath,
    });

    await fsp.writeFile(path.join(componentI18nDir, 'index.ts'), tpl, { encoding: 'utf8' });
}

const prepare = async (root: I18nRoot): Promise<[string[], Record<string, true>]> => {
    return new Promise((resolve) => {
        generateLog(`Traverse by ${root.root}`);
        const files = getFilesList(root.root);
        const i18nKeysHash: { [key: string]: true } = {};
        const i18nKeys: string[] = [];

        files.forEach((file) => {
            traverseI18nFile(file, funcName, ({ key }) => {
                if (!i18nKeysHash[key]) {
                    i18nKeysHash[key] = true;
                    i18nKeys.push(key);
                }
            });
        });

        resolve([i18nKeys, i18nKeysHash]);
    });
};

export const main = async () => {
    return new Promise<void>(async (resolve, reject) => {
        try {
            invariant(getLang, 'Locale detection module not defined');

            let hasChanges = false;
            let hasUnused = false;

            for (const root of rootsList) {
                const [keys, hash] = await prepare(root);
                const translations = readI18n(root, langs, sortKeys);
                const addedKeys: string[] = [];
                const addedKeysHash: { [key: string]: true } = {};
                const unusedKeys: string[] = [];

                for (const lang of langs) {
                    const targetLang = translations[lang];
                    const targetLangKeys = Object.keys(targetLang);

                    keys.forEach((key) => {
                        if (!targetLangKeys.includes(key)) {
                            targetLang[key] = '';
                            if (!addedKeysHash[key]) {
                                addedKeysHash[key] = true;
                                addedKeys.push(key);
                            }
                        }
                    });
                    const storedKeys = Object.keys(targetLang);
                    storedKeys.forEach((storedKey) => {
                        if (!hash[storedKey]) {
                            unusedKeys.push(`${lang}.json: ${storedKey}`);
                        }
                    });
                }

                if (addedKeys.length) {
                    hasChanges = true;
                }

                if (unusedKeys.length) {
                    hasUnused = true;
                }

                if (keys.length) {
                    await writeI18n(root, translations);
                }

                if (!quite) {
                    if (addedKeys.length || unusedKeys.length) {
                        console.log(`Folder: \x1b[33m${root.i18nFolder}\x1b[0m`);
                        addedKeys.forEach((key) => {
                            console.log(`Added key: ${key}`);
                        });
                        unusedKeys.forEach((key) => {
                            console.log(`\x1b[31mUnused key\x1b[0m: ${key}`);
                        });
                    }
                }
            }

            if (failIfUnused) {
                invariant(hasUnused, 'Found unused keys');
            }

            if (!hasChanges) {
                console.log('Nothing changed');
            }

            resolve();
        } catch (error) {
            reject(error);
        }
    });
};
