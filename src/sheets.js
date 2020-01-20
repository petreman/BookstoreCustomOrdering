const dateTime = require("node-datetime");
const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "./token.json";
const CREDENTIALS_PATH = "./credentials.json";

const opSheet = (operationCallback, request, callback) => {
  fs.readFile(CREDENTIALS_PATH, (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    authorize(JSON.parse(content), operationCallback, request, callback);
  });
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call wth the authorized client.
 */
function authorize(credentials, operationCallback, request, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      console.error("COULD NOT FIND TOKEN, PLEASE GENERATE ONE FIRST!");
      return;
    }
    oAuth2Client.setCredentials(JSON.parse(token));
    operationCallback(oAuth2Client, request, callback);
  });
}

function newOrderCallback(auth, request_vals, callback) {
  var request = {
    spreadsheetId: request_vals.spreadsheetId,
    range: request_vals.range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    resource: {
      range: request_vals.range,
      majorDimension: "ROWS",
      values: request_vals.values
    },
    auth: auth
  };
  console.log(request.range);
  const sheets = google.sheets({ version: "v4", auth });
  sheets.spreadsheets.values.append(request, callback);
}

function updateOrderCallback(auth, request_vals, callback) {
  var request = {
    spreadsheetId: request_vals.spreadsheetId,
    range: request_vals.range,
    valueInputOption: "USER_ENTERED",
    includeValuesInResponse: true,
    resource: {
      range: request_vals.range,
      majorDimension: "ROWS",
      values: request_vals.values
    },
    auth: auth
  };
  const sheets = google.sheets({ version: "v4", auth });
  sheets.spreadsheets.values.update(request, callback);
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function getOrderCallback(auth, request, callback) {
  const sheets = google.sheets({ version: "v4", auth });
  sheets.spreadsheets.values.get(request, callback);
}

function setSettingsCallback(auth, request_vals, callback) {
  var request = {
    spreadsheetId: request_vals.spreadsheetId,
    range: request_vals.range,
    valueInputOption: "USER_ENTERED",
    includeValuesInResponse: false,
    resource: {
      range: request_vals.range,
      majorDimension: "COLUMNS",
      values: request_vals.values
    },
    auth: auth
  };
  const sheets = google.sheets({ version: "v4", auth });
  sheets.spreadsheets.values.update(request, callback);
}

function getSettingsCallback(auth, request, callback) {
  const sheets = google.sheets({ version: "v4", auth });
  sheets.spreadsheets.values.get(request, callback);
}

function getCurrentDate() {
  const dt = dateTime.create();
  return dt.format("Y-m-d H:M:S");
}

module.exports = {
  getNewToken: () => {
    fs.readFile(CREDENTIALS_PATH, (err, content) => {
      if (err) return console.log("Error loading client secret file:", err);
      const credentials = JSON.parse(content);
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES
      });
      console.log("Authorize this app by visiting this url:", authUrl);
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question("Enter the code from that page here: ", code => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
          if (err)
            return console.error(
              "Error while trying to retrieve access token",
              err
            );
          oAuth2Client.setCredentials(token);
          // Store the token to disk for later program executions
          fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
            if (err) return console.error(err);
            console.log("Token stored to", TOKEN_PATH);
          });
        });
      });
    });
  },

  getTokenGeneratorURL: callback => {
    fs.readFile(CREDENTIALS_PATH, (err, content) => {
      if (err) return console.log("Error loading client secret file:", err);
      const credentials = JSON.parse(content);
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES
      });
      callback(authUrl);
    });
  },

  generateTokenFromURLCode: code => {
    fs.readFile(CREDENTIALS_PATH, (err, content) => {
      if (err) return console.log("Error loading client secret file:", err);
      const credentials = JSON.parse(content);
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );
      oAuth2Client.getToken(code, (err, token) => {
        if (err)
          return console.error(
            "Error while trying to retrieve access token",
            err
          );
        oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
          if (err) return console.error(err);
          console.log("Token stored to", TOKEN_PATH);
        });
      });
    });
  },

  // Example request:
  // {
  //   "spreadsheetId": "1Xw6PiPi5F3e0vODyDbU0SUPQCYe1iyYh0OEEjjKrXus",
  //   "values": [
  //     "New Order", "New Order 2"
  //   ]
  // }
  newOrder: (request, callback) => {
    opSheet(
      newOrderCallback,
      {
        spreadsheetId: request.spreadsheetId,
        range: "Orders!A2:Q",
        values: [[null, getCurrentDate()].concat(request.values)]
      },
      callback
    );
  },

  // Example request:
  // {
  //   "spreadsheetId": "1Xw6PiPi5F3e0vODyDbU0SUPQCYe1iyYh0OEEjjKrXus",
  //   "row": "3",
  //   "column_range": ["A", "B"],
  //   "values": [
  //     "Order 4 Updated", "B column value"
  //   ]
  // }
  updateOrder: (request, callback) => {
    opSheet(
      updateOrderCallback,
      {
        spreadsheetId: request.spreadsheetId,
        range: "Orders!".concat(
          request.column_range[0],
          request.row,
          ":",
          request.column_range[1],
          request.row
        ),
        values: [request.values]
      },
      callback
    );
  },

  // Example request:
  // {
  //   spreadsheetId: '1Xw6PiPi5F3e0vODyDbU0SUPQCYe1iyYh0OEEjjKrXus',
  //   row: "2",
  // }
  getOrder: (request, callback) => {
    opSheet(
      getOrderCallback,
      {
        spreadsheetId: request.spreadsheetId,
        range: "Orders!".concat("A", request.row, ":Q", request.row)
      },
      callback
    );
  },

  // Example request:
  // {
  //   "spreadsheetId": "1Xw6PiPi5F3e0vODyDbU0SUPQCYe1iyYh0OEEjjKrXus",
  //   "range": ["2", ""],
  //   "values": ["~/Desktop/clothing_images/",
  //     "30.5",
  //     "25.5",
  //     "10.5",
  //     "10.5",
  //     "5.5",
  //     "3.5",
  //     "3.5",
  //     "4.5",
  //     "2.5"
  //   ]
  // }
  setSettings: (request, callback) => {
    if (request.range[0] == "1") {
      console.error("INVALID ROW RANGE ACCESSED: DO NOT ACCESS HEADERS!");
      return;
    }
    opSheet(
      setSettingsCallback,
      {
        spreadsheetId: request.spreadsheetId,
        range: "App Settings!B".concat(
          request.range[0],
          ":B",
          request.range[1]
        ),
        values: [request.values]
      },
      callback
    );
  },

  // Example request:
  // {
  //   spreadsheetId: '1Xw6PiPi5F3e0vODyDbU0SUPQCYe1iyYh0OEEjjKrXus',
  //   range: ["2", ""]
  // }
  getSettings: (request, callback) => {
    opSheet(
      getSettingsCallback,
      {
        spreadsheetId: request.spreadsheetId,
        range: "App Settings!A".concat(request.range[0], ":B", request.range[1])
      },
      callback
    );
  },

  finalizeOrder: (request, callback) => {
    opSheet(
      updateOrderCallback,
      {
        spreadsheetId: request.spreadsheetId,
        range: "Orders!P".concat(request.row, ":Q", request.row),
        values: [["yes", getCurrentDate()]]
      },
      callback
    );
  }

  // Example usage:
  // getSetting({
  //   spreadsheetId: '1Xw6PiPi5F3e0vODyDbU0SUPQCYe1iyYh0OEEjjKrXus',
  //   range: ["2", ""]
  //   },
  //   function(err, res) {
  //     if (err) console.log(err);
  //     else console.log(res);
  //   }
  // );
};
