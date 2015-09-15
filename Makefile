

test: parser.js input.model.js
	node parser.js >output.json 2>&1
	git diff --exit-code output.json
