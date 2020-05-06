# Mist function app

A Microsoft Functions app that allows you to upload an image and get back an mp3 audio file of a description of that image. Built to provide this skill to the Misty II robot.

---
## How does it work

1. Upload an image in base64 encoding to the app
2. The function will store the image in binary in Azure storgage.
3. Azure Computer vision will describe what is seen in the picture.
4. Azure Speech service will create a MP3, from the description which is returned as result.

## How to run

1. Make sure the Azure Functions Core tools is installed `npm install -g azure-functions-core-tools`
2. Clone the project `Git clone https://github.com/ariannasavant/sayWhatYouSee_functionsApp.git`
3. `cd sayWhatYouSee_functionsApp`
4. Install the dependencies with `npm install`
5. Run the app with `func start` or `npm start`

### Enjoy!