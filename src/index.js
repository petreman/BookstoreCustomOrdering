const { dialog } = require('electron').remote;
const Store = require('electron-store');
const fs = require('fs');

const store = new Store();

document.getElementById("load_btn").addEventListener("click", function(){
  const file_promise = dialog.showOpenDialog({ properties: ['openFile'] });
  file_promise.then(function(value) {
    console.log('loading file from:');
    console.log(value.filePaths[0]);
    store.store = JSON.parse(fs.readFileSync(value.filePaths[0]));
    console.log('loaded:');
    console.log(store.store);
  });
});

document.getElementById("img_btn").addEventListener("click", function(){
  const img_promise = dialog.showOpenDialog({ properties: ['openDirectory'] });
  img_promise.then(function(value) {
    console.log('setting img directory to:');
    console.log(value.filePaths[0]);
    store.set('img_location', value.filePaths[0]);
  });
});

document.getElementById("save_btn").addEventListener("click", function(){
  const save_promise = dialog.showSaveDialog();
  save_promise.then(function(value) {
    console.log('saving at: ' + value.filePath);
    fs.writeFileSync(value.filePath, JSON.stringify(store.store), 'utf-8');
  });
});

document.getElementById("type_select").addEventListener("change", function(){
  store.set('clothing_type', this.value);
});

document.getElementById("color_select").addEventListener("change", function(){
  store.set('color', this.value);
});

document.getElementById("front_text").addEventListener("input", function(){
  store.set('front_text', this.value);
});

document.getElementById("left_arm_text").addEventListener("input", function(){
  store.set('left_arm_text', this.value);
});

document.getElementById("right_arm_text").addEventListener("input", function(){
  store.set('right_arm_text', this.value);
});

document.getElementById("hood_text").addEventListener("input", function(){
  store.set('hood_text', this.value);
});

document.getElementById("back_text").addEventListener("input", function(){
  store.set('back_text', this.value);
});

document.getElementById("other_comment").addEventListener("input", function(){
  store.set('other_comment', this.value);
});

