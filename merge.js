#!/usr/bin/env node

'use strict';

const fs = require('fs');
const yargs = require('yargs');
const path = require('path');
const _ = require('lodash');

yargs.command('*','start', async function () {
    let cfg = fs.readFileSync(path.resolve('./.jsonmergerc'), { encoding: 'utf-8' });
    cfg = JSON.parse(cfg.toString());

    let index = fs.readFileSync(path.resolve(cfg.indexPath), { encoding: 'utf-8' });
    index = JSON.parse(index.toString());

    let mixins = fs.readFileSync(path.resolve(cfg.mixinsPath), { encoding: 'utf-8' });
    mixins = JSON.parse(mixins.toString());

    let shift = null;
    if (/[0-9]+ [spaces|tabs]/.test(cfg.indent)) {
        let match = cfg.indent.match(/([0-9]+) (spaces|tabs)/);
        if (match[0]) {
            let [ , qty, type ] = match;
            if (type === 'spaces') {
                shift = ' '.repeat(qty);
            } else if (type === 'tabs') {
                shift = '\t'.repeat(qty);
            }
        }
    }

    cfg.languages.forEach(lang => {
        for (let newFile in index) {
            let newFileParts = index[newFile];

            newFileParts = newFileParts.map(part => part.startsWith(cfg.mixinPrefix) ? mixins[part.substr(7)] : part);
            newFileParts = _.flatten(newFileParts);

            let newMergedObject = {};

            newFileParts.forEach((part, i) => {
                let baseFilePath = `${cfg.basePath}/${lang}/${part}.json`;
                if (fs.existsSync(baseFilePath)) {

                    let fileContentBuffer = fs.readFileSync(baseFilePath, { encoding: 'utf-8' }),
                    fileContentObj = JSON.parse(fileContentBuffer);

                    Object.assign(newMergedObject, fileContentObj);
                } else {
                    if (cfg.console?.error?.indexOf('whenFileIsNotExist') > -1) {
                        console.error(`File is not exist! ${baseFilePath}`);
                    }
                }
                if (i === newFileParts.length - 1) {
                    let folder = newFile.split('/');
                    folder.pop();
                    fs.mkdirSync(`${cfg.destPath}/${lang}/${folder.join('/')}`, { recursive: true });

                    fs.writeFileSync(`${cfg.destPath}/${lang}/${newFile}.json`, JSON.stringify(newMergedObject, null, shift), 'utf-8');
                }

            });
            if (Object.keys(index).at(-1) === newFile && cfg.languages.at(-1) === lang) {
                console.log(`json i18n files: /${cfg.destPath}`);
            }
        }
    });
}).argv;
