import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import parse from 'csv-parse/lib/sync';

import { Config, getExportData, importI18n, loadConfig } from './utils';

const program = new Command();

program
    .option('-l, --lang <string>', 'Language to export')
    .option('-f, --func <string>', 'Function name', 't')
    .option('--path <string>', 'Path or pattern to i18n root, for example "src/{components/*\\,utils\\,somepath}"')
    .option('-d, --delimiter <string>', 'Columns delimiter', ',')
    .option('-i, --input <string>', 'Input CSV file')
    .option('-c, --config <string>', 'Load config from file', './i18n.config.json');

program.parse(process.argv);

const opts = program.opts();

const { func: funcName, path: pattern, delimiter } = loadConfig(path.resolve(opts.config), opts as Config);
const input = opts.input as string | undefined;

const lang = opts.lang as string;
if (!lang) {
    throw new Error('Argument "lang" is not defined');
}
if (!input) {
    throw new Error('Argument "input" is not defined');
}

const currentData = getExportData({
    pattern,
    langs: [lang],
    funcName,
    hash: '',
    prefix: '',
    repo: '',
});

const csv = fs.readFileSync(path.resolve(input), { encoding: 'utf8' });

const parsedCsv: [string, string, string][] = parse(csv, { delimiter });

const csvTranslations: Record<string, string> = {};

function getKey(key: string, comment: string) {
    return JSON.stringify([key, comment]);
}

parsedCsv.forEach(([key, comment, value]) => {
    csvTranslations[getKey(key, comment)] = value;
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Object.entries(currentData.exportData.entries).forEach(([_scope, keysets]) => {
    const keySetsEntries = Object.entries(keysets);
    keySetsEntries.forEach(([key, meta]) => {
        const tkey = getKey(key, meta.comment || '');

        if (tkey in csvTranslations) {
            meta.translations[lang] = csvTranslations[tkey];
        } else {
            delete keysets[key];
        }
    });
});

importI18n({
    langs: [lang],
    data: currentData.exportData,
    pattern,
    funcName,
    sort: false,
});
