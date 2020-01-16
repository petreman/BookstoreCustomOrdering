'use strict';
var validate = (function() {
  var refVal = [];
  return function validate(data, dataPath, parentData, parentDataProperty, rootData) {
    'use strict';
    validate.errors = null;
    return true;
  };
})();
validate.schema = {
  "color": {
    "type": "string",
    "enum": ["green", "grey"],
    "default": "green"
  },
  "img_location": {
    "type": "string",
    "default": "./clothing_images"
  },
  "clothing_type": {
    "type": "string",
    "default": ""
  },
  "front_text": {
    "type": "string",
    "default": ""
  },
  "left_arm_text": {
    "type": "string",
    "default": ""
  },
  "right_arm_text": {
    "type": "string",
    "default": ""
  },
  "back_text": {
    "type": "string",
    "default": ""
  },
  "hood_text": {
    "type": "string",
    "default": ""
  },
  "other_comment": {
    "type": "string",
    "default": ""
  },
  "name": {
    "type": "string",
    "default": ""
  },
  "email": {
    "type": "string",
    "default": ""
  }
}
validate.errors = null;
module.exports = validate;