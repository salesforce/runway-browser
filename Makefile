# empty string to terminate multi-line lists
NULL=

.PHONY: setup
setup: bower_components/parsimmon/build/parsimmon.commonjs.js \
       node_modules/jsfmt/bin/jsfmt \
       node_modules/mocha/bin/mocha \
       $(NULL)

node_modules/jsfmt/bin/jsfmt:
	mkdir -p node_modules
	npm install jsfmt

node_modules/jsfmt/bin/mocha:
	mkdir -p node_modules
	npm install mocha

bower_components/parsimmon/Makefile:
	bower install

bower_components/parsimmon/build/parsimmon.commonjs.js: bower_components/parsimmon/Makefile
	(cd bower_components/parsimmon; make build/parsimmon.commonjs.js)


.PHONY: test
test: unit-test system-test

.PNONY: unit-test
unit-test: $(wildcard *-test.js)
	./node_modules/mocha/bin/mocha $^

.PHONY: system-test
system-test: system-test-parser system-test-parser-tokenring

.PHONY: system-test-parser
system-test-parser: parser.js input.model
	node parser.js >output.json 2>&1 || echo Exit status $$? >>output.json
	git diff -w --exit-code output.json

.PHONY: system-test-parser-tokenring
system-test-parser-tokenring: parser.js tokenring.model
	node parser.js tokenring.model >output-tokenring.json 2>&1 || echo Exit status $$? >>output-tokenring.json
	git diff -w --exit-code output-tokenring.json

.PHONY: format
format: $(shell git ls-files *.js)
	./node_modules/jsfmt/bin/jsfmt --write $^
