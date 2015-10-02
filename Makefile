
.PHONY: setup
setup: bower_components/parsimmon/build/parsimmon.commonjs.js

bower_components/parsimmon/Makefile:
	bower install

bower_components/parsimmon/build/parsimmon.commonjs.js: bower_components/parsimmon/Makefile
	(cd bower_components/parsimmon; make build/parsimmon.commonjs.js)



test: parser.js input.model.js
	node parser.js >output.json 2>&1 || echo Exit status $$? >>output.json
	git diff -w --exit-code output.json
