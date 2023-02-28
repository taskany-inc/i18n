/* eslint-disable no-console */
import fs from 'fs';
import { Command } from 'commander';
import stringify from 'csv-stringify/lib/sync';

import { Config, getExportData, loadConfig } from './utils';
import path from 'path';

const program = new Command();

program
    .option('-l, --lang <string>', 'Language to export')
    .option('-f, --func <string>', 'Function name', 't')
    .option('-p, --path <string>', 'Path or pattern to i18n root, for example "src/{components/*\\,utils\\,somepath}"')
    .option('-d, --delimiter <string>', 'Columns delimiter')
    .option('-o, --out <string>', 'Output file')
    .option('-c, --config <string>', 'Load config from file', './i18n.config.json');

program.parse(process.argv);

const opts = program.opts();

const { func: funcName, path: pattern, out: outFile, delimiter } = loadConfig(
    path.resolve(opts.config),
    opts as Config,
);

const lang = opts.lang as string;
if (!lang) {
    throw new Error('Argument "lang" is not defined');
}

const result = getExportData({
    pattern,
    langs: [lang],
    funcName,
    hash: '',
    prefix: '',
    repo: '',
});

const csvData: string[][] = [];

Object.entries(result.exportData.entries).forEach(([_, entryData]) => {
    Object.entries(entryData).forEach(([key, meta]) => {
        csvData.push([key, meta.comment || '', meta.translations[lang]]);
    });
});

const csvResult = stringify(csvData, { delimiter });

fs.writeFileSync(outFile, csvResult, { encoding: 'utf8' });
