const puppeteer = require('puppeteer');
const axios = require('axios');
const schedule = require('node-schedule');

const baseUrl = 'https://www.hmtwatches.in/';
const credentials = {
  username: '',
  password: ''
};
let productsToCheck = [
  {
    "url": "https://www.hmtwatches.in/product_details?id=eyJpdiI6Ijh6Nmk2MFNsLzFneWQwZTh1cXRNVGc9PSIsInZhbHVlIjoidHljZHY3Umc5OTJXQXFwaUU1cFpKZz09IiwibWFjIjoiMjA3NDhhZDdmYjQ1OWQ2NzAwNjU3Yjc4MjY3Yjc0NTUzNjQ3OGM3YTZmNDBhNjI4N2FiM2Y0Y2IwMGU4YTNjMCIsInRhZyI6IiJ9",
    "name": "HMT Kohinoor Black",
    "id": "667",
    "buy": true
  }
]

let job = null;
async function init() {
  console.log('Init app....')
  // Schedule the task
  job = schedule.scheduleJob('*/1 * * * *', checkStockAsync);
}

async function checkStockAsync() {
  console.log('Starting job')
  let availableProducts = [];
  for (let product of productsToCheck) {

    let productDetails = await checkStockForProduct(product);

    if (productDetails && productDetails.in_stock && productDetails.in_stock == 'yes') {
      product.inStock = true;
      product.quantity = productDetails.quantity;
      availableProducts.push(product);
    } else {
      product.inStock = false;
      product.quantity = 0;
    }
  }

  console.log("Number of available products: " + availableProducts.length);

  // Notify if products available
  if (availableProducts.length != 0) {
    // notify(availableProducts);
    let productToBuy = availableProducts.find((p) => p.buy === true);
    if (productToBuy) {
      console.log("Buy product: " + productToBuy.name);
      job.cancelNext();
      try {
        addProductToCart(productToBuy);
        job.cancel();
      } catch (e) {
        if (e instanceof puppeteer.errors.TimeoutError) {
          // Do something if this is a timeout.
        }
      }
    } else {
      console.log("No available products needs to be added to cart..")
    }
  } else {
    console.log("No products in stock!")
  }
}

async function checkStockForProduct(product) {

  let apiUrl = `${baseUrl}product_view?id=${product.id}`;
  let response = await axios.get(apiUrl);
  let stockStatus = response.data.product_details.in_stock;

  console.log(`Stock Status for ${product.name}:`, stockStatus);

  return response.data.product_details;
}

async function login() {
  console.log("Start login..")
  //   const browser = await puppeteer.launch();
  const browser = await puppeteer.launch({
    headless: false,
    // `headless: true` (default) enables old Headless;
    // `headless: 'new'` enables new Headless;
    // `headless: false` enables “headful” mode.
  });
  let page = await browser.newPage();

  // Navigate to the login page
  await page.goto(baseUrl + 'login');

  // Fill in the login form
  await page.type('#username', credentials.username);
  await page.type('#password', credentials.password);
  await page.$eval('#logForm', form => form.submit());

  // Wait for the user to be logged in (adjust the selector as needed)
  await page.waitForSelector('#home');

  console.log("Logged in....")

  return page;
}

async function addProductToCart(product) {
  console.log("Add product to cart...")
  let page = await login();
  // Navigate to the product page
  console.log("Going to product page....")
  await page.goto(product.url);
  console.log("Adding product to cart....")
  await page.click('.update_cart_product');
  setTimeout(function () {
    console.log("Added to cart");
  }, 2000);
  await page.goto('https://www.hmtwatches.in/cart');
  await page.waitForSelector('.btn-cart');
  await page.click('input.btn.btn-cart.validate_product');
  console.log("checkout button clicked...");
  await page.waitForNavigation();
  console.log("clicking radios...");
  await page.waitForSelector('.billing_address');
  await page.click('input.billing_address');
  await page.evaluate(() => {
    let billingRadioBtn = document.querySelector('input.billing_address');
    billingRadioBtn.click();
    let shippingRadioBtn = document.querySelector('input.shippingCharges');
    shippingRadioBtn.click();
  });
  // Fill captcha
  await page.waitForSelector('#captchaImg');
  let captchaElement = await page.$('#captchaImg');
  let captchaText = await (await captchaElement.getProperty('textContent')).jsonValue();
  await page.type('#captchaText', captchaText);
  //click place order button
  setTimeout(function () {
    // page.click('#submitBtn');
  }, 2000);
}

init();
