//Import required packages
//Utils
const util = require('util');
const { v4: uuidv4 } = require('uuid'); // used to create a random v4 uuid string
//Azure cognitive services
const msrest = require("@azure/ms-rest-azure-js");
const cognitiveservices = require("@azure/cognitiveservices-computervision");
const speechSdk = require("microsoft-cognitiveservices-speech-sdk")
//Azure blob storage
const AzureStorageBlob = require("@azure/storage-blob"); //loading in our storage source

//Azure cognitive servies crerentials
const congnitiveRegion = process.env['COGNITIVE_REGION'] || ``;
const congnitiveEndpoint = `https://${congnitiveRegion}.api.cognitive.microsoft.com/`;
const cognitiveKey = process.env['COGNITIVE_KEY'] || ``;

//Azure blob storage info
const account = process.env['BLOB_ACCOUNT_NAME'] || ``; //our blob storage account name
const accountKey = process.env['BLOB_ACCOUNT_KEY'] || ``; // our blob storage account key
const imageContainer = process.env['IMAGE_CONTAINER'] || ``;
const soundContainer = process.env['SOUND_CONTAINER'] || ``;
const sharedKeyCredential = new AzureStorageBlob.StorageSharedKeyCredential(account, accountKey); //combined credentials for our Azure Blob Storage
const blobServiceClient = new AzureStorageBlob.BlobServiceClient(`https://${account}.blob.core.windows.net`, sharedKeyCredential); //we create an authenticated reference of our blob storage using our creds

module.exports = async function (context, req) {

    if (req.body && req.body.image) {
        let filename = `${uuidv4()}.jpg`;
        await uploadImage(req.body.image, filename); //upload image to blob storage under this filename

        let description = await getImageDescription(`https://${account}.blob.core.windows.net/${imageContainer}/${filename}`); //get string description of uploaded image
        if(!description.captions[0]){
            context.res = {
                status:500,
                body:"Could not create a description"
            }
            return context.done();
        }
        const asyncgetTTSAudio = util.promisify(getTTSAudio); // create an awaitable version of the callback function
        let ttsresult = await asyncgetTTSAudio(`I am seeing: ${description.captions[0].text}`); //get single audio file of Misty speech plus image description

        await uploadAudio(ttsresult); //upload audio file to blob

        context.res = {
            status: 200,
            body: `https://${account}.blob.core.windows.net/${soundContainer}/${ttsresult}`
        };
    }
    else {
        context.res = {
            status: 400,
            body: "Please pass an image string in the request body."
        };
    }
};

/**
 * This function will store a base64 encoded inmage on the blob store account
 * @param {String} base64String base64 encoded image
 * @param {String} filename filename of the new file
 */
async function uploadImage(base64String, filename) {
    const imageContainerClient = await blobServiceClient.getContainerClient(imageContainer); // we grab an reference to the 'uploadimages' container

    let blockBlobClient = imageContainerClient.getBlockBlobClient(filename); // Give new file a random name
    let binaryImage = new Buffer(base64String, "base64"); // convert the base64 encoding back to binary image
    let uploadResult = await blockBlobClient.upload(binaryImage, binaryImage.length, { blobContentType: 'image/jpg' }) // store the image in blob store

    return uploadResult
}

/**
 * This function return the description of an image returned by cognitive services 
 * @param {String} imageUrl absolute URL of image
 */
async function getImageDescription(imageUrl) {

    const cognitiveServiceCredentials = new msrest.CognitiveServicesCredentials(cognitiveKey);
    const client = new cognitiveservices.ComputerVisionClient(cognitiveServiceCredentials, congnitiveEndpoint);

    let result = await client.describeImage(imageUrl);
    return result;
}

/**
 * This function will create a create an mp3 of the input text, the result mp3 file will be stored localy
 * @param {Sting} text Text to speak
 * @param {Function} callback call back in the (err,res) format
 */
function getTTSAudio(text, callback) {
    const ttsFilename = `${uuidv4()}.mp3`;

    //configure Cognitive Services speech settings and voice
    var audioConfig = speechSdk.AudioConfig.fromAudioFileOutput(ttsFilename);
    var speechConfig = speechSdk.SpeechConfig.fromSubscription(cognitiveKey, congnitiveRegion);
    speechConfig.speechSynthesisLanguage = "en-US";
    speechConfig.speechSynthesisVoiceName = "en-US-JessaRUS";
    speechConfig.speechSynthesisOutputFormat = speechSdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    //use configurations to initialize a new Speech Synthesizer
    var synthesizer = new speechSdk.SpeechSynthesizer(speechConfig, audioConfig);

    //use the synthesizer to "speak" the result, saving it to an mp3
    synthesizer.speakTextAsync(text, (result) => {
        if (result.reason === speechSdk.ResultReason.SynthesizingAudioCompleted) {
            callback(null, ttsFilename);
        }
    })
}

/**
 * Upload a local file to blobl store
 * @param {String} filePath path to the file which will be uploaded
 */
async function uploadAudio(filePath) {
    let audioContainerClient = await blobServiceClient.getContainerClient(soundContainer);

    let blockBlobClient = audioContainerClient.getBlockBlobClient(filePath);
    let uploadResult = await blockBlobClient.uploadFile(filePath, { BlobHTTPHeaders: { blobContentType: 'audio/wav' } });

    return uploadResult;
}


