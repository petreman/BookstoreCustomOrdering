/*
index.js

Javascript file for the index.html page.
Majority of methods are used to pass data between input areas and the Store.

Authors: Jinzhe Li, Philippe Nadon, Keegan Petreman
*/
"use strict";
const { app, dialog, BrowserWindow } = require("electron").remote;
const ipc = require("electron").ipcRenderer;
const Store = require("electron-store");
const Mustache = require("mustache");
const fs = require("fs");
// See sheets.js for example usage
const {
  newOrder,
  updateOrder,
  getOrder,
  setSettings,
  getSettings,
  finalizeOrder
} = require("./sheets.js");
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
  <p>Clothing Type: {{type}}</p>
  <p>Color: {{color}}</p>
  <p>Front: {{front_text}}</p>
  <p>Left Arm: {{left_arm_text}}</p>
  <p>Right Arm: {{right_arm_text}}</p>
  <p>Back: {{back_text}}</p>
  <p>Hood: {{hood_text}}</p>
  <p>Other Comments: {{comment_text}}</p>
  </body>
  </html>
`;

const print_options = {
  landscape: false,
  marginsType: 0,
  printBackground: false,
  printSelectionOnly: false,
  pageSize: "A4"
};

//variables
let type; //will be used to check if hood option should be taken
let currentSection = "welcome_section";
const welcomeInputs = ["first_name", "last_name", "email", "phone_number"];
const typeSelects = ["type", "color", "size"];
const customizationSections = [
  "type",
  "front",
  "left_arm",
  "right_arm",
  "back",
  "hood",
  "comment"
];

if (fs.existsSync(app.getPath("userData") + "/img_location.txt")) {
  console.log("image location found");
  loadImages();
} else {
  console.log("image location not found");
}

//initialization
const store = new Store();
store.clear();
getAndApplySettings()
disableNavButtons();
disableNewOrderButton();
setWelcomeInputListeners();
setSelectListeners();
setTextListeners();
setCustomizationSelectListeners();

document.getElementById("welcome_new").addEventListener("click", function() {

  newOrder({
      "spreadsheetId": spreadsheetId,
      "values": [
        store.get("first_name_text"), store.get("last_name_text"),
        store.get("email_text"), store.get("phone_number_text")
      ]
    }, (err, resp) => {
      if (err) {
        console.log(err);
        displayErrorPopUp(err);
        return;

      } else {
        const updatedRange = resp.data.updates.updatedRange;
        const first_row = updatedRange.slice(updatedRange.indexOf("!"), updatedRange.indexOf(":")).replace(/[^0-9]+/g, '');
        const second_row = updatedRange.slice(updatedRange.indexOf(":")).replace(/[^0-9]+/g, '');
        if (first_row === second_row) {
          console.log(first_row);
          store.set("order_num", first_row);
          refreshOrderNumberDisplay();
          document.getElementById("order_num_disp").style.display = "inline-block";
          setDefaults();
          updateStore();
          goToNextSection();
        } else {
          console.error("ORDERS DONT MATCH!!\n".concat(first_row, "\n", second_row));
        }
        
      }
    });  

});

document.getElementById("next_button").addEventListener("click", function() {
  goToNextSection();
});

document.getElementById("prev_button").addEventListener("click", function() {
  goToPrevSection();
});

document.getElementById("load_btn").addEventListener("click", function() {
  const file_promise = dialog.showOpenDialog({ properties: ["openFile"] });
  file_promise.then(function(value) {
    if (value.canceled) return;
    store.store = JSON.parse(fs.readFileSync(value.filePaths[0]));
    setFromStore();
  });
});

document.getElementById("img_btn").addEventListener("click", function() {
  const img_promise = dialog.showOpenDialog({ properties: ["openDirectory"] });
  img_promise.then(function(value) {
    if (value.canceled) return;
    console.log(value);
    fs.writeFile(
      app.getPath("userData") + "/img_location.txt",
      value.filePaths[0],
      "utf-8",
      (err, res) => {
        loadImages();
      }
    );
  });
});

function loadImages() {
  fs.readFile(app.getPath("userData") + "/img_location.txt", (err, res) => {
    if (!err) {
      const img_dir = res.toString();
    console.log(img_dir);
    document
      .getElementById("front_img")
      .setAttribute("src", img_dir + "/front_img.png");
    document
      .getElementById("left_arm_img")
      .setAttribute("src", img_dir + "/left_arm_img.png");
    document
      .getElementById("right_arm_img")
      .setAttribute("src", img_dir + "/right_arm_img.png");
    document
      .getElementById("back_img")
      .setAttribute("src", img_dir + "/back_img.png");
    document
      .getElementById("hood_img")
      .setAttribute("src", img_dir + "/hood_img.png");
    } else {
      console.log("image location not found");
    }
  });
}

document.getElementById("save_btn").addEventListener("click", function() {
  const save_promise = dialog.showSaveDialog({
    defaultPath: "./clothing_order.json"
  });
  save_promise.then(function(value) {
    if (value.canceled) return;
    fs.writeFileSync(value.filePath, JSON.stringify(store.store), "utf-8");
  });
});

document.getElementById("export_btn").addEventListener("click", function() {
  updateStore();
  let window_to_PDF = new BrowserWindow({ show: false }); //to just open the browser in background
  fs.writeFileSync(
    app.getPath("userData") + "/temp.html",
    Mustache.to_html(export_template, store.store),
    { flag: "w" }
  );
  window_to_PDF.loadFile(app.getPath("userData") + "/temp.html"); //give the file link you want to display
  window_to_PDF.webContents.on("did-finish-load", () => {
    window_to_PDF.webContents
      .printToPDF(print_options)
      .then(data => {
        const path_promise = dialog.showSaveDialog({
          defaultPath: "./order.pdf"
        });
        path_promise.then(function(value) {
          if (value.canceled) return;
          fs.writeFile(value.filePath, data, error => {
            if (error) throw error;
            console.log("Write PDF successfully.");
          });
        });
      })
      .catch(error => {
        console.log(error);
      });
  });
});

function setSelectListeners() {
  for (let i = 0; i < typeSelects.length; i++) {
    document
      .getElementById(typeSelects[i] + "_select")
      .addEventListener("change", function() {
        store.set(typeSelects[i], this.value);

        //even though the typeSelects are all uniquely names, they are all placed
        //in the "type" section
        defaultCheck("type_section");

        loadTypeImage();

        if (typeSelects[i] === "type") {
          type = this.value;
        }
      });
  }
}

/**
 * Sets all the listeners for text input areas
 */
function setTextListeners() {
  for (let i = 1; i < customizationSections.length; i++) {
    document
      .getElementById(customizationSections[i] + "_text")
      .addEventListener("change", function() {
        updateStoreFromTextArea(customizationSections[i]);

        if (
          this.value.trim() == "" &&
          currentSection == customizationSections[i] + "_section"
        ) {
          document.getElementById("next_button").disabled = true;
        } else {
          document.getElementById("next_button").disabled = false;
        }
      });
  }
}

function refreshOrderNumberDisplay() {
  document.getElementById("order_num_disp").innerHTML =
    "Order #" + store.get("order_num", "ORDER NUM NOT SET");
}

function enableNavButtons() {
  document.getElementById("nav").style.display = "flex";
  document.getElementById("order_num_disp").style.display = "flex";
}

function disableNavButtons() {
  document.getElementById("nav").style.display = "none";
  document.getElementById("order_num_disp").style.display = "none";
}

function setFromStore() {
  let index = 0;

  refreshOrderNumberDisplay();

  switch (store.get("type").toLowerCase()) {
    case "hoodie":
      index = 1;
      type = "hoodie";
      break;

    case "crewneck":
      index = 2;
      type = "crewneck";
      break;

    default:
      index = 0; 
      break; 
  }

  document.getElementById("type_select").selectedIndex = index;

  switch (store.get("color").toLowerCase()) {
    case "green":
      index = 1;
      break;

    case "gray":
      index = 2;
      break;

    default:
      index = 0;
      break;  
  }

  document.getElementById("color_select").selectedIndex = index;

  switch (store.get("size")){
    case "2XS":
      index = 1;
      break;

    case "XS":
      index = 2;
      break; 
    
    case "S":
      index = 3;
      break; 
      
    case "M":
      index = 4;
      break;
  
    case "L":
      index = 5;
      break; 
      
    case "XL":
      index = 6;
      break;
      
    case "2XL":
      index = 7;
      break;

    default:
      index = 0;
      break;  
  }

  document.getElementById("size_select").selectedIndex = index;

  for (let i = 1; i < customizationSections.length; i++) {
    setSelectAndTextFromStore(customizationSections[i]);
  }

  for (let i = 0 ; i < welcomeInputs.length ; i++) {
    setWelcomeTextFromStore(welcomeInputs[i]);
  }

}

/**
 * Used for setting the sections that have both text and selects to
 * values determined from the store
 * @param {*} name 
 */
function setSelectAndTextFromStore(name) {
  let textName = name + "_text";
  let selectName = name + "_select";

  if (store.get(textName) === "n/a" || store.get(textName) === "undefined") {
    document.getElementById(textName).value = "";
    
    if (name !== "comment"){
      document.getElementById(selectName).selectedIndex = 1;
      document.getElementById(name + "_desc").style.display = "none";
      defaultCheck(name + "_section");
    }
    
  } else {
    document.getElementById(textName).value = store.get(textName);
    
    if (name !== "comment"){
      document.getElementById(selectName).selectedIndex = 2;
      document.getElementById(name + "_desc").style.display = "block";
      defaultCheck(name + "_section");
    }  
  }
}

/**
 * Used to set first and last name, email, and phone number
 * from the store
 * @param {*} name 
 */
function setWelcomeTextFromStore(name){
  let textName = name + "_text";

  if (store.get(textName) === "n/a" || store.get(textName) === "undefined") {
    document.getElementById(textName).value = "";
  } else {
    document.getElementById(textName).value = store.get(textName);
  }  
}

function updateStoreFromTextArea(name) {
  let textName = name + "_text";
  let textContent = document.getElementById(textName).value;

  //empty message box is the same as "n/a"
  if (textContent.trim() != "") {
    store.set(textName, textContent);
  } else {
    store.set(textName, "n/a");
  }
}

function updateStore() {
  //type
  let type_init = document.getElementById("type_select");
  store.set("type", type_init.options[type_init.selectedIndex].value);

  //color
  let color_init = document.getElementById("color_select");
  store.set("color", color_init.options[color_init.selectedIndex].value);

  //welcome inputs
  for (let i = 0; i < welcomeInputs.length; i++) {
    updateStoreFromTextArea(welcomeInputs[i]);
  }

  //customization section inputs
  for (let i = 1; i < customizationSections.length; i++) {
    updateStoreFromTextArea(customizationSections[i]);
  }
}

/**
 * Goes to the previous section based on what the current one is
 * For now it is a switch case. Once I get it working I'll
 * modify it into something simpler
 * -Keegan
 */
function goToPrevSection() {
  
  calculateCurrentPrice();

  let prevSection;
  let colRange;
  let vals;

  switch (currentSection) {
    case "welcome_section":
      break;

    case "type_section":
      prevSection = "welcome_section";
      document.getElementById("prev_button").disabled = true;
      document.getElementById("next_button").disabled = false;

      colRange = ["G", "I"];
      vals = [store.get("type"), 
        store.get("color"), store.get("size")];

      break;

    case "front_section":
      prevSection = "type_section";
      colRange = ["J", "J"];
      vals = [store.get("front_text")];
      break;

    case "left_arm_section":
      prevSection = "front_section";
      colRange = ["K", "K"];
      vals = [store.get("left_arm_text")];
      break;

    case "right_arm_section":
      prevSection = "left_arm_section";
      colRange = ["L", "L"];
      vals = [store.get("right_arm_text")];
      break;

    case "back_section":
      prevSection = "right_arm_section";
      colRange = ["M", "M"];
      vals = [store.get("back_text")];
      break;

    case "hood_section":
      prevSection = "back_section";
      colRange = ["N", "N"];
      vals = [store.get("hood_text")];
      break;

    case "comment_section":
      if (type == "hoodie") {
        prevSection = "hood_section";
      } else {
        prevSection = "back_section";
      }

      colRange = ["O", "O"];
      vals = [store.get("comment_text")];

      break;

    case "summary_section":
      prevSection = "comment_section";
      document.getElementById("next_button").disabled = false;
      break;
  }

  updateOrder({
    "spreadsheetId": spreadsheetId,
    "row": store.get("order_num"),
    "column_range": colRange,
    "values": vals
  }), (err, resp) => {
    if (err) {
      console.log(err);
      displayErrorPopUp(err);
      return;
    } else {
      console.log(resp);
    }};

  defaultCheck(prevSection);
  document.getElementById(currentSection).style.display = "none";

  if (prevSection !== "welcome_section") {
    document.getElementById(prevSection).style.display = "flex";
  } else {
    document.getElementById(prevSection).style.display = "initial";
    document.getElementById("prev_button").disabled = true;
  }

  currentSection = prevSection;  

}

/**
 * Goes to the next section based on what the current one is
 * For now it is a switch case. Once I get it working I'll
 * modify it into something simpler
 * -Keegan
 */
function goToNextSection() {
  
  calculateCurrentPrice();
  
  let nextSection;
  let colRange;
  let vals;

  switch (currentSection) {
    case "welcome_section":
      nextSection = "type_section";
      document.getElementById("nav").style.display = "table";

      colRange = ["C", "F"];
      vals = [
        store.get("first_name_text"), store.get("last_name_text"),
        store.get("email_text"), store.get("phone_number_text")
        ];
      
      break;

    case "type_section":
      nextSection = "front_section";
      document.getElementById("next_button").disabled = true;

      colRange = ["G", "I"];
      vals = [store.get("type"), 
        store.get("color"), store.get("size")];

      break;

    case "front_section":
      nextSection = "left_arm_section";
      colRange = ["J", "J"];
      vals = [store.get("front_text")];
      break;

    case "left_arm_section":
      nextSection = "right_arm_section";
      colRange = ["K", "K"];
      vals = [store.get("left_arm_text")];
      break;

    case "right_arm_section":
      nextSection = "back_section";
      colRange = ["L", "L"];
      vals = [store.get("right_arm_text")];
      break;

    case "back_section":
      if (type == "hoodie") {
        nextSection = "hood_section";
      } else {
        nextSection = "comment_section";
      }

      colRange = ["M", "M"];
      vals = [store.get("back_text")];

      break;

    case "hood_section":
      nextSection = "comment_section";

      colRange = ["N", "N"];
      vals = [store.get("hood_text")];

      break;

    case "comment_section":
      nextSection = "summary_section";
      document.getElementById("next_button").disabled = true;
      setSummaryFromStore();

      colRange = ["O", "O"];
      vals = [store.get("comment_text")];

      break;

    case "summary_section":
      nextSection = "thanks_section";  
      document.getElementById("nav").style.display = "none";
      document.getElementById(currentSection).style.display = "none";
      document.getElementById(nextSection).style.display = "initial";
      currentSection = nextSection;
      return;

  }

  updateOrder({
    "spreadsheetId": spreadsheetId,
    "row": store.get("order_num"),
    "column_range": colRange,
    "values": vals
  }), (err, resp) => {
    if (err) {
      console.log(err);
      displayErrorPopUp(err);
      return;
    } else {
      console.log(resp);
      
    }};

  if (nextSection !== "summary_section") {
   document.getElementById(nextSection).style.display = "flex";
  } else {
    document.getElementById(nextSection).style.display = "initial";
    document.getElementById("next_button").disabled = true;
  }
  
  defaultCheck(nextSection);
  document.getElementById("prev_button").disabled = false;
  document.getElementById(currentSection).style.display = "none";
  currentSection = nextSection;

}

/**
 * Checks to see if the provided section has any default/unchanged values. If there are,
 * can't progress to the next section.
 *
 * @param {*} section - the section to be checking
 *
 */
function defaultCheck(section) {
  switch (section) {
    case "welcome_section":
      break;

    case "type_section":
      if (
        document.getElementById("type_select").value !== "none" &&
        document.getElementById("color_select").value !== "none" &&
        document.getElementById("size_select").value !== "none"
      ) {
        document.getElementById("next_button").disabled = false;
      } else {
        document.getElementById("next_button").disabled = true;
      }

      break;

    case "comment_section":
    case "summary_section":
      break;

    default:
      customizationSelectCheck(section);
      break;
  }
}

function nextButtonCheck(name) {
  if (document.getElementById(name + "_text").value !== "") {
    document.getElementById("next_button").disabled = false;
  } else {
    document.getElementById("next_button").disabled = true;
  }
}

/**
 * Sets all changeable areas to their default values, and hides hidable sections.
 * Inteneded to be used when a new order is started.
 */
function setDefaults() {

  document.getElementById("first_name_text").value = "";
  document.getElementById("last_name_text").value = "";
  document.getElementById("email_text").value = "";
  document.getElementById("phone_number_text").value = "";  

  document.getElementById("type_select").selectedIndex = 0;
  document.getElementById("color_select").selectedIndex = 0;
  document.getElementById("size_select").selectedIndex = 0;

  document.getElementById("front_text").value = "";
  document.getElementById("left_arm_text").value = "";
  document.getElementById("right_arm_text").value = "";
  document.getElementById("back_text").value = "";
  document.getElementById("hood_text").value = "";
  document.getElementById("comment_text").value = "";

  hideTextAreas();
}

/**
 * Hides the prev and next buttons if on the welcome screen
 */

function checkIfWelcomeSection() {
  if (currentSection === "welcome_section") {
    disableNavButtons();
  } else {
    enableNavButtons();
  }
}

function setCustomizationSelectListeners() {
  for (let i = 1; i < customizationSections.length - 1; i++) {
    document
      .getElementById(customizationSections[i] + "_select")
      .addEventListener("change", function() {
        if (this.value === "yes") {
          document.getElementById(
            customizationSections[i] + "_desc"
          ).style.display = "block";

          if (
            document
              .getElementById(customizationSections[i] + "_text")
              .value.trim() !== ""
          ) {
            store.set(
              customizationSections[i] + "_text",
              document
                .getElementById(customizationSections[i] + "_text")
                .value.trim()
            );
          }
        } else {
          document.getElementById(
            customizationSections[i] + "_desc"
          ).style.display = "none";
          store.set(customizationSections[i] + "_text", "n/a");
        }

        defaultCheck(customizationSections[i] + "_section");
      });
  }
}

function hideTextAreas() {
  for (let i = 1; i < customizationSections.length - 1; i++) {
    document.getElementById(customizationSections[i] + "_desc").style.display =
      "none";
  }
}

function customizationSelectCheck(name) {
  let select = document.getElementById(name.replace("_section", "_select"));

  switch (select.value) {
    case "yes":
      nextButtonCheck(name.replace("_section", ""));
      break;

    case "no":
      document.getElementById("next_button").disabled = false;
      break;

    case "default":
      document.getElementById("next_button").disabled = true;
      break;
  }
}

function setWelcomeInputListeners() {
  for (let i = 0; i < welcomeInputs.length; i++) {
    document
      .getElementById(welcomeInputs[i] + "_text")
      .addEventListener("change", function() {
        updateStoreFromTextArea(welcomeInputs[i]);

        if (
          document.getElementById("first_name_text").value.trim() == "" ||
          document.getElementById("last_name_text").value.trim() == "" ||
          document.getElementById("email_text").value.trim() == "" ||
          document.getElementById("phone_number_text").value.trim() == ""
        ) {
          document.getElementById("welcome_new").disabled = true;
        } else {
          document.getElementById("welcome_new").disabled = false;
        }
      });
  }
}

function disableNewOrderButton() {
  document.getElementById("welcome_new").disabled = true;
}

function setSummaryFromStore() {
  document.getElementById("first_name_disp").innerHTML =
    "First Name: " + store.get("first_name_text");
  document.getElementById("last_name_disp").innerHTML =
    "Last Name: " + store.get("last_name_text");
  document.getElementById("email_disp").innerHTML =
    "Email: " + store.get("email_text");
  document.getElementById("phone_number_disp").innerHTML =
    "Phone Number: " + store.get("phone_number_text");

  document.getElementById("hoodie_disp").innerHTML =
    "Clothing type (SKU: " + store.get("settings")[9][1] + 
    "): " + store.get("type") + " (Price: $" + store.get("settings")[0][1] + ")";
  document.getElementById("crewneck_disp").innerHTML =
  "Clothing type (SKU: " + store.get("settings")[10][1] + 
  "): " + store.get("type") + " (Price: $" + store.get("settings")[1][1] + ")";
  document.getElementById("green_disp").innerHTML =
    "Clothing color (SKU: " + store.get("settings")[11][1] + 
    "): " + store.get("color") + " (Price: $" + store.get("settings")[2][1] + ")";
  document.getElementById("gray_disp").innerHTML =
  "Clothing color (SKU: " + store.get("settings")[12][1] + 
  "): " + store.get("color") + " (Price: $" + store.get("settings")[3][1] + ")";

  document.getElementById("size_disp").innerHTML =
    "Clothing size: " + store.get("size");

  document.getElementById("front_disp").innerHTML =
    "Front (SKU: " + store.get("settings")[13][1] + 
    "): " + store.get("front_text") + " (Price: $" + store.get("settings")[4][1] + ")";
  document.getElementById("left_arm_disp").innerHTML =
    "Left Arm (SKU: " + store.get("settings")[14][1] + 
    "): " + store.get("left_arm_text") + " (Price: $" + store.get("settings")[5][1] + ")";
  document.getElementById("right_arm_disp").innerHTML =
    "Right Arm (SKU: " + store.get("settings")[15][1] + 
    "): " + store.get("right_arm_text") + " (Price: $" + store.get("settings")[6][1] + ")";
  document.getElementById("back_disp").innerHTML =
    "Back (SKU: " + store.get("settings")[16][1] + 
    "): " + store.get("back_text") + " (Price: $" + store.get("settings")[7][1] + ")";
  document.getElementById("comment_disp").innerHTML =
    "Additional Information: " + store.get("comment_text");

  if (store.get("type") === "hoodie") {

    document.getElementById("hood_disp").innerHTML =
    "Hood (SKU: " + store.get("settings")[17][1] + 
    "): " + store.get("hood_text") + " (Price: $" + store.get("settings")[8][1] + ")";
    
    document.getElementById("hoodie_disp").style.display = "auto";
    document.getElementById("hood_disp").style.display = "auto";
    document.getElementById("crewneck_disp").style.display = "none";

  } else {
    document.getElementById("crewneck_disp").style.display = "auto";
    document.getElementById("hoodie_disp").style.display = "none";
    document.getElementById("hood_disp").style.display = "none";

  }

  if (store.get("color") === "green") {

    document.getElementById("green_disp").style.display = "auto";
    document.getElementById("gray_disp").style.display = "none";

  } else {

    document.getElementById("gray_disp").style.display = "auto";
    document.getElementById("green_disp").style.display = "none";
    
  }
}


function getAndApplySettings() {
  getSettings(
    {
      spreadsheetId: spreadsheetId,
      range: ["2", ""]
    },
    applySettings
  );
}

function applySettings(err, resp) {
  if (err) {
    console.log(err);
  } else {
    store.set("settings", resp.data.values);
    console.log(store.get("settings"));
    document.getElementById("hoodiePrice_display").text = "Hoodie + $" + store.get("settings")[0][1];
    document.getElementById("crewneckPrice_display").text = "Crewneck + $" + store.get("settings")[1][1];
    document.getElementById("greenPrice_display").text = "Green + $" + store.get("settings")[2][1];
    document.getElementById("grayPrice_display").text = "Gray + $" + store.get("settings")[3][1];
    document.getElementById("frontPrice_display").text = "Yes + $" + store.get("settings")[4][1];
    document.getElementById("leftPrice_display").text = "Yes + $" + store.get("settings")[5][1];
    document.getElementById("rightPrice_display").text = "Yes + $" + store.get("settings")[6][1];
    document.getElementById("backPrice_display").text = "Yes + $" + store.get("settings")[7][1];
    document.getElementById("hoodPrice_display").text = "Yes + $" + store.get("settings")[8][1];
  }
}

function calculateCurrentPrice() {
  console.log(store.store);
  let currPrice = 0;
  if (store.get("type") === "hoodie") {
    currPrice += parseFloat(store.get("settings")[0][1]);
  } else if (store.get("type") && store.get("type") === "crewneck") {
    currPrice += parseFloat(store.get("settings")[1][1]);
  }
  if (store.get("color") === "green") {
    currPrice += parseFloat(store.get("settings")[2][1]);
  } else if (store.get("color") && store.get("color") === "gray") {
    currPrice += parseFloat(store.get("settings")[3][1]);
  }
  if (store.get("front_text") && store.get("front_text") !== "n/a") {
    currPrice += parseFloat(store.get("settings")[4][1]);
  }
  if (store.get("left_arm_text") && store.get("left_arm_text") !== "n/a") {
    currPrice += parseFloat(store.get("settings")[5][1]);
  }
  if (store.get("right_arm_text") && store.get("right_arm_text") !== "n/a") {
    currPrice += parseFloat(store.get("settings")[6][1]);
  }
  if (store.get("back_text") && store.get("back_text") !== "n/a") {
    currPrice += parseFloat(store.get("settings")[7][1]);
  }
  if (store.get("hood_text") && store.get("hood_text") !== "n/a") {
    currPrice += parseFloat(store.get("settings")[8][1]);
  }
  document.getElementById("price_display").innerHTML = "Total: " + currPrice;
}

function loadOrderInfoFromRow() {
  const order_num = document.getElementById("input_order_text").value;
  if (order_num == 1){
    return;
  }
  getOrder(
    {
      spreadsheetId: spreadsheetId,
      row: order_num
    },
    (err, res) => {
      if (err) {
        console.log(err);
        displayErrorPopUp(err);
      } else {
        const order_data = res.data.values[0];
        store.set("order_num", order_num);
        document.getElementById("order_num_disp").style.display = "inline-block";
        store.set("first_name_text", order_data[2]);
        store.set("last_name_text", order_data[3]);
        store.set("email_text", order_data[4]);
        store.set("phone_number_text", order_data[5]);
        store.set("type", order_data[6]);
        store.set("color", order_data[7]);
        store.set("size", order_data[8]);
        store.set("front_text", order_data[9]);
        store.set("left_arm_text", order_data[10]);
        store.set("right_arm_text", order_data[11]);
        store.set("back_text", order_data[12]);
        store.set("hood_text", order_data[13]);
        store.set("comment_text", order_data[14]);
        console.log("set store:");
        console.log(store.store);
        setFromStore();
        goToNextSection();
      }
    }
  );
}

document.getElementById("input_order_text").addEventListener("change", function() {
    store.set('order_num', this.value);
    console.log(store.get('order_num'));
});

document.getElementById("welcome_load").addEventListener("click", loadOrderInfoFromRow);

function loadTypeImage() {
  fs.readFile(app.getPath("userData") + "/img_location.txt", (err, res) => {
    const img_dir = res.toString();
    console.log(img_dir);
    let typeSelected = document.getElementById("type_select").value;
    let colorSelected = document.getElementById("color_select").value;

    if (typeSelected === "hoodie" && colorSelected === "green") {
      document
        .getElementById("type_img")
        .setAttribute("src", img_dir + "/hoodie_green_img.png");
    } else if (typeSelected === "hoodie" && colorSelected === "gray") {
      document
        .getElementById("type_img")
        .setAttribute("src", img_dir + "/hoodie_gray_img.png");
    } else if (typeSelected === "crewneck" && colorSelected === "green") {
      document
        .getElementById("type_img")
        .setAttribute("src", img_dir + "/crewneck_green_img.png");
    } else if (typeSelected === "crewneck" && colorSelected === "gray") {
      document
        .getElementById("type_img")
        .setAttribute("src", img_dir + "/crewneck_gray_img.png");
    } else {
      document
        .getElementById("type_img")
        .setAttribute("src", "./images/img_not_loaded.png");
    }
  });
}

function reloadPage() {
  ipc.send("load-page");
}

document.getElementById("reload_page").addEventListener("click", () => {
  reloadPage();
});

function displayErrorPopUp(err){
  
  //Get the modal
  var modal = document.getElementById("error_modal");

  // Get the <span> element that closes the modal
  var span = document.getElementsByClassName("close")[0];

  //display modal
  modal.style.display = "block";
  
  if (err.toString().includes("Unable to parse range:")){
    document.getElementById("modal_line_1").innerHTML = "Order numbers are positive, starting from 2.";
  }

  else if (err.toString().includes("Range")){
    document.getElementById("modal_line_1").innerHTML = "Order number out of range (no such order).";
  }

  else if (err.toString().includes("fetch")){
    document.getElementById("modal_line_1").innerHTML = 
      "Unable to connect to Google Sheets. Please check your connection and try again.";
  }

  else {
    document.getElementById("modal_line_1").innerHTML = "";
  }

  document.getElementById("error").innerHTML = err.toString();

  // When the user clicks on <span> (x), close the modal
  span.onclick = function() {
    modal.style.display = "none";
  }


}

document.getElementById("submit_btn").addEventListener("click", function(){
  
  finalizeOrder({
    "spreadsheetId": spreadsheetId,
    "row": store.get("order_num")
  }, (err, resp) => {
    if (err) {
      console.log(err);
      displayErrorPopUp(err);
      return;
    } else {
      console.log(resp);
      goToNextSection();
    }

  })

});
