const { dialog, BrowserWindow } = require('electron').remote;
const Store = require('electron-store');
const Mustache = require('mustache');
const fs = require('fs');
const export_template = `
  <!DOCTYPE html>
  <html>
  <body>
  <h1>Order number {{order_num}}</h1>
  <p>Color: {{color}}</p>
  <p>Clothing Type: {{clothing_type}}</p>
  <p>Text on Front: {{front_text}}</p>
  <p>Text on Left Arm: {{left_arm_text}}</p>
  <p>Text on Right Arm: {{right_arm_text}}</p>
  <p>Text on Back: {{back_text}}</p>
  <p>Text on Hood: {{hood_text}}</p>
  <p>Other comments: {{other_comment}}</p>
  </body>
  </html>
`
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
  const save_promise = dialog.showSaveDialog({defaultPath: './clothing_order.json'});
  save_promise.then(function(value) {
    console.log('saving at: ' + value.filePath);
    fs.writeFileSync(value.filePath, JSON.stringify(store.store), 'utf-8');
  });
});

document.getElementById("export_btn").addEventListener("click", function(){
  window_to_PDF = new BrowserWindow({show : false});//to just open the browser in background
  const new_date = new Date();
  const date_str = new_date.getTime().toString();
  store.set('order_num', date_str.substring(0, date_str.length-3));
  fs.writeFileSync("./temp.html", Mustache.to_html(export_template, store.store));
  window_to_PDF.loadFile("./temp.html"); //give the file link you want to display
  const print_options = {
      landscape: false,
      marginsType: 0,
      printBackground: false,
      printSelectionOnly: false,
      pageSize: "A4",
  };
  window_to_PDF.webContents.on('did-finish-load', () => {
    window_to_PDF.webContents.printToPDF(print_options).then(data => {
      const path_promise = dialog.showSaveDialog({defaultPath: './order.pdf'});
      path_promise.then(function(value){
        fs.writeFile(value.filePath, data, (error) => {
          if (error) throw error
          console.log('Write PDF successfully.')
        });
      });
    }).catch(error => {
        console.log(error)
    });
  });
});

document.getElementById("type_select").addEventListener("change", function(){
  store.set('clothing_type', this.value);
});

document.getElementById("color_select").addEventListener("change", function(){
  store.set('color', this.value);
});

var strFrontInput = document.getElementById("front_toggle");
strFrontInput.style.display = "none";

document.getElementById("front_select").addEventListener("change", function(){
  var e = document.getElementById("front_select");
  var strFrontSelection = e.options[e.selectedIndex].text;
  var strFrontInput = document.getElementById("front_toggle");

  if (strFrontSelection == "No"){
    strFrontInput.style.display = "none";
  }

  else {
    strFrontInput.style.display = "block";
  }

});

document.getElementById("front_text").addEventListener("input", function(){
  store.set('front_text', this.value);
});

//set no display initially
var strLeftArmInput = document.getElementById("left_arm_toggle");
strLeftArmInput.style.display = "none";

document.getElementById("left_arm_select").addEventListener("change", function(){
  var e = document.getElementById("left_arm_select");
  var strLeftArmSelection = e.options[e.selectedIndex].text;
  var strLeftArmInput = document.getElementById("left_arm_toggle");

  if (strLeftArmSelection == "No"){
    strLeftArmInput.style.display = "none";
  }

  else {
    strLeftArmInput.style.display = "block";
  }

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