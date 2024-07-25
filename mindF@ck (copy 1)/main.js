require('dotenv').config();
const { timer } = require("rxjs");
const { takeUntil } = require("rxjs/operators");
const { Neurosity } = require("@neurosity/sdk");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const crypto = require('crypto');

// Initialize the neurosity device
const neurosity = new Neurosity({
  deviceId: process.env.DEVICE_ID
});

// Set up CSV writer
const csvWriter = createCsvWriter({
  path: 'neurosity_readings.csv',

});

let counter = 0; // Initialize counter
const readings = []; // Array to store all readings

// Function to log readings to the array
const logReading = async (data) => {
  const records = data.map(d => ({
    counter: ++counter,
    reading: JSON.stringify(d)
  }));

  readings.push(...records);
  console.log('Reading added to the array');
};

// Function to write readings to CSV, encrypt the file, and create SHA-256 hash
const finalizeAndEncryptCsv = async () => {
  await csvWriter.writeRecords(readings);
  console.log('Data written to CSV');}



// Authenticate and start capturing readings
const startCapturing = async () => {
  try {
    await neurosity.login({
      email: process.env.EMAIL, // Or however you authenticate
      password: process.env.PASSWORD // If needed
    });

    console.log("Logged in!");

    const subscription = neurosity.brainwaves("raw")
      .pipe(
        takeUntil(
          timer(30000) // in milliseconds
        )
      )
      .subscribe(async (brainwaves) => {
        console.log(brainwaves);
        await logReading([brainwaves]);
      });

    // Function to handle graceful shutdown
    const handleExit = async () => {
      console.log('Closing subscription and exiting.');
      subscription.unsubscribe();
      await finalizeAndEncryptCsv();
      process.exit();
    };

    // Set a timeout to call handleExit after 30 seconds
    setTimeout(handleExit, 30000);

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

  } catch (error) {
    console.error("Error logging in or capturing readings:", error);
  }
};

startCapturing();


