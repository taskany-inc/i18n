/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';

import { Config, ExportFormat, importI18n, loadConfig } from './utils';

const program = new Command();

program
    .option('-l, --langs <string>', 'Languages to generate, for example "ru,en"')
    .option('--path <string>', 'Path or pattern to i18n root, for example "src/{components/*\\,utils\\,somepath}"')
    .option('-f, --func <string>', 'Function name', 't')
    .option('-i, --input <string>', 'Input file')
    .option('-s, --sort', 'Sort keys')
    .option('-c, --config <string>', 'Load config from file', './i18n.config.json');

program.parse(process.argv);

const opts = program.opts();

const { path: pattern, func: funcName, langs } = loadConfig(path.resolve(opts.config), opts as Config);
const { input, force, sort } = opts;

const source = path.resolve(input);

let fileJSON: ExportFormat;
try {
    const fileData = fs.readFileSync(source, { encoding: 'utf8' });
    fileJSON = JSON.parse(fileData);
} catch (e) {
    throw new Error(`File ${input} not found or not contain valid JSON`);
}

if (!force && fileJSON.meta.version !== '1.3.0') {
    throw new Error(`Version mismatch, given ${fileJSON.meta.version}, expected 1.3.0. Use --force to ignore version`);
}

importI18n({
    langs,
    data: fileJSON,
    pattern,
    funcName,
    sort,
});
