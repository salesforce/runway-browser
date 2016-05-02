'use strict';

let files = {};

files.download = function(text, name, type) {
  let blob = new Blob([text], {type: type});
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

let readFile = file => new Promise((resolve, reject) => {
  let reader = new FileReader();
  reader.onload = e => resolve(e.target.result);
  reader.readAsText(file);
});

files.upload = type => new Promise((resolve, reject) => {
  let upload = document.createElement('input');
  upload.type = 'file';
  upload.accept = type;
  upload.addEventListener('change', () =>
    resolve(readFile(upload.files[0])));
  upload.click();
});

module.exports = files;
