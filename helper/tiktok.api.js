import crypto from "crypto";
import { URL } from "url";

export const objKeySort = (obj) => {
  const newKey = Object.keys(obj).sort();
  const newObj = {};
  for (const key of newKey) {
    newObj[key] = obj[key];
  }
  return newObj;
};

export const interpolateVar = (value, variables) => {
  // Replace variable placeholders with actual values from variables
  return value.replace(/\{\{(.*?)\}\}/g, (_, name) => variables[name] || "");
};

export const calculateSign = (request, secret, timestamp, header, payload = false) => {  
  request.query.timestamp = timestamp;

  const queryParams = request.query || {};
  const param = {};

  for (const key in queryParams) {
    let value = queryParams[key];
    param[key] = value;
  }
  // console.log(param);

  delete param.sign;
  delete param.access_token;  

  const sortedParams = objKeySort(param);
  let signString = secret + request.query.path;

  // console.log(signString);
  // console.log(sortedParams);
  for (const key in sortedParams) {
    if (key == 'path' || key == 'secret' || key == 'category_id') continue;
    signString += key + sortedParams[key];
  }

  // console.log(signString);

  if (header != "multipart/form-data" && payload) {
    signString += JSON.stringify(payload);
  }

  signString += secret;
  // console.log(signString);

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(signString);
  return hmac.digest("hex");
};

export const generateSign = (request, secret, timestamp, header, payload = false) => {
  return calculateSign(request, secret, timestamp, header, payload);
};