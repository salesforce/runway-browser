

test: parser.js input.model.js
	node parser.js >output.json 2>&1 || echo Exit status $$? >>output.json
	git diff -w --exit-code output.json
