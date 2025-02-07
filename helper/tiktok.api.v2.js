import crypto from 'crypto';

export const generateSignv2 = (url, secret, queryParams) => {
    const timestamp = Math.floor(Date.now() / 1000); // Generate timestamp
    queryParams.timestamp = timestamp; // Add timestamp to queryParams

    // Function to sort the object keys
    const objKeySort = (obj) => {
        const sortedKeys = Object.keys(obj).sort();
        const sortedObj = {};
        sortedKeys.forEach((key) => {
            sortedObj[key] = obj[key];
        });
        return sortedObj;
    };

    // Remove `sign` and `access_token` from query parameters
    delete queryParams.sign;
    delete queryParams.access_token;

    // Sort the query parameters
    const sortedParams = objKeySort(queryParams);

    // Construct the sign string
    let signString = secret + url;
    for (const key in sortedParams) {
        signString += key + sortedParams[key];
    }
    signString += secret;

    // console.log(signString);

    // Generate the HMAC-SHA256 signature
    const sign = crypto.createHmac('sha256', secret).update(signString).digest('hex');

    // Return the signature and timestamp
    return { sign, timestamp };
};