var assert = require('assert');
var cheerio = require('cheerio');

var Headers = require('../lib/Headers');

describe('Headers', function () {

    var headers;
    beforeEach(function (done) {
        headers = new Headers();
        done();
    });

    describe('#idForText()', function () {
        it('should strip whitespace', function () {
            assert.equal(headers.idForText('  lost   in  space'), 'lost-in-space');
        })
        it('should strip non-ascii characters', function () {
            assert.equal(headers.idForText('Äaardvaäöü$§®rK'), 'aardva-rk');
        })
    });

    describe('#identify()', function () {
        it('should generate an id if missing', function () {
            var $ = cheerio('<h1>Header</h1>');
            headers.identify($);
            assert.equal($.attr('id'), 'header');
        });
        it('should leave an existing id untouched', function () {
            var $ = cheerio('<h1 id="existing">Header</h1>');
            headers.identify($);
            assert.equal($.attr('id'), 'existing');
        });
        it('should delegate to custom id generator', function () {
            var $ = cheerio('<h1>Header</h1>');
            var id = 'not-generated';
            headers.idGenerator = function () {
                return id
            };
            headers.identify($);
            assert.equal($.attr('id'), id);
        });

    });

    describe('#configure()', function () {
        it('should accept levels parameter', function () {
            headers.configure({'levels': 3});
            assert.equal(headers.maxLevel, 3);
        });
        it('should reject bad levels parameter', function () {
            var warned = false;
            var original = headers.maxLevel;
            var log = function () {
                this.warn = function (args) {
                    warned = true;
                }
            };
            headers.configure({'levels': 30}, new log());
            assert.equal(headers.maxLevel, original);
            assert.equal(warned, true);
        });
        it('should accept custom id generator method', function () {
            var general = function () {
                return '42';
            }
            headers.configure({
                'idGenerator': general
            });
            assert.equal(headers.idGenerator, general);
        })
    });
    describe('#buildSelector()', function () {
        it('should generate selectors for all levels', function () {
            headers.maxLevel = 3;
            assert.equal(headers.buildSelector(), 'h1, h2, h3');
        });
        it('should generate selector for h1 only if level is invalid', function () {
            headers.maxLevel = -23;
            assert.equal(headers.buildSelector(), 'h1');
        });
        it('should generate selector for h1 to h6 only', function () {
            headers.maxLevel = 23;
            assert.equal(headers.buildSelector(), 'h1, h2, h3, h4, h5, h6');
        });
    });
    describe('#linkHeaders()', function () {
        var html = '<h1>Top</h1><h2>Middle</h2><h2>Bottom</h2>';
        var path = 'index.html';
        it('should insert IDs', function () {
            assert.equal(
                headers.linkHeaders(html, path),
                '<h1 id="top">Top</h1><h2 id="middle">Middle</h2><h2 id="bottom">Bottom</h2>'
            );
        });
        it('should store pages and headers', function () {
            headers.linkHeaders(html, path);
            assert.equal(headers.pages.length, 1);
            assert.equal(headers.pages[0].path, path);
            assert.equal(headers.pages[0].headers.length, 3);
        });
    });

});