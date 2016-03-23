# empty string to terminate multi-line lists
NULL=

ALLJSFILES=$(shell git ls-files '*.js' '**/*.js')
TESTJSFILES=$(shell git ls-files '*-test.js' '**/*-test.js')

NODE ?= node
NPM ?= npm

ESLINT ?= $(NODE) node_modules/eslint/bin/eslint.js
JSFMT ?= $(NODE) node_modules/jsfmt/bin/jsfmt
MOCHA ?= $(node) node_modules/mocha/bin/mocha
WEBPACK ?= $(node) node_modules/webpack/bin/webpack.js

.PHONY: all
all: bundle.js

.PHONY: setup
setup: npm_setup \
       $(NULL)

npm_setup:
	$(NPM) install

.PHONY: test
test: unit-test

.PNONY: unit-test
unit-test: $(TESTJSFILES)
	$(MOCHA) $^

.PHONY: format
format: $(ALLJSFILES)
	$(JSFMT) --write $^

.PHONY: lint
lint: $(ALLJSFILES)
	$(ESLINT) $(ALLJSFILES)

bundle.js: $(ALLJSFILES)
	$(WEBPACK)

README.html: README.md
	markdown $< >$@
