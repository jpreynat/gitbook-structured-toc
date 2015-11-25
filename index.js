var identify = require('identify');
var cheerio = require('cheerio');
var relative = require('relative');
var fs = require('fs');
var structure = [];
var pages = [];
var counter = 0;

var removeTags = function (str) {
    return str.replace(/\{\{.*?\}\}/g, '').replace(/\{.*?\}/g, '').trim();
}
var extractHeaderInfo = function (str) {
    var level = 0;
    var trimmed = str.trim();
    var rest = '';
    for (var i = 0; i < trimmed.length; i++) {
        if (trimmed.charAt(i) == '#') {
            level++;
        } else {
            rest = trimmed.substring(i).trim();
            break;
        }
    }
    var sanitized = removeTags(rest);
    return {'level': level, 'content': sanitized, 'rawContent': rest}
};
var link = function (headerInfo, pagePath) {
    var targetFile = headerInfo.file;
    var sourceFile = pagePath;
    return relative(sourceFile, targetFile) + '#' + headerInfo.id;
}

module.exports = {
    hooks: {
        // during html generation
        "finish": function (context) {
            var book = this;
            var placeHolder = /<!-- toc -->/g;
            structure.sort(function (left, right) {
                var leftIndex = left.pageIndex * 1000 + left.counter;
                var rightIndex = right.pageIndex * 1000 + right.counter;
                return leftIndex - rightIndex;
            })
            var processPage = function (section, pagePath) {
                var generateToc = function () {
                    book.log.info("Generating TOC.\n")
                    var $ = cheerio.load('<div />');
                    var root = $('div');
                    var lastNode = root;
                    var lastLevel = 0;
                    structure.forEach(function (headerInfo) {
                        var level = headerInfo.level;
                        if (level > lastLevel) {
                            lastNode.append('<ol><li/></ol>');
                        } else if (level < lastLevel) {
                            lastNode.parent().parent().after('<li/>');
                        } else {
                            lastNode.after('<li />');
                        }
                        lastNode = root.find('ol li').last();
                        lastLevel = level;
                        lastNode.append('<a href="' + link(headerInfo, book.contentPath(pagePath))
                                        + '">'
                                        + headerInfo.content + '</a>');
                    });
                    return root.html();
                }
                var newSection = section.replace(placeHolder, generateToc);
                return newSection;
            };
            var output = book.context.config.output;
            pages.forEach(function (pagePath) {
                var fullPath = output + '/' + pagePath;
                var data = fs.readFileSync(fullPath).toString();
                var newData = processPage(data, pagePath)
                if (newData != data) {
                    book.log.info('Writing TOC in file: ', pagePath, '\n')
                    fs.writeFileSync(fullPath, newData);
                }
            });
        },
        // Before html generation
        "page:before": function (page) {
            if (this.options.generator != 'website') {
                return page;
            }

            var book = this;
            var $ = cheerio;
            var config = this.options.pluginsConfig["gitbook-structured-toc"] || {};
            var maxLevel = config.levels || 2;
            var newContent = [];
            var pagePath = book.contentPath(page.path);
            var findPageIndex = function () {
                var index = -1;
                page.progress.chapters.forEach(function (chapter, ix) {
                    if (chapter.path == page.path) {
                        index = ix;
                    }
                });
                return index;
            }
            var pageIndex = findPageIndex();
            pages.push(pagePath);
            page.content.split('\n').forEach(function (line, index) {
                var headerInfo = extractHeaderInfo(line);
                if (headerInfo.level > 0) {
                    var header = identify('<h' + headerInfo.level + '>' + headerInfo.rawContent
                                          + '</h'
                                          + headerInfo.level + '>');
                    newContent.push(header);
                    var id = $(header).attr('id');
                    headerInfo.id = id;
                    headerInfo.pageIndex = pageIndex;
                    headerInfo.counter = counter++;
                    headerInfo.file = pagePath;
                    structure.push(headerInfo);
                } else {
                    newContent.push(line);
                }
            });
            page.content = newContent.join('\n');
            return page;
        }
    }
};