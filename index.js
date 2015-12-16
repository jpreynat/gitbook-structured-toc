var headers = new (require('./lib/Headers'))();
var toc = new (require('./lib/TOC'))();
var fs = require('fs');

module.exports = {
    hooks: {
        // during html generation
        "finish": function (context) {
            var book = this;
            var placeHolder = /<!-- toc -->/g;
            headers.sortPages();
            var processPage = function (section, pagePath) {
                var generateToc = function () {
                    return toc.generate(headers, pagePath);
                }
                var newSection = section.replace(placeHolder, generateToc);
                return newSection;
            };
            var output = book.context.config.output;
            headers.pages.forEach(function (page) {
                var fullPath = output + '/' + page.path;
                var data = fs.readFileSync(fullPath).toString();
                var newData = processPage(data, page.path)
                if (newData != data) {
                    book.log.info('Writing TOC in file: ', page.path, '\n')
                    fs.writeFileSync(fullPath, newData);
                }
            });
        },
        "init": function () {
            headers.configure(this.options.pluginsConfig["gitbook-structured-toc"], this.log);
        },
        // After html generation
        "page": function (page) {
            if (this.options.generator != 'website') {
                return page;
            }

            var pagePath = this.contentPath(page.path);
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
            page.sections.forEach(function (section) {
                section.content =
                    headers.linkHeaders(section.content, pagePath, pageIndex, this.log);
            });
            return page;
        }
    }
};