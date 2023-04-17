/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import { Command } from 'commander';

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

const program = new Command();

program
    .option('-l, --langs <string>', 'Languages to generate, for example "ru,en"')
    .option('-f, --func <string>', 'Function name', 't')
    .option('-s, --split', 'Split languages')
    .option('-e, --env <string>', 'Env var name', 'REACT_APP_LANG')
    .option('--fmt <string>', 'Formatter path')
    .option('--getLang <string>', 'Getlang path')
    .option('--sort', 'Sort keys')
    .option('-p, --path <string>', 'Path or pattern to i18n root, for example "src/{components/*\\,utils\\,somepath}"')
    .option('-c, --config <string>', 'Load config from file', './i18n.config.json');

program.parse(process.argv);

const opts = program.opts();

const funcName = opts.func;
const { fmt, path: pattern, env: envVarName, getLang, langs } = loadConfig(path.resolve(opts.config), opts as Config);
const { split: splitLangs, sort: sortKeys } = opts;

if (!getLang) {
    throw new Error('Не определён модуль определения локали');
}

interface TemplateData {
    langs: string[];
    envVarName: string;
    funcName?: string;
    formatterPath?: string;
    splitLangs?: string;
    getLangPath?: string;
}

const rootsList = getRootList(pattern);

function render(data: TemplateData) {
    const tplDir = path.resolve(__dirname, '../../templates');
    const fileName = path.resolve(tplDir, 'i18n.ejs');

    return ejs.render(fs.readFileSync(fileName, 'utf-8'), data, {
        root: tplDir,
    });
}

function writeI18n(root: I18nRoot, translations: Translations) {
    const componentI18nDir = root.i18nFolder;

    if (!fs.existsSync(componentI18nDir)) {
        fs.mkdirSync(componentI18nDir);
    }

    langs.forEach((lang) => {
        const langFilePath = path.join(componentI18nDir, `${lang}.json`);

        const data = sortKeys ? sortObjectKeys(translations[lang]) : translations[lang];

        fs.writeFileSync(langFilePath, `${JSON.stringify(data, null, 4)}\n`, { encoding: 'utf8' });
    });

    const formatterPath = fmt ? path.relative(root.i18nFolder, fmt) : undefined;
    const getLangPath = getLang ? path.relative(root.i18nFolder, getLang) : undefined;

    const tpl = render({
        langs,
        funcName,
        formatterPath,
        envVarName,
        splitLangs,
        getLangPath,
    });

    fs.writeFileSync(path.join(componentI18nDir, 'index.ts'), tpl, { encoding: 'utf8' });
}

let hasChanges = false;

rootsList.forEach((root) => {
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

    const translations = readI18n(root, langs, sortKeys);
    const addedKeys: string[] = [];
    const addedKeysHash: { [key: string]: true } = {};
    const unusedKeys: string[] = [];
    langs.forEach((lang) => {
        const targetLang = translations[lang];
        const targetLangKeys = Object.keys(targetLang);

        i18nKeys.forEach((key) => {
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
            if (!i18nKeysHash[storedKey]) {
                unusedKeys.push(`${lang}.json: ${storedKey}`);
            }
        });
    });
    if (addedKeys.length || unusedKeys.length) {
        console.log(`Folder: \x1b[33m${root.i18nFolder}\x1b[0m`);
        addedKeys.forEach((key) => {
            console.log(`Added key: ${key}`);
        });
        unusedKeys.forEach((key) => {
            console.log(`\x1b[31mUnused key\x1b[0m: ${key}`);
        });
    }
    if (addedKeys.length) {
        hasChanges = true;
    }

    if (i18nKeys.length) {
        writeI18n(root, translations);
    }
});

if (!hasChanges) {
    console.log('Nothing changed');
}
