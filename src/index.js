/*
index.js

Javascript file for the index.html page.
Majority of methods are used to pass data between input areas and the Store.

Authors: Jinzhe Li, Philippe Nadon, Keegan Petreman
*/

const { app, dialog, BrowserWindow } = require('electron').remote;
const Store = require('electron-store');
const Mustache = require('mustache');
const fs = require('fs');
const export_template = `
  <!DOCTYPE html>
  <html>
  <body>
  <h1>Order number {{order_num}}</h1>
  <p>Name: {{first_name_text}}</p>
  <p>Name: {{last_name_text}}</p>
  <p>Email: {{email_text}}</p>
  <p>Phone number: {{phone_number_text}}</p>
  <p>Clothing Type: {{clothing_type}}</p>
  <p>Color: {{color}}</p>
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

let store;
try {
  const store_path = app.getPath('userData') + '/config.json';
  console.log(store_path);
  const store_data = JSON.parse(fs.readFileSync(store_path));
  console.log(store_data);
  store = new Store();
  store.store = store_data;
  setLoadedValues();
} catch {
  console.log('failed to load data');
  store = new Store();
}

if( store.get('img_location')) {
  loadImages();
}

document.getElementById("load_btn").addEventListener("click", function(){
  const file_promise = dialog.showOpenDialog({ properties: ['openFile'] });
  file_promise.then(function(value) {
    store.store = JSON.parse(fs.readFileSync(value.filePaths[0]));
    setLoadedValues();
  });

});

document.getElementById("new_order_btn").addEventListener("click", function(){
  const new_date = new Date();
  const date_str = new_date.getTime().toString();
  store.clear();
  store.set('order_num', date_str.substring(0, date_str.length-3));
  refreshOrderNumberDisplay();
})

function refreshOrderNumberDisplay() {
  document.getElementById("order_num_disp").innerHTML = "Order #" + store.get("order_num", "ORDER NUM NOT SET");
}

document.getElementById("img_btn").addEventListener("click", function(){
  const img_promise = dialog.showOpenDialog({ properties: ['openDirectory'] });
  img_promise.then(function(value) {
    store.set('img_location', value.filePaths[0]);
    loadImages();
  });
});

function loadImages() {
  const img_dir = store.get('img_location');
  document.getElementById('type_img').setAttribute('src', img_dir + '/type_img.png');
  document.getElementById('color_img').setAttribute('src', img_dir + '/color_img.png');
  document.getElementById('front_img').setAttribute('src', img_dir + '/front_img.png');
  document.getElementById('left_arm_img').setAttribute('src', img_dir + '/left_arm_img.png');
  document.getElementById('right_arm_img').setAttribute('src', img_dir + '/right_arm_img.png');
  document.getElementById('back_img').setAttribute('src', img_dir + '/back_img.png');
  document.getElementById('hood_img').setAttribute('src', img_dir + '/hood_img.png');
}

document.getElementById("save_btn").addEventListener("click", function(){
  const save_promise = dialog.showSaveDialog({defaultPath: './clothing_order.json'});
  save_promise.then(function(value) {
    fs.writeFileSync(value.filePath, JSON.stringify(store.store), 'utf-8');
  });
});

document.getElementById("export_btn").addEventListener("click", function(){
  refreshStore();
  window_to_PDF = new BrowserWindow({show : false});//to just open the browser in background
  fs.writeFileSync("./temp.html", Mustache.to_html(export_template, store.store));
  window_to_PDF.loadFile("./temp.html"); //give the file link you want to display
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

//initialization
refreshStore();

document.getElementById("type_select").addEventListener("change", function(){
  store.set('clothing_type', this.value);
  let strTypeSelection = this.options[this.selectedIndex].text;
  let hoodOption = document.getElementById("hood_option");

  if (strTypeSelection == "Hoodie"){
    hoodOption.style.display = "flex"
  }

  else {
    hoodOption.style.display = "none"
  }

});

document.getElementById("first_name_text").addEventListener("change", function(){
  setUpdateListener("first_name")
});

document.getElementById("last_name_text").addEventListener("change", function(){
  setUpdateListener("last_name")
});

document.getElementById("email_text").addEventListener("change", function(){
  setUpdateListener("email")
});

document.getElementById("phone_number_text").addEventListener("change", function(){
  setUpdateListener("phone_number")
});

document.getElementById("color_select").addEventListener("change", function(){
  store.set('color', this.value);
});

document.getElementById("front_text").addEventListener("change", function(){
  setUpdateListener("front")
});

document.getElementById("left_arm_text").addEventListener("change", function(){
  setUpdateListener("left_arm");
});

document.getElementById("right_arm_text").addEventListener("change", function(){
  setUpdateListener("right_arm");
});

document.getElementById("back_text").addEventListener("change", function(){
  setUpdateListener("back");
});

document.getElementById("hood_text").addEventListener("change", function(){
  setUpdateListener("hood");
});

document.getElementById("other_comment").addEventListener("change", function(){
  setUpdateListener("other_comment");
});

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

function setLoadedValues(){

  let index = 0;

  refreshOrderNumberDisplay();

  switch (store.get("clothing_type").toLowerCase()){
    case "hoodie":
      index = 0;
      document.getElementById("hood_option").style.display = "flex"
      break;
    
    case "crewneck":
      index = 1;
      document.getElementById("hood_option").style.display = "none"
      break;
  }
    
  document.getElementById("type_select").selectedIndex = index;

  switch (store.get("color").toLowerCase()){
    case "green":
      index = 0;
      break;
    
    case "gray":
      index = 1;
      break;
  }

  document.getElementById("color_select").selectedIndex = index;

  setLoadedText("first_name");
  setLoadedText("last_name");
  setLoadedText("email");
  setLoadedText("phone_number");
  setLoadedText("front");
  setLoadedText("left_arm");
  setLoadedText("right_arm");
  setLoadedText("back");
  setLoadedText("hood");
  setLoadedText("other_comment")
}

function setLoadedText(name){

  let textName;

  if (name != "other_comment"){
    textName = name + "_text";
  }

  else {
    textName = "other_comment";
  }

  if (store.get(textName) === "n/a" || store.get(textName) === "undefined"){
    document.getElementById(textName).value = "";
  }

  else{
    document.getElementById(textName).value = store.get(textName);
  }

}

document.getElementById("first_name_disp").innerHTML = "Your first name is: " + store.get("first_name_text");
document.getElementById("last_name_disp").innerHTML = "Your last name is: " + store.get("last_name_text");
document.getElementById("email_disp").innerHTML = "Your email adress is: " + store.get("email_text");
document.getElementById("phone_number_disp").innerHTML = "Your phone number is: " + store.get("phone_number_text");
document.getElementById("left_arm_disp").innerHTML = "Your customization for left arm is: " + store.get("left_arm_text");
document.getElementById("right_arm_disp").innerHTML = "Your customization for right arm is: " + store.get("right_arm_text");
document.getElementById("back_disp").innerHTML = "Your customization for back is: " + store.get("back_text");
document.getElementById("hood_disp").innerHTML = "Your customization for hood is: " + store.get("hood_text");
document.getElementById("other_comment_disp").innerHTML = "Your other comment is: " + store.get("other_comment");

function refreshStore(){
  
  //type
  let type_init = document.getElementById("type_select");
  store.set('clothing_type', type_init.options[type_init.selectedIndex].value);

  //color
  let color_init = document.getElementById("color_select");
  store.set('color', color_init.options[color_init.selectedIndex].value);

  setUpdateListener("first_name");
  setUpdateListener("last_name");
  setUpdateListener("email");
  setUpdateListener("phone_number");
  setUpdateListener("front");
  setUpdateListener("left_arm");
  setUpdateListener("right_arm");
  setUpdateListener("back");
  setUpdateListener("hood");
  setUpdateListener("other_comment")
}