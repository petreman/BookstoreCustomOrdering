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
const print_options = {
  landscape: false,
  marginsType: 0,
  printBackground: false,
  printSelectionOnly: false,
  pageSize: "A4",
};
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

document.getElementById("new_order_btn").addEventListener("click", function(){
  const new_date = new Date();
  const date_str = new_date.getTime().toString();
  store.set('order_num', date_str.substring(0, date_str.length-3));
  refreshOrderNumberDisplay();
})

function refreshOrderNumberDisplay() {
  document.getElementById("order_num_disp").innerHTML = store.get("order_num", "ORDER NUM NOT SET");
}

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
  fs.writeFileSync("./tmp/temp.html", Mustache.to_html(export_template, store.store));
  window_to_PDF.loadFile("./tmp/temp.html"); //give the file link you want to display
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

//initializations
//these are just initial calls to each's listener, 
//as the listener only listens for changes

//type
let type_init = document.getElementById("type_select");
store.set('clothing_type', type_init.options[type_init.selectedIndex].text);

//color
let color_init = document.getElementById("color_select");
store.set('color', color_init.options[color_init.selectedIndex].text);

setSelectListener("front");
setSelectListener("left_arm");
setSelectListener("right_arm");
setSelectListener("back");
setSelectListener("hood");
setUpdateListener("other_comment");

document.getElementById("type_select").addEventListener("change", function(){
  store.set('clothing_type', this.value);
   
  let strTypeSelection = e.options[e.selectedIndex].text;
  let hoodOption = document.getElementById("hood_option");

  if (strTypeSelection == "Hoodie"){
    hoodOption.style.display = "block"
  }

  else {
    hoodOption.style.display = "none"
  }

});

document.getElementById("color_select").addEventListener("change", function(){
  store.set('color', this.value);
});

document.getElementById("front_select").addEventListener("change", function(){
  setSelectListener("front");
});

document.getElementById("front_text").addEventListener("change", function(){
  setUpdateListener("front")
});

document.getElementById("left_arm_select").addEventListener("change", function(){
  setSelectListener("left_arm");
});  

document.getElementById("left_arm_text").addEventListener("change", function(){
  setUpdateListener("left_arm");
});

document.getElementById("right_arm_select").addEventListener("change", function(){
  setSelectListener("right_arm");
});  

document.getElementById("right_arm_text").addEventListener("change", function(){
  setUpdateListener("right_arm");
});

document.getElementById("back_select").addEventListener("change", function(){
  setSelectListener("back");
});  

document.getElementById("back_text").addEventListener("change", function(){
  setUpdateListener("back");
});

document.getElementById("hood_select").addEventListener("change", function(){
  setSelectListener("hood");
});  

document.getElementById("hood_text").addEventListener("change", function(){
  setUpdateListener("hood");
});

document.getElementById("other_comment").addEventListener("change", function(){
  setUpdateListener("other_comment");
});

function setSelectListener(name){

  let selectName = name + "_select";
  let toggleName = name + "_toggle";
  let textName = name + "_text";

  let e = document.getElementById(selectName);
  let strSelection = e.options[e.selectedIndex].text;
  let strInput = document.getElementById(toggleName);

  //if option not selected, hide front message box and update json
  if (strSelection == "No"){
    strInput.style.display = "none";
    store.set(textName, "n/a");
  }

  else {
    strInput.style.display = "block";

    //empty message box is the same as "n/a"
    if (document.getElementById(textName).value != ''){
      store.set(textName, document.getElementById(textName).value);
    }
    
    else{
      store.set(textName, "n/a");
    }
  }

}

function setUpdateListener(name){

  let textName;

  if (name != "other_comment"){
    textName = name + "_text";
  }

  else {
    textName = "other_comment";
  }
  
  let textContent = document.getElementById(textName).value;
  
  //empty message box is the same as "n/a"
  if (textContent != ''){
    store.set(textName, textContent);
  }
  
  else{
    store.set(textName, "n/a");
  }

}
