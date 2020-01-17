/*
index.js

Javascript file for the index.html page.
Majority of methods are used to pass data between input areas and the Store.

Authors: Jinzhe Li, Philippe Nadon, Keegan Petreman
*/
"use strict";
const { app, dialog, BrowserWindow } = require('electron').remote;
const Store = require('electron-store');
const Mustache = require('mustache');
const fs = require('fs');
// See sheets.js for example usage
const { newOrder, updateOrder, getOrders, setSettings, getSetting } = require('./sheets.js');
const spreadsheetId = "1aixHLxNdPxsiiW-ohgGl70US3NMg8RnyXaGkti3Xzsc";
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
  <p>Front: {{front_text}}</p>
  <p>Left Arm: {{left_arm_text}}</p>
  <p>Right Arm: {{right_arm_text}}</p>
  <p>Back: {{back_text}}</p>
  <p>Hood: {{hood_text}}</p>
  <p>Other Comments: {{comment_text}}</p>
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
//variables
let type; //will be used to check if hood option should be taken
let currentSection = "welcome_section";
let welcomeInputs = ["first_name", "last_name", "email", "phone_number"];
let typeSelects = ["type", "color", "size"];
let customizationSections = ["type", "front", "left_arm", "right_arm", "back", "hood", "comment"]

try {
  const store_path = app.getPath('userData') + '/config.json';
  console.log(store_path);
  const store_data = JSON.parse(fs.readFileSync(store_path));
  console.log(store_data);
  store = new Store();
  store.store = store_data;
  setFromStore();
} catch (error) {
  console.log(error);
  store = new Store();
}

if(fs.existsSync(app.getPath("userData") + "/img_location.txt")) {
  console.log("image location found");
  loadImages();
} else {
  console.log("image location not found");
}

//initialization
updateStore();
disableNavButtons();
disableNewOrderButton();
setWelcomeInputListeners();
setSelectListeners();
setTextListeners();
setCustomizationSelectListeners();

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

document.getElementById("prev_button").addEventListener("click", function(){
  goToPrevSection();
});

document.getElementById("load_btn").addEventListener("click", function(){
  const file_promise = dialog.showOpenDialog({ properties: ['openFile'] });
  file_promise.then(function(value) {
    if (value.canceled) return;
    store.store = JSON.parse(fs.readFileSync(value.filePaths[0]));
    setFromStore();
  });

});

document.getElementById("img_btn").addEventListener("click", function(){
  const img_promise = dialog.showOpenDialog({ properties: ['openDirectory'] });
  img_promise.then(function(value) {
    if (value.canceled) return;
    console.log(value);
    fs.writeFile(app.getPath("userData") + "/img_location.txt", value.filePaths[0], 'utf-8', (err, res) => {
      loadImages();
    });
  });
});

function loadImages() {
  fs.readFile(app.getPath("userData") + "/img_location.txt", (err, res) => {
    const img_dir = res.toString();
    console.log(img_dir);
    document.getElementById('type_img').setAttribute('src', img_dir + '/type_img.png');
    document.getElementById('front_img').setAttribute('src', img_dir + '/front_img.png');
    document.getElementById('left_arm_img').setAttribute('src', img_dir + '/left_arm_img.png');
    document.getElementById('right_arm_img').setAttribute('src', img_dir + '/right_arm_img.png');
    document.getElementById('back_img').setAttribute('src', img_dir + '/back_img.png');
    document.getElementById('hood_img').setAttribute('src', img_dir + '/hood_img.png');
  });
}

document.getElementById("save_btn").addEventListener("click", function(){
  const save_promise = dialog.showSaveDialog({defaultPath: './clothing_order.json'});
  save_promise.then(function(value) {
    if (value.canceled) return;
    fs.writeFileSync(value.filePath, JSON.stringify(store.store), 'utf-8');
  });
});

document.getElementById("export_btn").addEventListener("click", function(){
  updateStore();
  let window_to_PDF = new BrowserWindow({show : false});//to just open the browser in background
  fs.writeFileSync(app.getPath('userData') + "/temp.html", Mustache.to_html(export_template, store.store), { "flag": "w" });
  window_to_PDF.loadFile(app.getPath('userData') + "/temp.html"); //give the file link you want to display
  window_to_PDF.webContents.on('did-finish-load', () => {
    window_to_PDF.webContents.printToPDF(print_options).then(data => {
      const path_promise = dialog.showSaveDialog({defaultPath: './order.pdf'});
      path_promise.then(function(value){
        if (value.canceled) return;
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
  
  for (let i = 0 ; i < typeSelects.length ; i++){
    
    document.getElementById((typeSelects[i] + "_select")).addEventListener("change", function(){
      
      store.set(typeSelects[i], this.value);
      
      //even though the typeSelects are all uniquely names, they are all placed
      //in the "type" section
      defaultCheck("type_section");

      if (typeSelects[i] === "type"){
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
      updateStoreFromTextArea(customizationSections[i]);

      if (this.value.trim() == "" && currentSection == (customizationSections[i] + "_section")){
        document.getElementById("next_button").disabled = true;
      }

      else {
        document.getElementById("next_button").disabled = false;
      }

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

  for (let i = 1 ; i < customizationSections.length ; i++){
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

document.getElementById("first_name_disp").innerHTML = "Your first name is: " + store.get("first_name_text");
document.getElementById("last_name_disp").innerHTML = "Your last name is: " + store.get("last_name_text");
document.getElementById("email_disp").innerHTML = "Your email adress is: " + store.get("email_text");
document.getElementById("phone_number_disp").innerHTML = "Your phone number is: " + store.get("phone_number_text");
document.getElementById("left_arm_disp").innerHTML = "Your customization for left arm is: " + store.get("left_arm_text");
document.getElementById("right_arm_disp").innerHTML = "Your customization for right arm is: " + store.get("right_arm_text");
document.getElementById("back_disp").innerHTML = "Your customization for back is: " + store.get("back_text");
document.getElementById("hood_disp").innerHTML = "Your customization for hood is: " + store.get("hood_text");
document.getElementById("other_comment_disp").innerHTML = "Your other comment is: " + store.get("other_comment");

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

  for (let i = 1 ; i < customizationSections.length ; i++){
    updateStoreFromTextArea(customizationSections[i]);
  }

}

/**
 * Goes to the previous section based on what the current one is
 * For now it is a switch case. Once I get it working I'll
 * modify it into something simpler
 * -Keegan
 */
function goToPrevSection(){
  
  let prevSection;

  switch (currentSection){
    
    case "welcome_section":
      break;

    case "front_section":
      prevSection = "type_section";
      document.getElementById("prev_button").disabled = true;
      break;

    case "left_arm_section":
      prevSection = "front_section";
      break;
      
    case "right_arm_section":  
      prevSection = "left_arm_section";
      break;

    case "back_section":  
      prevSection = "right_arm_section";
      break;  

    case "hood_section":  
      prevSection = "back_section";
      break;  

    case "comment_section":  
      if (type == "hoodie"){
        prevSection = "hood_section";
      }

      else {
        prevSection = "back_section";
      }

      break;
      
  }

  defaultCheck(prevSection);
  document.getElementById(currentSection).style.display = "none";
  document.getElementById(prevSection).style.display = "flex";
  currentSection = prevSection;

  checkIfWelcomeSection();

}

/**
 * Goes to the next section based on what the current one is
 * For now it is a switch case. Once I get it working I'll
 * modify it into something simpler
 * -Keegan
 */
function goToNextSection(){

  let nextSection;

  switch (currentSection){
    
    case "welcome_section":
      nextSection = "type_section";
      document.getElementById("prev_button").disabled = true;
      document.getElementById("nav").style.display = "table";
      break;

    case "type_section":
      nextSection = "front_section";
      document.getElementById("prev_button").disabled = false;
      document.getElementById("next_button").disabled = true;
      break;

    case "front_section":
      nextSection = "left_arm_section";  
      document.getElementById("prev_button").disabled = false;
      break;

    case "left_arm_section":
      nextSection = "right_arm_section";  
      document.getElementById("prev_button").disabled = false;  
      break;

    case "right_arm_section":
      nextSection = "back_section";  
      document.getElementById("prev_button").disabled = false;  
      break;  

    case "back_section": 
      
      if (type == "hoodie"){
        nextSection = "hood_section";
      }

      else {
        nextSection = "comment_section";
      }
      
      document.getElementById("prev_button").disabled = false;  
      break; 
      
    case "hood_section":
      nextSection = "comment_section";  
      document.getElementById("prev_button").disabled = false;  
      break;

    case "comment_section":
      //set going to summary page here
      return; 

  }

  defaultCheck(nextSection);

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
      
    default:

      if (section !== "comment_section"){
        customizationSelectCheck(section);
      }

      break;  

  }

}

function nextButtonCheck(name){
  
  if (document.getElementById(name + "_text").value !== "") {
    document.getElementById("next_button").disabled = false;
  }

  else {
    document.getElementById("next_button").disabled = true;
  }

}

/**
 * Sets all changeable areas to their default values, and hides hidable sections.
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

  hideTextAreas();

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

function setCustomizationSelectListeners(){

  for (let i = 1 ; i < customizationSections.length - 1 ; i++){
    
    document.getElementById((customizationSections[i] + "_select")).addEventListener("change", function(){

      if (this.value === "yes"){
        
        document.getElementById(customizationSections[i] + "_desc").style.display = "block";
        
        if (document.getElementById(customizationSections[i] + "_text").value.trim() !== ""){
          store.set( (customizationSections[i] + "_text"), document.getElementById(customizationSections[i] + "_text").value.trim() );
        }

      }

      else {
        document.getElementById(customizationSections[i] + "_desc").style.display = "none";
        store.set(customizationSections[i] + "_text", "n/a");
      }

      defaultCheck(customizationSections[i] + "_section");

    });             
  
  }

}

function hideTextAreas(){
  
  for (let i = 1 ; i < customizationSections.length - 1 ; i++){
    document.getElementById(customizationSections[i] + "_desc").style.display = "none";
  }

}

function customizationSelectCheck(name){

  let select = document.getElementById(name.replace("_section", "_select"));

  switch (select.value){
    
    case "yes":
      nextButtonCheck(name.replace("_section", ""));
      break;

    case "no":
      document.getElementById("next_button").disabled = false;
      break;

    case "default":
      document.getElementById("next_button").disabled = true;
      break
  }

}

function setWelcomeInputListeners(){

  for(let i = 0 ; i < welcomeInputs.length ; i++){

    document.getElementById( (welcomeInputs[i] + "_text") ).addEventListener("change", function(){
     
        updateStoreFromTextArea(welcomeInputs[i]);
  
        if (document.getElementById("first_name_text").value.trim() == "" || 
            document.getElementById("last_name_text").value.trim() == "" ||
            document.getElementById("email_text").value.trim() == "" ||
            document.getElementById("phone_number_text").value.trim() == ""){
          document.getElementById("welcome_new").disabled = true;
        }
  
        else {
          document.getElementById("welcome_new").disabled = false;
        }
  
    });

  }

}

function disableNewOrderButton(){
  document.getElementById("welcome_new").disabled = true;
}
