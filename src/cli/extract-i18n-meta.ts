/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';

import { Config, getExportData, loadConfig } from './utils';

const program = new Command();

program
    .option('-l, --langs <string>', 'Languages to generate, for example "ru,en"')
    .option('-f, --func <string>', 'Function name', 't')
    .option('--path <string>', 'Path or pattern to i18n root, for example "src/{components/*\\,utils\\,somepath}"')
    .option('-s, --stats', 'Show stats only')
    .option('-o, --out <string>', 'Output file')
    .option('-h, --hash <string>', 'Commit hash, use $(git rev-parse HEAD)')
    .option('--prefix <string>', 'Path prefix, relative to git root, use $(git rev-parse --show-prefix)')
    .option('-r, --repo <string>', 'Git repo link, use $(git config --get remote.origin.url)')
    .option('-c, --config <string>', 'Load config from file', './i18n.config.json');

program.parse(process.argv);

const opts = program.opts();

const { path: pattern, func: funcName, out: outFile, stats, hash, prefix, repo, langs } = loadConfig(
    path.resolve(opts.config),
    opts as Config,
);

const result = getExportData({
    pattern,
    langs,
    funcName,
    hash,
    prefix,
    repo,
});

const { exportData, totalKeys, keysTranslated } = result;

if (stats) {
    for (const lang of langs) {
        const value = (keysTranslated[lang] / totalKeys) * 100;
        console.log(`${lang}: ${value.toFixed(2)}%`);
    }
} else if (outFile) {
    const target = path.resolve(outFile);
    fs.writeFileSync(target, `${JSON.stringify(exportData, null, 4)}\n`, { encoding: 'utf8' });
} else {
    console.log(JSON.stringify(exportData, null, 4));
}
