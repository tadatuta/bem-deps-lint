#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    walker = require('bem-walk'),
    naming = require('bem-naming'),
    argv = process.argv;

require('coa').Cmd()
    .name(argv[1])
    .title('bem deps linter')
    .helpful()
    .opt()
        .name('version')
        .title('Version')
        .short('v')
        .long('version')
        .flag()
        .end()
    .opt()
        .name('deps')
        .title('Deps bundle')
        .short('d')
        .long('deps')
        .end()
    .opt()
        .name('level')
        .title('Level')
        .short('l')
        .long('level')
        .arr()
        .end()
    .act(function(opts) {
        if (opts.version) return require('./package.json').version;

        var levels = opts.level,
            pathToDepsFile = path.resolve('.', opts.deps || 'desktop.bundles/index/index.deps.js');

        if (!fs.existsSync(pathToDepsFile)) return 'No deps bundle found :(';

        var deps = _.uniq(require(pathToDepsFile)
            .deps.map(function(entity) {
                entity.mod && (entity.modName = entity.mod);
                entity.val && (entity.modVal = entity.val);
                return naming.stringify(entity);
            })),
        entitiesOnFS = [],
        collectedLevels = [],
        lookForLevelsAt = ['.'];

        if (!opts.deps) console.log('Path to deps file was not specified, trying to use', pathToDepsFile, 'instead');

        levels ? onGotLevels(levels) : walker(lookForLevelsAt, { scheme: 'flat' })
            .on('data', function(entity) {
                entity.tech === 'blocks' && collectedLevels.push(entity.path);
            })
            .on('end', function() {
                console.log('No levels were specified, found', collectedLevels, 'automatically');
                onGotLevels(collectedLevels);
            })

        function onGotLevels(levels) {
            walker(levels)
                .on('data', function(entity) {
                    entitiesOnFS.push(entity.bem);

                    if (!(entity.modVal && entity.modVal !== true)) return;

                    _.remove(deps, function(dep) {
                        entity.modVal = true;
                        return dep === naming.stringify(entity);
                    });
                })
                .on('end', function() {
                    console.log(_.difference(deps, _.uniq(entitiesOnFS)));
                });
        }
    })
    .run(argv.slice(2));
