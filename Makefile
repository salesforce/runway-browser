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
       compiler_setup \
       $(NULL)

npm_setup:
	$(NPM) install

compiler_setup:
	test -d node_modules/runway-compiler || (\
	cd node_modules && \
	URL=$$(dirname $$(git ls-remote --get-url))/runway-compiler.git && \
	echo cloning $$URL && \
	git clone $$URL && \
	cd runway-compiler && \
	make setup)

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
