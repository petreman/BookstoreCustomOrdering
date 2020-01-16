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
  <h1>Order #{{order_num}}</h1>
  <p>Clothing Type: {{type}}</p>
  <p>Color: {{color}}</p>
  <p>Front: {{front_text}}</p>
  <p>Left Arm: {{left_arm_text}}</p>
  <p>Right Arm: {{right_arm_text}}</p>
  <p>Back: {{back_text}}</p>
  <p>Hood: {{hood_text}}</p>
  <p>Other Comments: {"comment_text"}</p>
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
  setFromStore();
} catch {
  console.log('failed to load data');
  store = new Store();
}

if(store.get('img_location')) {
  loadImages();
}

//variables
let type; //will be used to check if hood option should be taken
let currentSection = "welcome_section";
let selects = ["type", "color", "size"];
let customizationSections = ["type", "front", "left_arm", "right_arm", "back", "hood", "comment"]

//initialization
updateStore();
disableNavButtons();
setSelectListeners();
setTextListeners();

document.getElementById("welcome_new").addEventListener("click", function(){
  const new_date = new Date();
  const date_str = new_date.getTime().toString();
  store.clear();
  store.set('order_num', date_str.substring(0, date_str.length-3));
  refreshOrderNumberDisplay();
  document.getElementById("order_num_disp").style.display = "inline-block";
  goToNextSection();
  setDefaults();
});

document.getElementById("next_button").addEventListener("click", function(){
  goToNextSection();
});

document.getElementById("load_btn").addEventListener("click", function(){
  const file_promise = dialog.showOpenDialog({ properties: ['openFile'] });
  file_promise.then(function(value) {
    store.store = JSON.parse(fs.readFileSync(value.filePaths[0]));
    setFromStore();
  });

});

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
  updateStore();
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

function setSelectListeners(){
  
  for (let i = 0 ; i < selects.length ; i++){
    
    document.getElementById((selects[i] + "_select")).addEventListener("change", function(){
      
      store.set(selects[i], this.value);
      
      //even though the selects are all uniquely names, they are all placed
      //in the "type" section
      defaultCheck("type_section");

      if (i === "type"){
        type = this.value;
      }

    });

  }

}

/**
 * Sets all the listeners for text input areas
 */
function setTextListeners(){

  for (let i = 1 ; i < customizationSections.length ; i++){
    document.getElementById( (customizationSections[i] + "_text") ).addEventListener("change", function(){
      updateStoreFromTextArea(i);
    });
  }

}

function refreshOrderNumberDisplay() {
  document.getElementById("order_num_disp").innerHTML = "Order #" + store.get("order_num", "ORDER NUM NOT SET");
}

function enableNavButtons(){
  document.getElementById("nav").style.display = "flex";
  document.getElementById("order_num_disp").style.display = "flex";
}

function disableNavButtons(){
  document.getElementById("nav").style.display = "none";
  document.getElementById("order_num_disp").style.display = "none";
}

function setFromStore(){

  let index = 0;

  refreshOrderNumberDisplay();

  switch (store.get("type").toLowerCase()){
    case "hoodie":
      index = 0;
      type = "hoodie"
      break;
    
    case "crewneck":
      index = 1;
      type = "crewneck"
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

  for (i = 1 ; i < customizationSections.length ; i++){
    setTextAreaFromStore(customizationSections[i]);
  }

}

function setTextAreaFromStore(name){

  let textName = name + "_text";
  
  if (store.get(textName) === "n/a" || store.get(textName) === "undefined"){
    document.getElementById(textName).value = "";
  }

  else{
    document.getElementById(textName).value = store.get(textName);
  }

}

function updateStoreFromTextArea(name){

  let textName = name + "_text";
  let textContent = document.getElementById(textName).value;
  
  //empty message box is the same as "n/a"
  if (textContent != ''){
    store.set(textName, textContent);
  }
  
  else{
    store.set(textName, "n/a");
  }

}

function updateStore(){
  
  //type
  let type_init = document.getElementById("type_select");
  store.set('type', type_init.options[type_init.selectedIndex].value);

  //color
  let color_init = document.getElementById("color_select");
  store.set('color', color_init.options[color_init.selectedIndex].value);

  for (i = 1 ; i < customizationSections.length ; i++){
    updateStoreFromTextArea(customizationSections[i]);
  }

}

/**
 * Goes to the next section based on what the current one is
 */
function goToNextSection(){

  switch (currentSection){
    
    case "welcome_section":
      nextSection = "type_section"
      document.getElementById("prev_button").disabled = true;
      document.getElementById("nav").style.display = "table";
      defaultCheck(nextSection);
      break;

    case "type_section":
      nextSection = "front_section"
      document.getElementById("prev_button").disabled = false;
      document.getElementById("next_button").disabled = true;
      document.getElementById(currentSection).style.display = "none";
      document.getElementById(nextSection).style.display = "flex";
      defaultCheck(nextSection);
      break;

  }

  document.getElementById(currentSection).style.display = "none";
  document.getElementById(nextSection).style.display = "flex";
  currentSection = nextSection;

  checkIfWelcomeSection();

}

/**
 * Checks to see if the provided section has any default/unchanged values. If there are,
 * can't progress to the next section.
 * 
 * @param {*} section - the section to be checking
 * 
 */
function defaultCheck(section){

  switch (section){
    
    case "type_section":
      if (document.getElementById("type_select").value !== "none" &&
          document.getElementById("color_select").value !== "none" && 
          document.getElementById("size_select").value !== "none"){
        document.getElementById("next_button").disabled = false;
      }

      else {
        document.getElementById("next_button").disabled = true;
      } 

      break;
      
    case "front_section": 
      break;
  }

}

/**
 * Sets all changeable areas to their default values.
 * Inteneded to be used when a new order is started.
 */
function setDefaults(){
  
  document.getElementById("type_select").selectedIndex = 0;
  document.getElementById("color_select").selectedIndex = 0;
  document.getElementById("size_select").selectedIndex = 0;
  
  document.getElementById("front_text").value = "";
  document.getElementById("left_arm_text").value = "";
  document.getElementById("right_arm_text").value = "";
  document.getElementById("back_text").value = "";
  document.getElementById("hood_text").value = "";

}

/**
 * Hides the prev and next buttons if on the welcome screen
 */ 
function checkIfWelcomeSection(){
  
  if (currentSection === "welcome_section"){
    disableNavButtons();
  }
  
  else {
    enableNavButtons();
  }

}
