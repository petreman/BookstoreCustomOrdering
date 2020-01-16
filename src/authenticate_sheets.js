const { getNewToken, getTokenGeneratorURL, generateTokenFromURLCode, newOrder, updateOrder, getOrder, setSettings, getSettings, finalizeOrder } = require('./sheets.js');

// getNewToken();
function getCurrentDate() {
  const dateTime = require('node-datetime');
  const dt = dateTime.create();
  return dt.format('Y-m-d H:M:S');
}

const spreadsheetId = "1aixHLxNdPxsiiW-ohgGl70US3NMg8RnyXaGkti3Xzsc";
// getNewToken();
newOrder({
    "spreadsheetId": "1aixHLxNdPxsiiW-ohgGl70US3NMg8RnyXaGkti3Xzsc",
    "values": [
      "New Order using Adam's token", "New Order 2"
    ]
  });
// updateOrder({
//   "spreadsheetId": spreadsheetId,
//   "row": "3",
//   "column_range": ["M", "O"],
//   "values": [
//     "new up", "new up up", "new up up up"
//   ]
// });
// getOrder({
//   "spreadsheetId": spreadsheetId,
//   "row": "3",
// }, (err, res) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(res.data.values[0]);
//   }
// });
// setSettings({
//   "spreadsheetId": spreadsheetId,
//   "range": ["4", ""],
//   "values": [
//     null,
//     "new set",
//     null,
//     "new new set"
//   ]
// });
// getSettings({
//   "spreadsheetId": spreadsheetId,
//   "range": ["2", "4"]
// }, (err, resp) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(resp.data.values);
//   }
// });
// finalizeOrder({
//   "spreadsheetId": "1aixHLxNdPxsiiW-ohgGl70US3NMg8RnyXaGkti3Xzsc",
//   "row": "12"
// }, (err, resp) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(resp);
//   }
// })